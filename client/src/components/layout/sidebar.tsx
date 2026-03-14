import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  History,
  Search,
  Settings,
  TrendingUp,
  Crown,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PLANS } from "@shared/plans";

const navigation = [
  { name: 'Dashboard', href: '/', icon: TrendingUp },
  { name: 'Validação Completa CNPJ', href: '/validate', icon: Search },
  { name: 'Histórico', href: '/history', icon: History },
  { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const handleCloseSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebar && overlay) {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }
  };

  // Calculate usage percentage
  const usagePercentage = user?.apiLimit
    ? Math.round(((user.apiUsage ?? 0) / user.apiLimit) * 100)
    : 0;

  const remaining = user?.apiLimit ? user.apiLimit - (user.apiUsage ?? 0) : 0;

  return (
    <>
      {/* Mobile overlay */}
      <div
        id="sidebar-overlay"
        className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden hidden"
        onClick={handleCloseSidebar}
      />

      {/* Sidebar */}
      <aside
        id="sidebar"
        className="w-64 bg-card border-r border-border fixed left-0 top-16 h-[calc(100vh-4rem)] transform -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-in-out z-40"
      >
        <div className="flex flex-col h-full">
          {/* Close button for mobile */}
          <div className="lg:hidden flex justify-end p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseSidebar}
              data-testid="button-close-sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="p-6">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start space-x-3 h-10",
                      isActive
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    onClick={() => {
                      setLocation(item.href);
                      handleCloseSidebar();
                    }}
                    data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Plan Information */}
          <div className="mt-auto p-6">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">
                  {PLANS[user?.plan as keyof typeof PLANS]?.name
                    ? `Plano ${PLANS[user?.plan as keyof typeof PLANS].name}`
                    : user?.plan === 'pro' || user?.plan === 'professional'
                      ? 'Plano Profissional'
                      : 'Plano Gratuito'}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                {user?.apiUsage || 0}/{user?.apiLimit || 0} {(user?.apiLimit || 0) === 1 ? 'consulta utilizada' : 'consultas utilizadas'}
              </p>

              <Progress
                value={usagePercentage}
                className="h-2 mb-3"
                data-testid="progress-api-usage"
              />

              <Button
                size="sm"
                className="w-full text-xs"
                data-testid="button-upgrade-plan"
                onClick={() => setLocation(user?.plan && user.plan !== 'free' ? '/pricing' : '/pricing')}
              >
                {user?.plan && user.plan !== 'free' ? 'Gerenciar Plano' : 'Fazer Upgrade'}
              </Button>

              {remaining <= 10 && remaining > 0 && (
                <p className="text-xs text-warning mt-2 text-center">
                  Restam apenas {remaining} consultas
                </p>
              )}

              {remaining <= 0 && (
                <p className="text-xs text-destructive mt-2 text-center">
                  Limite de consultas atingido
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
