import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCNPJ, isValidCNPJ } from "@/lib/cnpjUtils";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Search, FileCheck, BarChart3, CheckCircle, Users } from "lucide-react";

interface ValidationFormProps {
  onValidationComplete: (result: any) => void;
  isValidating: boolean;
  setIsValidating: (loading: boolean) => void;
}

export default function ValidationForm({ 
  onValidationComplete, 
  isValidating, 
  setIsValidating 
}: ValidationFormProps) {
  const [cnpj, setCnpj] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateMutation = useMutation({
    mutationFn: async (data: { cnpj: string; name?: string; category?: string }) => {
      const response = await apiRequest("POST", "/api/validate", data);
      return response.json();
    },
    onMutate: () => {
      setIsValidating(true);
    },
    onSuccess: (data) => {
      onValidationComplete(data);
      toast({
        title: "Validação Concluída",
        description: "Análise realizada com sucesso!",
      });
      // Invalidate dashboard data
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Erro na Validação",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsValidating(false);
    },
  });

  const handleValidate = () => {
    if (!cnpj.trim()) {
      toast({
        title: "CNPJ Obrigatório",
        description: "Por favor, insira um CNPJ para validação.",
        variant: "destructive",
      });
      return;
    }

    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    if (!isValidCNPJ(cleanCnpj)) {
      toast({
        title: "CNPJ Inválido",
        description: "Por favor, verifique o CNPJ informado.",
        variant: "destructive",
      });
      return;
    }

    validateMutation.mutate({ 
      cnpj: cleanCnpj,
      name: name.trim() || undefined,
      category: category || undefined
    });
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      handleValidate();
    }
  };

  return (
    <Card className="mb-8" data-testid="card-validation-form">
      <CardContent className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Insira o CNPJ do Fornecedor
            </h2>
            <p className="text-muted-foreground">
              Nossa IA fará uma varredura cruzada de dados, gerando um relatório detalhado.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="cnpj" className="block text-sm font-medium text-foreground mb-2">
                CNPJ
              </Label>
              <Input
                id="cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={handleCnpjChange}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-4 text-lg text-center"
                maxLength={18}
                disabled={isValidating}
                data-testid="input-cnpj"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Nome do Fornecedor (Opcional)
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: TechCorp Ltda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isValidating}
                  data-testid="input-supplier-name"
                />
              </div>
              <div>
                <Label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
                  Categoria
                </Label>
                <Select value={category} onValueChange={setCategory} disabled={isValidating}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Tecnologia</SelectItem>
                    <SelectItem value="services">Serviços</SelectItem>
                    <SelectItem value="industry">Indústria</SelectItem>
                    <SelectItem value="commerce">Comércio</SelectItem>
                    <SelectItem value="consulting">Consultoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleValidate}
              disabled={isValidating}
              className="w-full py-4 text-lg font-semibold"
              data-testid="button-start-analysis"
            >
              {isValidating ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Iniciar Análise Completa
                </>
              )}
            </Button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm text-muted-foreground">
              <div className="flex flex-col items-center">
                <FileCheck className="w-5 h-5 text-primary mb-1" />
                <p>Status Cadastral</p>
              </div>
              <div className="flex flex-col items-center">
                <BarChart3 className="w-5 h-5 text-primary mb-1" />
                <p>Saúde Financeira</p>
              </div>
              <div className="flex flex-col items-center">
                <CheckCircle className="w-5 h-5 text-primary mb-1" />
                <p>Certidões</p>
              </div>
              <div className="flex flex-col items-center">
                <Users className="w-5 h-5 text-primary mb-1" />
                <p>Estrutura Societária</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
