import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, Zap, Building2, ArrowLeft, Star } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Sidebar from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { PLANS } from "@shared/plans";
import CheckoutDialog from "@/components/CheckoutDialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Pricing() {
    const [, setLocation] = useLocation();
    const { user } = useAuth();
    const { toast } = useToast();
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const planParam = params.get('plan');
        if (planParam && PLANS[planParam as keyof typeof PLANS]) {
            setSelectedPlanId(planParam);
            setCheckoutOpen(true);
        }
    }, []);

    const isCurrentPlan = (planId: string) => {
        if (!user) return planId === 'free';
        if (planId === 'professional') return user.plan === 'pro' || user.plan === 'professional' || user.plan === 'Profissional';
        if (planId === 'basic') return user.plan === 'basic' || user.plan === 'Básico';
        if (planId === 'free') return user.plan === 'free' || user.plan === 'Gratuito';
        return user.plan === planId;
    };

    const planCards = [
        {
            id: 'free',
            icon: Zap,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
            tag: 'Ideal para testes',
            popular: false,
            ...PLANS.free
        },
        {
            id: 'basic',
            icon: Star,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
            tag: 'Para empresas em crescimento',
            popular: false,
            ...PLANS.basic
        },
        {
            id: 'professional',
            icon: Crown,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
            tag: 'Mais Popular',
            popular: true,
            ...PLANS.professional
        },
        {
            id: 'enterprise',
            icon: Building2,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
            tag: 'Para grandes volumes',
            popular: false,
            ...PLANS.enterprise
        }
    ];

    const handleSelectPlan = async (planId: string) => {
        // Agora todos os planos exigem pagamento, inclusive o "Teste" (R$ 1,00)
        setSelectedPlanId(planId);
        setCheckoutOpen(true);
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex pt-16">
                <Sidebar />
                <main className="flex-1 lg:ml-64 transition-all duration-300">
                    <div className="p-6 max-w-6xl mx-auto">
                        <div className="flex items-center space-x-4 mb-8">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Voltar
                            </Button>
                            <h1 className="text-3xl font-bold text-foreground">Planos e Assinaturas</h1>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {planCards.map((plan) => (
                                <Card
                                    key={plan.id}
                                    className={`relative flex flex-col h-full border-2 transition-all duration-300 hover:shadow-xl ${plan.popular ? 'border-primary ring-1 ring-primary/20' : 'border-border'
                                        }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold py-1 px-4 rounded-full shadow-lg">
                                            Mais Popular
                                        </div>
                                    )}

                                    <CardHeader className="text-center pb-2">
                                        <div className={`w-12 h-12 ${plan.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                                            <plan.icon className={`h-6 w-6 ${plan.color}`} />
                                        </div>
                                        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">{plan.tag}</p>
                                    </CardHeader>

                                    <CardContent className="flex-1 text-center">
                                        <div className="mb-6">
                                            <span className="text-4xl font-extrabold text-foreground">R$ {plan.price}</span>
                                            <span className="text-muted-foreground ml-1">/mês</span>
                                        </div>

                                        <ul className="space-y-4 text-left mb-6">
                                            {plan.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start text-sm text-muted-foreground">
                                                    <Check className="h-4 w-4 text-primary mr-3 mt-0.5 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>

                                    <CardFooter>
                                        <Button
                                            className="w-full h-12 text-lg font-semibold"
                                            variant={isCurrentPlan(plan.id) ? 'outline' : (plan.popular ? 'default' : 'outline')}
                                            onClick={() => !isCurrentPlan(plan.id) && handleSelectPlan(plan.id)}
                                            disabled={isCurrentPlan(plan.id)}
                                        >
                                            {isCurrentPlan(plan.id) ? 'Plano Atual' : 'Escolher Plano'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>

                        <div className="mt-12 p-8 bg-muted/50 rounded-2xl border border-border text-center">
                            <h2 className="text-xl font-bold mb-4">Dúvidas sobre os planos?</h2>
                            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                                Nossa equipe comercial está à disposição para ajudar você a escolher a melhor solução para sua empresa.
                            </p>
                            <Button variant="outline">Falar com Consultor</Button>
                        </div>
                    </div>

                    <CheckoutDialog
                        open={checkoutOpen}
                        onOpenChange={setCheckoutOpen}
                        planId={selectedPlanId}
                    />
                </main>
            </div>
        </div>
    );
}
