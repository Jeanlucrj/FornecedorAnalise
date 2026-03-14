import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";
import ValidationForm from "@/components/validation/validation-form";
import AnalysisResults from "@/components/validation/analysis-results";
import { ArrowLeft } from "lucide-react";

export default function Validate() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 lg:ml-64 transition-all duration-300">
          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <Button
                  onClick={() => window.location.href = '/'}
                  data-testid="button-back-home"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Início
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-validate-title">
                    Validar Fornecedor
                  </h1>
                  <p className="text-muted-foreground">
                    Análise completa de fornecedores através do CNPJ
                  </p>
                </div>
              </div>
            </div>

            <ValidationForm
              onValidationComplete={setValidationResult}
              isValidating={isValidating}
              setIsValidating={setIsValidating}
            />

            {validationResult && (
              <AnalysisResults
                result={validationResult}
                onNewValidation={() => setValidationResult(null)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
