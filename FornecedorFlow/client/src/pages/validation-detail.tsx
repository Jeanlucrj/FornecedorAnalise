import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { downloadPDF } from "@/lib/pdfExport";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Building, Download, RefreshCw, Calendar, MapPin, Phone, Mail, Eye, FileText, Shield, TrendingUp, Users, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ValidationDetail() {
  const { id } = useParams<{ id: string }>();
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: validation, isLoading, error } = useQuery<any>({
    queryKey: [`/api/validations/${id}`],
    enabled: !!id,
    retry: false,
  });

  // Mutation for revalidation
  const revalidateMutation = useMutation({
    mutationFn: async () => {
      if (!validation?.supplier?.cnpj) {
        throw new Error('CNPJ não encontrado para revalidação');
      }
      
      const response = await apiRequest(`/api/validate`, 'POST', {
        cnpj: validation.supplier.cnpj,
        analysisType: validation.validation.analysisType || 'complete'
      });
      
      return response;
    },
    onSuccess: (newValidation) => {
      // Update the current validation data in cache
      queryClient.setQueryData([`/api/validations/${id}`], newValidation);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/validations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      toast({
        title: "Validação Atualizada",
        description: "Os dados foram atualizados com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na Revalidação",
        description: error.message || "Não foi possível atualizar os dados.",
        variant: "destructive",
      });
    },
  });

  // Determine analysis type based on database data and URL
  const urlHasQuickView = location.includes('view=quick');
  const isQuickAnalysisType = validation?.validation?.analysisType === 'quick';
  
  // Set the correct view based on analysis type from database
  const isQuickView = isQuickAnalysisType || urlHasQuickView;

  // Handle unauthorized error
  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  const handleExportPDF = async () => {
    if (!validation) return;
    
    try {
      await downloadPDF(validation.validation.id, validation.supplier?.companyName);
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

  const handleGoBack = () => {
    window.history.back();
  };

  const handleToggleView = () => {
    // If this is a quick analysis type, we can't show complete view - it doesn't have that data
    if (isQuickAnalysisType) {
      toast({
        title: "Visualização não disponível",
        description: "Esta é uma análise rápida e não possui dados completos para exibir.",
        variant: "destructive",
      });
      return;
    }
    
    const newLocation = urlHasQuickView 
      ? `/validation/${id}` 
      : `/validation/${id}?view=quick`;
    window.location.href = newLocation;
  };

  const handleRefreshValidation = () => {
    if (revalidateMutation.isPending) {
      return;
    }
    
    revalidateMutation.mutate();
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

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Validação não encontrada
            </h3>
            <p className="text-muted-foreground mb-4">
              A validação solicitada não foi encontrada ou você não tem permissão para visualizá-la.
            </p>
            <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { validation: validationData, supplier, analysis } = validation;

  return (
    <div className="p-6 space-y-6" data-testid="validation-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleGoBack} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {supplier?.companyName || 'Empresa'}
            </h1>
            <p className="text-muted-foreground">
              {isQuickAnalysisType ? 'Análise Rápida' : 'Análise Completa'} - realizada em {formatDate(validationData.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Analysis View - Basic Info Only */}
          {isQuickAnalysisType || urlHasQuickView ? (
            <Card data-testid="card-quick-analysis">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Análise Rápida</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome da Empresa</label>
                    <p className="text-foreground font-medium">{supplier?.companyName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                    <p className="text-foreground">{supplier?.cnpj || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Abertura</label>
                    <p className="text-foreground">{formatDate(supplier?.openingDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Score de Risco</label>
                    <p className={`font-medium text-lg ${
                      validationData.score >= 80 ? 'text-green-600' :
                      validationData.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {validationData.score}/100
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <StatusBadge status={validationData.status} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Complete Analysis View - All Information */
            <>
              {/* Company Information */}
              <Card data-testid="card-company-info">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>Informações da Empresa</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Razão Social</label>
                  <p className="text-foreground">{supplier?.companyName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Fantasia</label>
                  <p className="text-foreground">{supplier?.tradeName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                  <p className="font-mono text-foreground">{supplier?.cnpj || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Situação Legal</label>
                  <p className="text-foreground">{supplier?.legalStatus || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Porte da Empresa</label>
                  <p className="text-foreground">{supplier?.companySize || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Abertura</label>
                  <p className="text-foreground">
                    {supplier?.openingDate ? new Date(supplier.openingDate).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
              </div>
              
              {supplier?.address && (
                <div className="flex items-start space-x-2 pt-4">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-foreground">{supplier.address}</p>
                    <p className="text-sm text-muted-foreground">
                      {supplier.city}, {supplier.state} - {supplier.zipCode}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-6 pt-4">
                {supplier?.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{supplier.phone}</span>
                  </div>
                )}
                {supplier?.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{supplier.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Cadastral */}
          {validationData.cadastralStatus && (
            <Card data-testid="card-cadastral-status">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Status Cadastral</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Situação RF</label>
                    <p className={`font-medium ${
                      validationData.cadastralStatus?.status === 'APROVADO' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {validationData.cadastralStatus?.status || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Abertura</label>
                    <p className="text-foreground">{formatDate(supplier?.openingDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">CNAE Principal</label>
                    <p className="text-foreground">{supplier?.cnaeCode || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Capital Social</label>
                    <p className="text-foreground">
                      {supplier?.shareCapital ? `R$ ${Number(supplier.shareCapital).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Saúde Financeira */}
          {validationData.financialHealth && (
            <Card data-testid="card-financial-health">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Saúde Financeira</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Protestos</label>
                    <p className={`font-medium ${
                      (validationData.financialHealth?.protests?.length || 0) === 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(validationData.financialHealth?.protests?.length || 0) === 0 ? 'NENHUM' : `${validationData.financialHealth.protests.length} encontrado(s)`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Falências</label>
                    <p className={`font-medium ${
                      (validationData.financialHealth?.bankruptcies?.length || 0) === 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(validationData.financialHealth?.bankruptcies?.length || 0) === 0 ? 'NENHUMA' : `${validationData.financialHealth.bankruptcies.length} encontrada(s)`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Recuperação Judicial</label>
                    <p className={`font-medium ${
                      !validationData.financialHealth?.judicialRecovery ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {!validationData.financialHealth?.judicialRecovery ? 'NÃO' : 'SIM'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certidões Negativas */}
          {validationData.certificates && (
            <Card data-testid="card-certificates">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Certidões Negativas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Federal</label>
                    <div className="flex items-center space-x-2">
                      {validationData.certificates?.federal?.status === 'valid' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        validationData.certificates?.federal?.status === 'valid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {validationData.certificates?.federal?.status === 'valid' ? 'VÁLIDA' : 'INVÁLIDA'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Estadual</label>
                    <div className="flex items-center space-x-2">
                      {validationData.certificates?.state?.status === 'valid' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        validationData.certificates?.state?.status === 'valid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {validationData.certificates?.state?.status === 'valid' ? 'VÁLIDA' : 'INVÁLIDA'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Municipal</label>
                    <div className="flex items-center space-x-2">
                      {validationData.certificates?.municipal?.status === 'valid' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        validationData.certificates?.municipal?.status === 'valid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {validationData.certificates?.municipal?.status === 'valid' ? 'VÁLIDA' : 'INVÁLIDA'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Trabalhista</label>
                    <div className="flex items-center space-x-2">
                      {validationData.certificates?.labor?.status === 'valid' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        validationData.certificates?.labor?.status === 'valid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {validationData.certificates?.labor?.status === 'valid' ? 'VÁLIDA' : 'INVÁLIDA'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Análise de Risco e Compliance */}
          {validationData.riskAnalysis && (
            <Card data-testid="card-risk-analysis">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Análise de Risco e Compliance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Score de Compliance</label>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-2xl font-bold text-foreground">
                        {validationData.riskAnalysis?.complianceScore || validationData.score}/100
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        (validationData.riskAnalysis?.complianceScore || validationData.score) >= 70 
                          ? 'bg-green-100 text-green-800' 
                          : (validationData.riskAnalysis?.complianceScore || validationData.score) >= 50
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(validationData.riskAnalysis?.complianceScore || validationData.score) >= 70 
                          ? 'ADEQUADO' 
                          : (validationData.riskAnalysis?.complianceScore || validationData.score) >= 50
                          ? 'MODERADO'
                          : 'INADEQUADO'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {validationData.riskAnalysis?.checks && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Verificações de Compliance</label>
                    <div className="space-y-2">
                      {Object.entries(validationData.riskAnalysis.checks).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                          <div className="flex items-center space-x-1">
                            {value?.status === 'passed' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : value?.status === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-xs ${
                              value?.status === 'passed' ? 'text-green-600' : 
                              value?.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {value?.status === 'passed' ? 'OK' : 
                               value?.status === 'warning' ? 'ATENÇÃO' : 'FALHOU'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Estrutura Societária */}
          {validation.partners && validation.partners.length > 0 && (
            <Card data-testid="card-corporate-structure">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Estrutura Societária</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {validation.partners.map((partner: any, index: number) => (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-foreground">{partner.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {partner.qualification}
                      {partner.sharePercentage && partner.sharePercentage > 0 && ` - ${partner.sharePercentage}`}
                    </p>
                    {partner.cpfCnpj && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {partner.cpfCnpj}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Analysis Details */}
          {analysis && (
            <Card data-testid="card-analysis-details">
              <CardHeader>
                <CardTitle>Detalhes da Análise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fonte dos Dados</label>
                    <p className="text-foreground">{analysis.dataSource || validationData.dataSource || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tempo de Processamento</label>
                    <p className="text-foreground">
                      {analysis.processingTime || validationData.processingTime ? `${analysis.processingTime || validationData.processingTime}ms` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Custo da Consulta</label>
                    <p className="text-foreground">
                      {analysis.apiCost || validationData.apiCost ? `R$ ${Number(analysis.apiCost || validationData.apiCost).toFixed(4)}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data da Análise</label>
                    <p className="text-foreground">{formatDate(validationData.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Score Card */}
          <Card data-testid="card-score">
            <CardHeader>
              <CardTitle>Score de Risco</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="text-6xl font-bold text-foreground">
                {validationData.score}
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    validationData.score >= 80 ? 'bg-success' :
                    validationData.score >= 50 ? 'bg-warning' :
                    'bg-destructive'
                  }`}
                  style={{ width: `${validationData.score}%` }}
                />
              </div>
              <StatusBadge status={validationData.status} size="lg" />
            </CardContent>
          </Card>

          {/* Action Card */}
          <Card data-testid="card-actions">
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full" 
                onClick={handleExportPDF}
                data-testid="button-export-report"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Relatório
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleRefreshValidation}
                disabled={revalidateMutation.isPending}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${revalidateMutation.isPending ? 'animate-spin' : ''}`} />
                {revalidateMutation.isPending ? 'Atualizando...' : 'Atualizar Validação'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}