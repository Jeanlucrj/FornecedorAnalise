import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  Activity,
  DollarSign,
  Shield,
  LogOut,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

interface PlatformStats {
  totalUsers: number;
  usersByPlan: Record<string, number>;
  totalValidations: number;
  validationsByStatus: Record<string, number>;
  totalApiUsage: number;
  totalSuppliers: number;
  activeAlerts: number;
  newUsers: number;
  recentValidations: number;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  plan: string;
  apiUsage: number;
  apiLimit: number;
  createdAt: string;
  lastLoginAt: string | null;
}

interface ActivityLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userId: string | null;
  adminId: string | null;
}

interface ServiceUsage {
  action: string;
  count: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/admin/auth/check", {
          credentials: "include",
        });
        const data = await response.json();

        if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setLocation("/admin/login");
        }
      } catch (error) {
        setIsAuthenticated(false);
        setLocation("/admin/login");
      }
    };

    checkAuth();
  }, [setLocation]);

  // Fetch platform stats
  const { data: stats, isLoading: loadingStats, error: statsError } = useQuery<PlatformStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated === true,
  });

  // Fetch users
  const { data: usersData, isLoading: loadingUsers, error: usersError } = useQuery<{ users: User[]; total: number }>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated === true,
  });

  // Fetch activity logs
  const { data: logsData, isLoading: loadingLogs, error: logsError } = useQuery<{ logs: ActivityLog[]; total: number }>({
    queryKey: ["/api/admin/logs", { limit: 50 }],
    enabled: isAuthenticated === true,
  });

  // Fetch most used services
  const { data: services } = useQuery<ServiceUsage[]>({
    queryKey: ["/api/admin/analytics/services"],
    enabled: isAuthenticated === true,
  });

  // Fetch revenue metrics
  const { data: revenue, error: revenueError } = useQuery<{
    revenueByPlan: Array<{ plan: string; users: number; revenue: number }>;
    totalRevenue: number;
    mrr: number;
  }>({
    queryKey: ["/api/admin/analytics/revenue"],
    enabled: isAuthenticated === true,
  });

  const queryError = statsError || usersError || logsError || revenueError;

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });

      toast({
        title: "Logout realizado",
        description: "Você saiu do painel administrativo",
      });

      setLocation("/admin/login");
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        variant: "destructive",
      });
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Painel Administrativo
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  FornecedorFlow - Gerenciamento do Sistema
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button onClick={handleLogout} variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.newUsers || 0} nos últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validações Totais</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalValidations || 0}</div>
              <p className="text-xs text-muted-foreground">
                +{stats?.recentValidations || 0} nos últimos 7 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {revenue?.mrr?.toLocaleString('pt-BR') || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita recorrente mensal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeAlerts || 0}</div>
              <p className="text-xs text-muted-foreground">
                Alertas não lidos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
            <TabsTrigger value="logs">Logs de Atividade</TabsTrigger>
            <TabsTrigger value="revenue">Receita</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usuários da Plataforma</CardTitle>
                <CardDescription>
                  Lista completa de usuários cadastrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersError ? (
                  <div className="text-center py-8 text-red-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>Erro ao carregar usuários. Por favor, tente novamente.</p>
                  </div>
                ) : loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>Carregando lista de usuários...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {usersData?.users && usersData.users.length > 0 ? (
                        usersData.users.map((user) => (
                          <div
                            key={user.id}
                            className="border rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-lg">
                                    {user.firstName || 'Sem Nome'} {user.lastName || ''}
                                  </h3>
                                  <Badge variant={
                                    user.plan === 'enterprise' ? 'default' :
                                      user.plan === 'pro' ? 'secondary' : 'outline'
                                  }>
                                    {user.plan}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <div className="mt-2 flex items-center gap-4 text-sm">
                                  <span>
                                    API: <strong>{user.apiUsage || 0}</strong> / {user.apiLimit || 0}
                                  </span>
                                  <span className="text-muted-foreground">
                                    Cadastrado em: {new Date(user.createdAt).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl">
                          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500 font-medium">Nenhum usuário encontrado na base de dados.</p>
                          <p className="text-sm text-slate-400 mt-1">Isso pode ser um erro de sincronização temporário.</p>
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-500 text-center border-t pt-4">
                      Total de usuários registrados: {usersData?.total ?? 0}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Users by Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Plano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.usersByPlan || {}).map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${plan === 'enterprise' ? 'bg-blue-500' :
                          plan === 'pro' ? 'bg-purple-500' : 'bg-gray-500'
                          }`} />
                        <span className="font-medium capitalize">{plan}</span>
                      </div>
                      <span className="text-2xl font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Validation Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status das Validações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(stats?.validationsByStatus || {}).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {status === 'attention' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                          {status === 'critical' && <AlertCircle className="h-4 w-4 text-red-500" />}
                          <span className="font-medium capitalize">{status}</span>
                        </div>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Most Used Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Serviços Mais Utilizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {services?.slice(0, 5).map((service) => (
                      <div key={service.action} className="flex items-center justify-between">
                        <span className="font-medium">{service.action}</span>
                        <Badge variant="secondary">{service.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* API Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Uso Total de API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-center py-8">
                  {stats?.totalApiUsage?.toLocaleString('pt-BR') || 0}
                  <p className="text-sm text-muted-foreground mt-2">
                    Requisições realizadas
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Atividade Recentes</CardTitle>
                <CardDescription>
                  Últimas 50 ações realizadas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogs ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {logsData?.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{log.action}</span>
                            {log.resource && (
                              <Badge variant="outline">{log.resource}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(log.createdAt).toLocaleString('pt-BR')}
                            {log.ipAddress && ` • IP: ${log.ipAddress}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Receita</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Receita Total</div>
                    <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                      R$ {revenue?.totalRevenue?.toLocaleString('pt-BR') || 0}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {revenue?.revenueByPlan.map((item) => (
                      <div key={item.plan} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold capitalize">{item.plan}</span>
                          <Badge>{item.users} usuários</Badge>
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          R$ {item.revenue.toLocaleString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
