import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";
import StatsCards from "@/components/dashboard/stats-cards";
import QuickValidation from "@/components/dashboard/quick-validation";
import RecentValidations from "@/components/dashboard/recent-validations";
import ScoreDistribution from "@/components/dashboard/score-distribution";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const handleNavigate = (path: string) => {
    console.log("Navigating to:", path);
    setLocation(path);
  };

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
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-dashboard-title">
                Dashboard
              </h1>
              <p className="text-muted-foreground">
                Bem-vindo ao seu painel de controle de fornecedores
              </p>
            </div>

            {/* Stats Cards */}
            <StatsCards />

            {/* Quick Action and Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <QuickValidation />
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleNavigate("/validate")}
                    className="w-full flex items-center space-x-3 p-3 bg-muted hover:bg-muted/80 rounded-lg text-left transition-colors"
                    data-testid="button-bulk-validation"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Validação em Lote</p>
                      <p className="text-xs text-muted-foreground">Upload de planilha</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate("/reports")}
                    className="w-full flex items-center space-x-3 p-3 bg-muted hover:bg-muted/80 rounded-lg text-left transition-colors"
                    data-testid="button-export-reports"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Exportar Relatórios</p>
                      <p className="text-xs text-muted-foreground">PDF e Excel</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleNavigate("/settings")}
                    className="w-full flex items-center space-x-3 p-3 bg-muted hover:bg-muted/80 rounded-lg text-left transition-colors"
                    data-testid="button-schedule-alerts"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Agendar Alertas</p>
                      <p className="text-xs text-muted-foreground">Monitoramento automático</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Validations & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentValidations />
              <ScoreDistribution />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
