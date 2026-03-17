import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, QrCode, Landmark, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PLANS } from "@shared/plans";

declare global {
    interface Window {
        pagarme: any;
    }
}

interface CheckoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    planId: string;
}

export default function CheckoutDialog({ open, onOpenChange, planId }: CheckoutDialogProps) {
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "debit_card" | "pix">("credit_card");
    const [pixData, setPixData] = useState<{ qr_code_url: string; qr_code: string } | null>(null);
    const [orderId, setOrderId] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const plan = PLANS[planId as keyof typeof PLANS];

    const [cardData, setCardData] = useState({
        number: "",
        name: "",
        expiry: "",
        cvv: "",
        cpf: "",
    });

    useEffect(() => {
        if (user && !cardData.cpf) {
            setCardData(prev => ({
                ...prev,
                cpf: user.document || "",
                name: prev.name || `${user.firstName || ""} ${user.lastName || ""}`.trim()
            }));
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCardData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePayment = async () => {
        setLoading(true);
        try {
            let cardPayload: any = {};

            if (paymentMethod === "pix") {
                if (!cardData.cpf) {
                    throw new Error("O CPF ou CNPJ é obrigatório para gerar o PIX.");
                }
            } else if (paymentMethod === "credit_card" || paymentMethod === "debit_card") {
                // Simple validation
                if (!cardData.number || !cardData.cvv || !cardData.expiry || !cardData.name || !cardData.cpf) {
                    throw new Error("Por favor, preencha todos os dados do cartão.");
                }

                // Parse expiry MM/YY
                const [expMonth, expYear] = cardData.expiry.split('/').map(s => parseInt(s.trim()));
                const fullYear = expYear < 100 ? 2000 + expYear : expYear;

                // Send card data directly to backend (server-side tokenization)
                cardPayload.cardData = {
                    number: cardData.number.replace(/\s/g, ""),
                    holderName: cardData.name,
                    expMonth,
                    expYear: fullYear,
                    cvv: cardData.cvv,
                };
            }

            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: planId,
                    paymentMethod,
                    ...cardPayload,
                    customer: {
                        name: cardData.name || (user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "Cliente"),
                        cpf: cardData.cpf.replace(/\D/g, ""),
                        email: user?.email || "",
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("❌ Checkout response error:", errorData);
                console.error("❌ Full error object:", JSON.stringify(errorData, null, 2));

                let errorMessage = errorData.message || "Erro ao processar pagamento.";

                // Log detailed error information
                if (errorData.debug) {
                    console.error("🔍 Debug info:", errorData.debug);
                }

                if (errorData.error) {
                    console.error("🔍 Error details:", errorData.error);
                    const err = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);

                    if (err.includes('Sem ambiente configurado')) {
                        errorMessage = "O processamento de Cartão de Débito não está disponível nesta conta. Por favor, utilize Cartão de Crédito ou PIX.";
                    } else if (err.includes('action_forbidden')) {
                        errorMessage = "Operação não permitida pela operadora. Verifique os dados ou tente outro cartão.";
                    } else if (err.includes('insufficient_funds')) {
                        errorMessage = "Saldo insuficiente no cartão.";
                    } else if (err.includes('not a valid card number')) {
                        errorMessage = "Número de cartão inválido. Verifique os dados do cartão.";
                    } else if (err.includes('email')) {
                        errorMessage = "Email inválido. Por favor, verifique seu cadastro.";
                    } else {
                        // Se ainda for objeto, mostrar mensagem amigável
                        errorMessage = typeof errorData.error === 'string' ? errorData.error : "Erro ao processar pagamento. Verifique os dados e tente novamente.";
                    }
                }

                // Show full error in development
                console.error("💬 Error message shown to user:", errorMessage);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            setOrderId(data.id);

            if (paymentMethod === "pix") {
                const charge = data.charges?.[0] as any;
                const lastTx = charge?.lastTransaction || (charge as any)?.last_transaction;

                console.log('PIX Response Data:', JSON.stringify(data, null, 2));
                console.log('Last Transaction:', JSON.stringify(lastTx, null, 2));

                // Check if PIX was generated successfully
                if (lastTx && (lastTx.qrCodeUrl || lastTx.qr_code_url)) {
                    setPixData({
                        qr_code_url: lastTx.qrCodeUrl || lastTx.qr_code_url,
                        qr_code: lastTx.qrCode || lastTx.qr_code,
                    });
                } else {
                    // PIX failed - check gateway response
                    const gatewayError = lastTx?.gatewayResponse?.errors?.[0]?.message ||
                        lastTx?.gateway_response?.errors?.[0]?.message;
                    throw new Error(gatewayError || 'PIX não disponível em conta de teste. Configure PIX no dashboard da Pagar.me ou use chaves de produção.');
                }
            } else {
                setSuccess(true);
                // Automatically upgrade locally if payment is captured
                if (data.status === 'paid') {
                    toast({
                        title: "Pagamento realizado com sucesso!",
                        description: `Seu plano foi atualizado para ${plan.name}.`,
                    });
                    setTimeout(() => onOpenChange(false), 3000);
                }
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro no pagamento",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const copyPix = () => {
        if (pixData?.qr_code) {
            navigator.clipboard.writeText(pixData.qr_code);
            toast({
                title: "Copiado!",
                description: "Código Pix copiado para a área de transferência.",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Finalizar Assinatura</DialogTitle>
                    <DialogDescription>
                        Você está assinando o plano <strong>{plan?.name}</strong> por <strong>R$ {plan?.price}/mês</strong>.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500 animate-bounce" />
                        <h2 className="text-2xl font-bold">Pagamento Confirmado!</h2>
                        <p className="text-muted-foreground">Sua conta foi atualizada com sucesso.</p>
                        <Button onClick={() => onOpenChange(false)}>Ir para o Dashboard</Button>
                    </div>
                ) : pixData ? (
                    <div className="flex flex-col items-center space-y-6 py-4">
                        <div className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-inner">
                            <img src={pixData.qr_code_url} alt="QR Code Pix" className="w-64 h-64" />
                        </div>
                        <div className="w-full space-y-2">
                            <Label>Código Pix (Copia e Cola)</Label>
                            <div className="flex space-x-2">
                                <Input value={pixData.qr_code} readOnly className="font-mono text-xs" />
                                <Button variant="outline" size="sm" onClick={copyPix}>Copiar</Button>
                            </div>
                        </div>
                        <div className="text-sm text-center text-muted-foreground space-y-2">
                            <p className="font-semibold">Abra o app do seu banco e escaneie o código acima.</p>
                            <p>⏱️ O QR Code expira em 1 hora</p>
                            <p className="text-primary font-medium">✅ O plano será liberado automaticamente após a confirmação do pagamento.</p>
                        </div>
                        <div className="flex space-x-2 w-full">
                            <Button variant="ghost" className="flex-1" onClick={() => setPixData(null)}>Voltar</Button>
                            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Fechar</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }} autoComplete="on">
                        <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                            <TabsList className="grid grid-cols-3 w-full mb-6">
                                <TabsTrigger value="credit_card" className="space-x-2" type="button">
                                    <CreditCard className="h-4 w-4" />
                                    <span>Crédito</span>
                                </TabsTrigger>
                                <TabsTrigger value="debit_card" className="space-x-2" type="button">
                                    <Landmark className="h-4 w-4" />
                                    <span>Débito</span>
                                </TabsTrigger>
                                <TabsTrigger value="pix" className="space-x-2" type="button">
                                    <QrCode className="h-4 w-4" />
                                    <span>PIX</span>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="credit_card" className="space-y-4">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-2">
                                        <Label htmlFor="card_name">Nome no Cartão</Label>
                                        <Input id="card_name" name="name" placeholder="Como impresso no cartão" value={cardData.name} onChange={handleInputChange} autoComplete="cc-name" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Label htmlFor="card_number">Número do Cartão</Label>
                                        <Input id="card_number" name="number" placeholder="0000 0000 0000 0000" value={cardData.number} onChange={handleInputChange} autoComplete="cc-number" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="card_expiry">Validade</Label>
                                            <Input id="card_expiry" name="expiry" placeholder="MM/AA" value={cardData.expiry} onChange={handleInputChange} autoComplete="cc-exp" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="card_cvv">CVV</Label>
                                            <Input id="card_cvv" name="cvv" placeholder="123" value={cardData.cvv} onChange={handleInputChange} autoComplete="cc-csc" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Label htmlFor="card_cpf">CPF do Titular</Label>
                                        <Input id="card_cpf" name="cpf" placeholder="000.000.000-00" value={cardData.cpf} onChange={handleInputChange} autoComplete="off" />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="debit_card" className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 mb-4">
                                    <strong>Atenção:</strong> Cartões de débito podem exigir autenticação extra (3D Secure) no app do seu banco.
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-2">
                                        <Label htmlFor="debit_name">Nome no Cartão</Label>
                                        <Input id="debit_name" name="name" placeholder="Como impresso no cartão" value={cardData.name} onChange={handleInputChange} autoComplete="cc-name" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Label htmlFor="debit_number">Número do Cartão</Label>
                                        <Input id="debit_number" name="number" placeholder="0000 0000 0000 0000" value={cardData.number} onChange={handleInputChange} autoComplete="cc-number" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="debit_expiry">Validade</Label>
                                            <Input id="debit_expiry" name="expiry" placeholder="MM/AA" value={cardData.expiry} onChange={handleInputChange} autoComplete="cc-exp" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="debit_cvv">CVV</Label>
                                            <Input id="debit_cvv" name="cvv" placeholder="123" value={cardData.cvv} onChange={handleInputChange} autoComplete="cc-csc" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Label htmlFor="debit_cpf">CPF do Titular</Label>
                                        <Input id="debit_cpf" name="cpf" placeholder="000.000.000-00" value={cardData.cpf} onChange={handleInputChange} autoComplete="off" />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="pix" className="space-y-4">
                                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 text-center space-y-2">
                                    <QrCode className="h-12 w-12 text-primary mx-auto" />
                                    <p className="font-semibold">Pagamento Instantâneo</p>
                                    <p className="text-xs text-muted-foreground">O QR Code será gerado após clicar no botão abaixo.</p>
                                </div>

                                <div className="grid grid-cols-1 gap-2 pt-2">
                                    <Label htmlFor="pix_cpf">CPF ou CNPJ do Pagador</Label>
                                    <Input
                                        id="pix_cpf"
                                        name="cpf"
                                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                        value={cardData.cpf}
                                        onChange={handleInputChange}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Obrigatório para emissão do PIX pelo Pagar.me</p>
                                </div>
                            </TabsContent>

                            <div className="mt-8">
                                <Button
                                    type="submit"
                                    className="w-full h-12 text-lg font-bold"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        paymentMethod === 'pix' ? 'Gerar QR Code Pix' : 'Pagar Agora'
                                    )}
                                </Button>
                            </div>
                        </Tabs>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
