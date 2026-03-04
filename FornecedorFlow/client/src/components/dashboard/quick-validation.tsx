import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCNPJ, isValidCNPJ } from "@/lib/cnpjUtils";
import { Search, Clock, Shield, Eye, Calendar, Building } from "lucide-react";

export default function QuickValidation() {
  const [cnpj, setCnpj] = useState("");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateMutation = useMutation({
    mutationFn: async (data: { cnpj: string }) => {
      const response = await apiRequest("POST", "/api/validate", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Show basic results in the component
      setValidationResult(data);
      toast({
        title: "Validação Concluída",
        description: "Dados básicos exibidos abaixo",
      });
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/score-distribution"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na Validação",
        description: error.message,
        variant: "destructive",
      });
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

    // Clear previous results
    setValidationResult(null);
    validateMutation.mutate({ cnpj: cleanCnpj, analysisType: "quick" });
  };

  const handleViewQuickDetails = () => {
    if (validationResult?.validation?.id) {
      setLocation(`/validation/${validationResult.validation.id}?view=quick`);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Data não disponível";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return "Data inválida";
    }
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setCnpj(formatted);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleValidate();
    }
  };

  return (
    <Card data-testid="card-quick-validation">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground mb-4">
          Validação Rápida
        </CardTitle>
        <p className="text-muted-foreground">
          Insira o CNPJ do fornecedor para análise rápida
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="cnpj" className="block text-sm font-medium text-foreground mb-2">
              CNPJ do Fornecedor
            </Label>
            <div className="flex space-x-3">
              <Input
                id="cnpj"
                type="text"
                placeholder="00.000.000/0000-00"
                value={cnpj}
                onChange={handleCnpjChange}
                onKeyPress={handleKeyPress}
                className="flex-1 text-lg"
                maxLength={18}
                disabled={validateMutation.isPending}
                data-testid="input-cnpj-quick"
              />
              <Button 
                onClick={handleValidate}
                disabled={validateMutation.isPending}
                data-testid="button-validate-quick"
              >
                {validateMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {validateMutation.isPending ? "Validando..." : "Validar"}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Análise em ~30 segundos</span>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4" />
              <span>Dados criptografados</span>
            </div>
          </div>

          {/* Basic Results Display */}
          {validationResult && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold text-foreground mb-3 flex items-center">
                <Building className="w-4 h-4 mr-2" />
                Dados Básicos da Empresa
              </h4>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nome da Empresa:</span>
                  <span className="font-medium text-foreground">
                    {validationResult.supplier?.companyName || "Não disponível"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Data de Abertura:
                  </span>
                  <span className="font-medium text-foreground">
                    {formatDate(validationResult.supplier?.openingDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Score de Risco:</span>
                  <span className={`font-medium ${
                    validationResult.validation?.score >= 80 ? 'text-green-600' :
                    validationResult.validation?.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {validationResult.validation?.score || 0}/100
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleViewQuickDetails}
                className="w-full mt-4"
                variant="outline"
                data-testid="button-view-quick-details"
              >
                <Eye className="w-4 h-4 mr-2" />
                Ver Análise Rápida
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
