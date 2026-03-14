import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, BarChart3, FileCheck, Users, Clock, CheckCircle, TestTube, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import CheckoutDialog from "@/components/CheckoutDialog";
import { useAuth } from "@/hooks/useAuth";
import { CardFooter } from "@/components/ui/card";

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  const handleLogin = () => {
    window.location.href = "/login";
  };

  const handleRegister = () => {
    window.location.href = "/register";
  };

  const handleSelectPlan = (planId: string) => {
    if (!user) {
      setLocation(`/register?plan=${planId}`);
      return;
    }

    if (planId === 'free') {
      setLocation("/dashboard");
      return;
    }

    setSelectedPlanId(planId);
    setCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">ValidaFornecedor</span>
            </div>
            <div className="flex items-center space-x-2">
              {import.meta.env.DEV && (
                <Link href="/test-login">
                  <Button variant="outline" size="sm" data-testid="button-test-login">
                    <TestTube className="w-4 h-4 mr-1" />
                    Teste
                  </Button>
                </Link>
              )}
              <Button variant="ghost" onClick={handleLogin} data-testid="button-login">
                Entrar
              </Button>
              <Button onClick={handleRegister} data-testid="button-register">
                Criar Conta
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <Search className="w-10 h-10 text-primary" />
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Análise Completa de Fornecedores
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Insira o CNPJ e deixe a IA trabalhar. Para uma validação ágil e completa,
            nossa IA fará uma varredura cruzada de dados, gerando um relatório detalhado.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" onClick={handleRegister} data-testid="button-start-validation">
              Começar Validação
            </Button>
            <Button variant="outline" size="lg" data-testid="button-learn-more">
              Saiba Mais
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">30s</div>
              <div className="text-sm text-muted-foreground">Análise Rápida</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">15+</div>
              <div className="text-sm text-muted-foreground">Fontes de Dados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">99%</div>
              <div className="text-sm text-muted-foreground">Precisão</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoramento</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              O que a IA vai analisar para você
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Análise completa e automática para garantir a confiabilidade dos seus fornecedores
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center" data-testid="card-feature-cadastral">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Status Cadastral</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Consulta à Receita Federal e outros órgãos para confirmar a situação ativa do CNPJ.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-feature-financial">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Saúde Financeira</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Busca por protestos e pendências em bases públicas para avaliar a saúde financeira.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-feature-certificates">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Certidões Negativas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Validação da emissão de certidões essenciais para contratação segura.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-feature-structure">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Estrutura Societária</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Análise dos sócios e histórico de participação em outras empresas.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center" data-testid="card-feature-market">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Dados de Mercado</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Identifica se a empresa possui capital aberto e apresenta cotação das ações e valuation em tempo real.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-8">
                Funcionalidades Avançadas
              </h2>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Monitoramento Contínuo</h3>
                    <p className="text-muted-foreground">
                      Checagens periódicas automáticas com alertas imediatos para mudanças de status.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Score de Risco</h3>
                    <p className="text-muted-foreground">
                      Pontuação de 0 a 100 baseada em análise ponderada de todos os dados coletados.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <FileCheck className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Relatórios Personalizados</h3>
                    <p className="text-muted-foreground">
                      Exportação em PDF com histórico completo de validações realizadas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Search className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Validação em Lote</h3>
                    <p className="text-muted-foreground">
                      Upload de planilhas para validação de múltiplos fornecedores simultaneamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-8">
              <h3 className="text-xl font-semibold text-foreground mb-6">
                Comece agora sua validação
              </h3>
              <p className="text-muted-foreground mb-6">
                Receba um dossiê completo para cada fornecedor em segundos.
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">Análise em menos de 30 segundos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">Dados criptografados e seguros</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground">Conformidade com LGPD</span>
                </div>
              </div>

              <Button className="w-full" onClick={handleLogin} data-testid="button-start-now">
                Começar Agora
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Planos para todos os tamanhos
          </h2>
          <p className="text-lg text-muted-foreground mb-12">
            Escolha o plano ideal para suas necessidades de validação
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <Card data-testid="card-plan-free">
              <CardHeader>
                <CardTitle>Gratuito</CardTitle>
                <CardDescription>Ideal para testes</CardDescription>
                <div className="text-3xl font-bold text-foreground">R$ 0</div>
                <div className="text-sm text-muted-foreground">/mês</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 10 validações/mês</li>
                  <li>• Relatórios básicos</li>
                  <li>• Suporte por email</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleSelectPlan('free')}
                  data-testid="button-plan-free"
                >
                  Começar Grátis
                </Button>
              </CardFooter>
            </Card>

            <Card data-testid="card-plan-basic">
              <CardHeader>
                <CardTitle>Básico</CardTitle>
                <CardDescription>Para empresas em crescimento</CardDescription>
                <div className="text-3xl font-bold text-foreground">R$ 147</div>
                <div className="text-sm text-muted-foreground">/mês</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 500 validações/mês</li>
                  <li>• Monitoramento contínuo</li>
                  <li>• Relatórios avançados</li>
                  <li>• API de integração</li>
                  <li>• Suporte prioritário</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSelectPlan('basic')}
                  data-testid="button-plan-basic"
                >
                  Assinar Agora
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-primary relative" data-testid="card-plan-pro">
              {/* Badge for most popular */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Mais Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle>Profissional</CardTitle>
                <CardDescription>Para empresas em crescimento</CardDescription>
                <div className="text-3xl font-bold text-foreground">R$ 297</div>
                <div className="text-sm text-muted-foreground">/mês</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• 1.000 validações/mês</li>
                  <li>• Monitoramento contínuo</li>
                  <li>• Relatórios avançados</li>
                  <li>• API de integração</li>
                  <li>• Suporte prioritário</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSelectPlan('professional')}
                  data-testid="button-plan-pro"
                >
                  Assinar Agora
                </Button>
              </CardFooter>
            </Card>

            <Card data-testid="card-plan-enterprise">
              <CardHeader>
                <CardTitle>Empresarial</CardTitle>
                <CardDescription>Para grandes volumes</CardDescription>
                <div className="text-3xl font-bold text-foreground">R$ 997</div>
                <div className="text-sm text-muted-foreground">/mês</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Validações ilimitadas</li>
                  <li>• White-label</li>
                  <li>• Integração completa</li>
                  <li>• Suporte dedicado</li>
                  <li>• Treinamento incluso</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleSelectPlan('enterprise')}
                  data-testid="button-plan-enterprise"
                >
                  Falar com Vendas
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">ValidaFornecedor</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 ValidaFornecedor. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        planId={selectedPlanId}
      />
    </div>
  );
}
