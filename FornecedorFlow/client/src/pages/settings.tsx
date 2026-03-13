import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Settings, User, Bell, Shield, Key, Save } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { PLANS } from "@shared/plans";

export default function SettingsPage() {
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [monitoringFrequency, setMonitoringFrequency] = useState('daily');
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  const { data: user, isLoading, error } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Handle unauthorized error
  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    if (!isLoading && !user) {
      window.location.href = "/";
    }
  }

  // Load current user settings into state
  useEffect(() => {
    if (user) {
      setNotificationsEnabled(user.notificationsEnabled ?? true);
      setAutoRefreshEnabled(user.autoRefreshEnabled ?? false);
      setMonitoringFrequency(user.monitoringFrequency ?? 'daily');
      setEmailNotifications(user.emailNotifications ?? false);
      setWhatsappNotifications(user.whatsappNotifications ?? false);
      setNotificationEmail(user.notificationEmail ?? '');
      setWhatsappNumber(user.whatsappNumber ?? '');
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        throw new Error("Failed to update user settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Configurações Salvas",
        description: "Suas configurações foram atualizadas com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    const settingsData = {
      notificationsEnabled,
      autoRefreshEnabled,
      monitoringFrequency,
      emailNotifications,
      whatsappNotifications,
      notificationEmail: emailNotifications ? notificationEmail : null,
      whatsappNumber: whatsappNotifications ? whatsappNumber : null,
    };

    updateUserMutation.mutate(settingsData);
  };

  const handleGoBack = () => {
    window.location.href = "/";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleGoBack}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Início
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas notificações e preferências do sistema
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Settings */}
        <Card data-testid="card-notification-settings">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notificações</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Receber Notificações</Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas sobre mudanças nos fornecedores
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                data-testid="switch-notifications"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoRefresh">Atualização Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Monitore fornecedores automaticamente
                  {(user?.plan === 'free' || !user?.plan) && (
                    <span className="text-amber-600 font-medium"> • Plano Pro necessário</span>
                  )}
                </p>
              </div>
              <Switch
                id="autoRefresh"
                checked={autoRefreshEnabled}
                onCheckedChange={setAutoRefreshEnabled}
                disabled={user?.plan === 'free' || !user?.plan}
                data-testid="switch-auto-refresh"
              />
            </div>

            {autoRefreshEnabled && (
              <div>
                <Label htmlFor="monitoringFrequency">Frequência de Monitoramento</Label>
                <Select value={monitoringFrequency} onValueChange={setMonitoringFrequency}>
                  <SelectTrigger data-testid="select-monitoring-frequency">
                    <SelectValue placeholder="Selecione a frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily" data-testid="option-daily">Diário (a cada 24 horas)</SelectItem>
                    <SelectItem value="weekly" data-testid="option-weekly">Semanal (a cada 7 dias)</SelectItem>
                    <SelectItem value="monthly" data-testid="option-monthly">Mensal (a cada 30 dias)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {monitoringFrequency === 'daily' && 'Verificações diárias para detectar mudanças rapidamente'}
                  {monitoringFrequency === 'weekly' && 'Verificações semanais para um monitoramento equilibrado'}
                  {monitoringFrequency === 'monthly' && 'Verificações mensais para um acompanhamento básico'}
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Canais de Notificação</h4>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas por email
                      {(user?.plan === 'free' || !user?.plan) && (
                        <span className="text-amber-600 font-medium"> • Plano Pro necessário</span>
                      )}
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    disabled={user?.plan === 'free' || !user?.plan}
                    data-testid="switch-email-notifications"
                  />
                </div>

                {emailNotifications && (
                  <div>
                    <Label htmlFor="notificationEmail">Email para Notificações</Label>
                    <Input
                      id="notificationEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                      data-testid="input-notification-email"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="whatsappNotifications">Notificações por WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas por WhatsApp
                      {(user?.plan === 'free' || !user?.plan) && (
                        <span className="text-amber-600 font-medium"> • Plano Pro necessário</span>
                      )}
                    </p>
                  </div>
                  <Switch
                    id="whatsappNotifications"
                    checked={whatsappNotifications}
                    onCheckedChange={setWhatsappNotifications}
                    disabled={user?.plan === 'free' || !user?.plan}
                    data-testid="switch-whatsapp-notifications"
                  />
                </div>

                {whatsappNotifications && (
                  <div>
                    <Label htmlFor="whatsappNumber">Número do WhatsApp</Label>
                    <Input
                      id="whatsappNumber"
                      type="tel"
                      placeholder="+55 (11) 99999-9999"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      data-testid="input-whatsapp-number"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Inclua código do país (+55 para Brasil)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Usage */}
        <Card data-testid="card-api-usage">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="w-5 h-5" />
              <span>Uso da API</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Consultas Realizadas</span>
                <span className="font-medium">{user?.apiUsage || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Limite Mensal</span>
                <span className="font-medium">{user?.apiLimit || 100}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(((user?.apiUsage || 0) / (user?.apiLimit || 100)) * 100, 100)}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {(user?.apiLimit || 100) - (user?.apiUsage || 0)} consultas restantes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card data-testid="card-account-info">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Conta</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Plano Atual</Label>
              <p className="text-lg font-semibold text-foreground">
                {PLANS[user?.plan as keyof typeof PLANS]?.name
                  ? PLANS[user?.plan as keyof typeof PLANS].name
                  : (user?.plan === 'pro' || user?.plan === 'professional')
                    ? 'Profissional'
                    : 'Gratuito'}
              </p>
              {(user?.plan === 'free' || !user?.plan) && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    Upgrade para Pro e tenha acesso a:
                  </p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• Monitoramento automático de fornecedores</li>
                    <li>• Notificações por email e WhatsApp</li>
                    <li>• Alertas automáticos de mudanças</li>
                    <li>• Maior limite de consultas</li>
                  </ul>
                </div>
              )}
              {(user?.plan === 'pro' || user?.plan === 'professional' || user?.plan === 'enterprise') && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-2">
                    ✓ Recursos Pro ativados:
                  </p>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• Monitoramento automático disponível</li>
                    <li>• Notificações avançadas ativas</li>
                    <li>• Alertas em tempo real</li>
                  </ul>
                </div>
              )}
            </div>
            <div>
              <Label>Membro Desde</Label>
              <p className="text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </div>
            <div>
              <Label>Última Atualização</Label>
              <p className="text-foreground">
                {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          data-testid="button-save-settings"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}