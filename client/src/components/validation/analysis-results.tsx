import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { downloadPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import ScoreCircle from "./score-circle";
import { Download, Bell, FileCheck, BarChart3, CheckCircle, Users, Shield, AlertTriangle, TrendingUp } from "lucide-react";

interface AnalysisResultsProps {
  result: any;
  onNewValidation: () => void;
}

export default function AnalysisResults({ result, onNewValidation }: AnalysisResultsProps) {
  const { toast } = useToast();
  const { validation, supplier, partners, analysis } = result;

  const handleExportPDF = async () => {
    try {
      await downloadPDF(validation.id, supplier?.companyName || 'Fornecedor');
      toast({
        title: "PDF Exportado",
        description: "Relatório baixado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro na Exportação",
        description: "Não foi possível gerar o relatório PDF.",
        variant: "destructive",
      });
    }
  };

  const handleScheduleMonitoring = () => {
    toast({
      title: "Monitoramento Agendado",
      description: "Você receberá alertas sobre mudanças neste fornecedor.",
    });
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | string) => {
    if (!value) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  return (
    <div id="analysis-results" data-testid="analysis-results">
      {/* Score and Company Info */}
      <Card className="mb-6">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Score Visualization */}
            <div className="flex flex-col items-center">
              <ScoreCircle score={validation.score} />
              <StatusBadge
                status={validation.status}
                className="mt-4 px-3 py-1 text-sm font-medium"
              />
            </div>

            {/* Company Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-foreground" data-testid="company-name">
                  {supplier?.companyName || 'Nome não disponível'}
                </h2>
                <p className="text-muted-foreground" data-testid="company-cnpj">
                  {supplier?.cnpj || '00.000.000/0000-00'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium text-foreground" data-testid="company-status">
                    {supplier?.legalStatus || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Situação</p>
                  <p className="font-medium text-foreground" data-testid="company-situation">
                    {supplier?.legalSituation || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Porte</p>
                  <p className="font-medium text-foreground" data-testid="company-size">
                    {supplier?.companySize || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col space-y-2">
              <Button
                onClick={handleExportPDF}
                data-testid="button-export-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
              <Button
                variant="secondary"
                onClick={handleScheduleMonitoring}
                data-testid="button-schedule-monitoring"
              >
                <Bell className="w-4 h-4 mr-2" />
                Monitorar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Cadastral */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <FileCheck className="w-5 h-5 text-primary mr-2" />
              Status Cadastral
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Situação RF</span>
                <StatusBadge
                  status={supplier?.legalStatus === 'ATIVA' ? 'approved' : 'critical'}
                  size="sm"
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data de Abertura</span>
                <span className="text-sm text-foreground">
                  {formatDate(supplier?.openingDate)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">CNAE Principal</span>
                <span className="text-sm text-foreground">
                  {supplier?.cnaeCode || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Capital Social</span>
                <span className="text-sm text-foreground">
                  {formatCurrency(supplier?.shareCapital || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saúde Financeira */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 text-primary mr-2" />
              Saúde Financeira
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Protestos</span>
                <StatusBadge
                  status={analysis?.financialHealth?.protests?.length > 0 ? 'critical' : 'approved'}
                  size="sm"
                  text={analysis?.financialHealth?.protests?.length > 0 ? 'ENCONTRADOS' : 'NENHUM'}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Falências</span>
                <StatusBadge
                  status={analysis?.financialHealth?.bankruptcies?.length > 0 ? 'critical' : 'approved'}
                  size="sm"
                  text={analysis?.financialHealth?.bankruptcies?.length > 0 ? 'ENCONTRADAS' : 'NENHUMA'}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Recuperação Judicial</span>
                <StatusBadge
                  status={analysis?.financialHealth?.judicialRecovery ? 'critical' : 'approved'}
                  size="sm"
                  text={analysis?.financialHealth?.judicialRecovery ? 'SIM' : 'NÃO'}
                />
              </div>
              {analysis?.financialHealth?.serasaScore && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Score Serasa</span>
                  <span className="text-sm text-foreground">
                    {analysis.financialHealth.serasaScore}/1000
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Certidões */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-primary mr-2" />
              Certidões Negativas
            </h3>
            <div className="space-y-3">
              {['federal', 'state', 'municipal', 'labor'].map((certType) => {
                const cert = analysis?.certificates?.[certType];
                const isValid = cert?.status === 'valid';
                const isExpiring = cert?.status === 'expiring';

                return (
                  <div key={certType} className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground capitalize">
                      {certType === 'federal' ? 'Federal' :
                        certType === 'state' ? 'Estadual' :
                          certType === 'municipal' ? 'Municipal' : 'Trabalhista'}
                    </span>
                    <StatusBadge
                      status={isValid ? 'approved' : isExpiring ? 'attention' : 'critical'}
                      size="sm"
                      text={isValid ? 'VÁLIDA' : isExpiring ? 'VENCENDO' : 'INVÁLIDA'}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Análise de Risco e Compliance */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Shield className="w-5 h-5 text-primary mr-2" />
              Análise de Risco e Compliance
            </h3>

            {analysis?.riskAnalysis ? (
              <div className="space-y-4">
                {/* Compliance Score */}
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Score de Compliance</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-foreground">
                      {analysis.riskAnalysis.complianceScore}/100
                    </span>
                    <StatusBadge
                      status={analysis.riskAnalysis.complianceScore >= 80 ? 'approved' :
                        analysis.riskAnalysis.complianceScore >= 50 ? 'attention' : 'critical'}
                      size="sm"
                      text={analysis.riskAnalysis.riskLevel || (
                        analysis.riskAnalysis.complianceScore >= 80 ? 'BAIXO' :
                          analysis.riskAnalysis.complianceScore >= 60 ? 'MÉDIO' :
                            analysis.riskAnalysis.complianceScore >= 40 ? 'ALTO' : 'CRÍTICO'
                      )}
                    />
                  </div>
                </div>

                {/* Compliance Checks */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Verificações Governamentais</h4>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">CEIS (Inidôneas/Suspensas)</span>
                    <StatusBadge
                      status={analysis.riskAnalysis.complianceChecks?.ceis ? 'critical' : 'approved'}
                      size="sm"
                      text={analysis.riskAnalysis.complianceChecks?.ceis ? 'ENCONTRADO' : 'LIMPO'}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">CNEP (Empresas Punidas)</span>
                    <StatusBadge
                      status={analysis.riskAnalysis.complianceChecks?.cnep ? 'critical' : 'approved'}
                      size="sm"
                      text={analysis.riskAnalysis.complianceChecks?.cnep ? 'ENCONTRADO' : 'LIMPO'}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Lista de Sanções (CGU)</span>
                    <StatusBadge
                      status={analysis.riskAnalysis.complianceChecks.sanctionList ? 'critical' : 'approved'}
                      size="sm"
                      text={analysis.riskAnalysis.complianceChecks.sanctionList ? 'ENCONTRADO' : 'LIMPO'}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Trabalho Escravo (MTE)</span>
                    <StatusBadge
                      status={analysis.riskAnalysis.complianceChecks.workSlavery ? 'critical' : 'approved'}
                      size="sm"
                      text={analysis.riskAnalysis.complianceChecks.workSlavery ? 'ENCONTRADO' : 'LIMPO'}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pessoa Politicamente Exposta</span>
                    <StatusBadge
                      status={analysis.riskAnalysis.complianceChecks.pep ? 'attention' : 'approved'}
                      size="sm"
                      text={analysis.riskAnalysis.complianceChecks.pep ? 'SIM' : 'NÃO'}
                    />
                  </div>
                </div>

                {/* Risk Factors */}
                {analysis.riskAnalysis.riskFactors && analysis.riskAnalysis.riskFactors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground flex items-center">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 mr-1" />
                      Fatores de Risco Identificados
                    </h4>
                    <div className="space-y-1">
                      {analysis.riskAnalysis.riskFactors.map((risk: any, index: number) => (
                        <div key={index} className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                          • {typeof risk === 'string' ? risk : risk.description}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysis.riskAnalysis.recommendations && analysis.riskAnalysis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Recomendações</h4>
                    <div className="space-y-1">
                      {analysis.riskAnalysis.recommendations.map((rec: string, index: number) => (
                        <div key={index} className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                          • {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                  Fontes: {analysis.riskAnalysis.dataSourcers?.join(', ') || 'Portal da Transparência'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  ⚡ Análise rápida — verificações governamentais não executadas.
                </p>
                <p className="text-xs text-muted-foreground">
                  Utilize a <strong>Validação Completa CNPJ</strong> para verificar CEIS, CNEP e Lista de Trabalho Escravo.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estrutura Societária */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Users className="w-5 h-5 text-primary mr-2" />
              Estrutura Societária
            </h3>
            <div className="space-y-3">
              {partners && partners.length > 0 ? (
                partners.reduce((acc: any[], current: any) => {
                  const existing = acc.find(item => item.name === current.name);
                  if (!existing) {
                    return [...acc, current];
                  }
                  if (current.qualification && existing.qualification) {
                    if (/\d/.test(current.qualification) && !/\d/.test(existing.qualification)) {
                      return acc.map(item => item.name === current.name ? current : item);
                    }
                  }
                  return acc;
                }, []).map((partner: any, index: number) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{partner.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {partner.cpfCnpj ? `CPF: ${partner.cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**')}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {partner.qualification || 'Sócio'}
                        </p>
                        {partner.ageRange && (
                          <p className="text-xs text-muted-foreground">
                            Faixa etária: {partner.ageRange}
                          </p>
                        )}
                        {partner.entryDate && (
                          <p className="text-xs text-muted-foreground">
                            Entrada: {formatDate(partner.entryDate)}
                          </p>
                        )}
                      </div>
                      {partner.sharePercentage !== null && partner.sharePercentage !== undefined && partner.sharePercentage > 0 && (
                        <div className="text-right">
                          <span className="text-sm font-medium text-primary">
                            {partner.sharePercentage}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Informações de sócios não disponíveis
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações de Mercado (B3) */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-primary mr-2" />
              Informações de Mercado (B3)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ticker</span>
                <span className="text-sm font-bold text-primary">{validation.financialMarketData?.ticker || 'N/D'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Preço da Ação</span>
                <span className="text-sm font-medium text-foreground">
                  {validation.financialMarketData?.price ? `${validation.financialMarketData.currency || 'BRL'} ${validation.financialMarketData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/D'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valuation (Market Cap)</span>
                <span className="text-sm font-medium text-foreground">
                  {validation.financialMarketData?.marketCap ? `${validation.financialMarketData.currency || 'BRL'} ${validation.financialMarketData.marketCap.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 2 })}` : 'N/D'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                <span className="text-[10px] text-muted-foreground">
                  Fonte: {validation.financialMarketData?.source || 'B3 / HG Brasil / Brapi'}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {validation.financialMarketData?.updatedAt ? `Atualizado: ${formatDate(validation.financialMarketData.updatedAt)}` : 'Empresa sem capital aberto'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Validation Button */}
      <div className="text-center">
        <Button
          variant="outline"
          onClick={onNewValidation}
          data-testid="button-new-validation"
        >
          Nova Validação
        </Button>
      </div>
    </div>
  );
}
