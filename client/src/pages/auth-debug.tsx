import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info, RefreshCw } from "lucide-react";

interface AuthDebugInfo {
  currentHostname: string;
  protocol: string;
  configuredDomains: string[];
  domainMatch: boolean;
  environment: string;
  sessionExists: boolean;
  userAuthenticated: boolean;
  timestamp: string;
  recommendation: string;
}

export default function AuthDebugPage() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth-debug');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDebugInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debug info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? 
      <CheckCircle className="w-5 h-5 text-green-500" /> : 
      <AlertTriangle className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (status: boolean, trueText: string, falseText: string) => {
    return (
      <Badge variant={status ? "default" : "destructive"}>
        {status ? trueText : falseText}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Diagnóstico de Autenticação</h1>
            <p className="text-muted-foreground mt-2">
              Esta página ajuda a diagnosticar problemas de acesso na versão publicada
            </p>
          </div>
          <Button onClick={fetchDebugInfo} disabled={loading} data-testid="button-refresh">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">Erro: {error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {debugInfo && (
          <div className="space-y-6">
            {/* Status Overview */}
            <Card data-testid="card-status-overview">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Status Geral</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Usuário Autenticado</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(debugInfo.userAuthenticated)}
                      {getStatusBadge(debugInfo.userAuthenticated, "Sim", "Não")}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Sessão Existente</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(debugInfo.sessionExists)}
                      {getStatusBadge(debugInfo.sessionExists, "Sim", "Não")}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Domínio Correto</span>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(debugInfo.domainMatch)}
                      {getStatusBadge(debugInfo.domainMatch, "Sim", "Não")}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Ambiente</span>
                    <Badge variant="secondary">{debugInfo.environment}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Domain Configuration */}
            <Card data-testid="card-domain-config">
              <CardHeader>
                <CardTitle>Configuração de Domínio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Domínio Atual</label>
                    <p className="text-foreground font-mono bg-muted p-2 rounded">{debugInfo.currentHostname}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Protocolo</label>
                    <p className="text-foreground font-mono bg-muted p-2 rounded">{debugInfo.protocol}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Domínios Configurados</label>
                    <div className="space-y-2">
                      {debugInfo.configuredDomains.map((domain, index) => (
                        <div key={index} className="font-mono bg-muted p-2 rounded flex items-center justify-between">
                          <span>{domain}</span>
                          {domain === debugInfo.currentHostname && (
                            <Badge variant="default">Atual</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card data-testid="card-recommendation">
              <CardHeader>
                <CardTitle>Recomendação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-4 rounded-lg ${
                  debugInfo.domainMatch ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={debugInfo.domainMatch ? 'text-green-800' : 'text-red-800'}>
                    {debugInfo.recommendation}
                  </p>
                </div>
                
                {!debugInfo.domainMatch && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-medium">Como resolver:</p>
                    <ul className="list-disc list-inside mt-2 text-blue-700 space-y-1">
                      <li>O domínio atual não corresponde ao configurado na aplicação</li>
                      <li>Isso geralmente acontece quando a aplicação é publicada</li>
                      <li>Entre em contato com o administrador para atualizar as configurações</li>
                      <li>Tente acessar através de um dos domínios configurados listados acima</li>
                    </ul>
                  </div>
                )}

                {debugInfo.userAuthenticated && (
                  <div className="mt-4">
                    <Button 
                      onClick={() => window.location.href = '/'} 
                      className="w-full"
                      data-testid="button-go-to-dashboard"
                    >
                      Ir para o Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card data-testid="card-technical-details">
              <CardHeader>
                <CardTitle>Detalhes Técnicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Timestamp: {new Date(debugInfo.timestamp).toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}