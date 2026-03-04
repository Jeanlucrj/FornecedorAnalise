import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { downloadPDF } from "@/lib/pdfExport";
import HistoryFilters from "@/components/history/history-filters";
import { Building, Download, FileText, TrendingUp, Eye, Calendar, BarChart3, ArrowLeft, Home, Zap, Clock } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

// Mapear códigos CNAE para atividades econômicas
const getCnaeDescription = (cnaeCode: string): string => {
  if (!cnaeCode) return 'Atividade não informada';
  
  // Remove pontos e hífens do código CNAE
  const cleanCode = cnaeCode.replace(/[.-]/g, '');
  const mainCode = cleanCode.substring(0, 2);
  
  const cnaeMapping: { [key: string]: string } = {
    '01': 'Agricultura, Pecuária e Serviços',
    '02': 'Produção Florestal',
    '03': 'Pesca e Aquicultura',
    '05': 'Extração de Carvão Mineral',
    '06': 'Extração de Petróleo e Gás',
    '07': 'Extração de Minerais Metálicos',
    '08': 'Extração de Minerais',
    '09': 'Atividades de Apoio à Extração',
    '10': 'Indústria Alimentícia',
    '11': 'Fabricação de Bebidas',
    '12': 'Fabricação de Produtos do Fumo',
    '13': 'Fabricação de Produtos Têxteis',
    '14': 'Confecção de Artigos do Vestuário',
    '15': 'Preparação de Couros e Calçados',
    '16': 'Fabricação de Produtos de Madeira',
    '17': 'Fabricação de Celulose e Papel',
    '18': 'Impressão e Reprodução',
    '19': 'Fabricação de Coque e Petróleo',
    '20': 'Fabricação de Produtos Químicos',
    '21': 'Fabricação de Produtos Farmoquímicos',
    '22': 'Fabricação de Produtos de Borracha',
    '23': 'Fabricação de Produtos Minerais',
    '24': 'Metalurgia',
    '25': 'Fabricação de Produtos de Metal',
    '26': 'Fabricação de Equipamentos de Informática',
    '27': 'Fabricação de Máquinas e Equipamentos',
    '28': 'Fabricação de Veículos Automotores',
    '29': 'Fabricação de Outros Equipamentos',
    '30': 'Fabricação de Outros Equipamentos',
    '31': 'Fabricação de Móveis',
    '32': 'Fabricação de Produtos Diversos',
    '33': 'Manutenção, Reparação e Instalação',
    '35': 'Eletricidade, Gás e Outras Utilidades',
    '36': 'Captação, Tratamento e Distribuição de Água',
    '37': 'Esgoto e Atividades Relacionadas',
    '38': 'Coleta, Tratamento e Disposição',
    '39': 'Descontaminação e Outros Serviços',
    '41': 'Construção de Edifícios',
    '42': 'Obras de Infraestrutura',
    '43': 'Serviços Especializados para Construção',
    '45': 'Comércio e Reparação de Veículos',
    '46': 'Comércio Atacadista',
    '47': 'Comércio Varejista',
    '49': 'Transporte Terrestre',
    '50': 'Transporte Aquaviário',
    '51': 'Transporte Aéreo',
    '52': 'Armazenamento e Atividades Auxiliares',
    '53': 'Correio e Outras Atividades',
    '55': 'Alojamento',
    '56': 'Alimentação',
    '58': 'Edição e Edição Integrada',
    '59': 'Atividades Cinematográficas',
    '60': 'Atividades de Rádio e Televisão',
    '61': 'Telecomunicações',
    '62': 'Atividades dos Serviços de Tecnologia',
    '63': 'Atividades de Prestação de Serviços',
    '64': 'Atividades de Serviços Financeiros',
    '65': 'Seguros, Resseguros, Previdência',
    '66': 'Atividades Auxiliares dos Serviços',
    '68': 'Atividades Imobiliárias',
    '69': 'Atividades Jurídicas, Contábeis',
    '70': 'Atividades de Sedes de Empresas',
    '71': 'Serviços de Arquitetura e Engenharia',
    '72': 'Pesquisa e Desenvolvimento Científico',
    '73': 'Publicidade e Pesquisa de Mercado',
    '74': 'Outras Atividades Profissionais',
    '75': 'Atividades Veterinárias',
    '77': 'Aluguéis Não Imobiliários',
    '78': 'Seleção, Agenciamento e Locação',
    '79': 'Agências de Viagens e Operadores',
    '80': 'Atividades de Vigilância e Segurança',
    '81': 'Serviços para Edifícios e Paisagismo',
    '82': 'Serviços de Escritório e Apoio',
    '84': 'Administração Pública, Defesa',
    '85': 'Educação',
    '86': 'Atividades de Atenção à Saúde',
    '87': 'Atividades de Atenção à Saúde',
    '88': 'Serviços de Assistência Social',
    '90': 'Atividades Artísticas, Criativas',
    '91': 'Atividades de Organizações Associativas',
    '92': 'Atividades de Exploração de Jogos',
    '93': 'Atividades Esportivas e de Recreação',
    '94': 'Atividades de Organizações Associativas',
    '95': 'Reparação e Manutenção',
    '96': 'Outras Atividades de Serviços',
    '97': 'Serviços Domésticos',
    '99': 'Organismos Internacionais'
  };
  
  return cnaeMapping[mainCode] || 'Atividade Comercial';
};

export default function Reports() {
  const [filters, setFilters] = useState({});
  const [analysisType, setAnalysisType] = useState<'all' | 'quick' | 'complete'>('all');
  const { toast } = useToast();

  const { data: validations, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/validations", { limit: 100, ...filters }],
    retry: false,
  });

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

  const handleExportAll = async () => {
    if (!validations || validations.length === 0) {
      toast({
        title: "Nenhum Dado",
        description: "Não há validações para exportar.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Exportação Iniciada",
      description: "Gerando relatório consolidado...",
    });

    // In a real implementation, this would generate a consolidated report
    setTimeout(() => {
      toast({
        title: "Relatório Exportado",
        description: "Relatório consolidado baixado com sucesso!",
      });
    }, 2000);
  };

  const handleExportSingle = async (validationId: string, companyName: string) => {
    try {
      await downloadPDF(validationId, companyName);
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

  const handleViewDetail = (validationId: string, isQuickAnalysis: boolean) => {
    const url = isQuickAnalysis 
      ? `/validation/${validationId}?view=quick`
      : `/validation/${validationId}`;
    window.location.href = url;
  };

  // Determine if validation is quick analysis using the analysisType field
  const isQuickAnalysis = (validation: any) => {
    return validation.validation.analysisType === 'quick';
  };

  const getStatsFromValidations = (validations: any[]) => {
    if (!validations || validations.length === 0) {
      return { total: 0, approved: 0, attention: 0, critical: 0, avgScore: 0 };
    }

    const total = validations.length;
    const approved = validations.filter(v => v.validation?.status === 'approved').length;
    const attention = validations.filter(v => v.validation?.status === 'attention').length;
    const critical = validations.filter(v => v.validation?.status === 'critical').length;
    const avgScore = Math.round(
      validations.reduce((sum, v) => sum + (v.validation?.score || 0), 0) / total
    );

    return { total, approved, attention, critical, avgScore };
  };

  const stats = validations ? getStatsFromValidations(validations) : null;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={() => window.location.href = '/'}
            data-testid="button-back-home"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Início
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground mt-1">
              Analise e exporte relatórios das suas validações
            </p>
          </div>
        </div>
        <Button 
          onClick={handleExportAll}
          disabled={!validations || validations.length === 0}
          data-testid="button-export-all-reports"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Tudo
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card data-testid="card-total-validations">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total de Validações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-approved">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-attention">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Eye className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.attention}</p>
                  <p className="text-xs text-muted-foreground">Atenção</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-average-score">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgScore}</p>
                  <p className="text-xs text-muted-foreground">Score Médio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analysis Type Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-muted-foreground">Filtrar por tipo:</span>
            <div className="flex items-center space-x-2">
              <Button
                variant={analysisType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisType('all')}
                data-testid="filter-all"
              >
                Todos
              </Button>
              <Button
                variant={analysisType === 'quick' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisType('quick')}
                data-testid="filter-quick"
              >
                <Zap className="w-4 h-4 mr-1" />
                Análise Rápida
              </Button>
              <Button
                variant={analysisType === 'complete' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnalysisType('complete')}
                data-testid="filter-complete"
              >
                <Clock className="w-4 h-4 mr-1" />
                Análise Completa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <HistoryFilters onFiltersChange={setFilters} />

      {/* Reports Table */}
      <Card data-testid="reports-table">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Relatórios Disponíveis</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Empresa
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Tipo
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    CNPJ
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Score
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {validations && validations.length > 0 ? (
                  validations
                    .filter((item: any) => {
                      if (analysisType === 'all') return true;
                      const isQuick = isQuickAnalysis(item);
                      return analysisType === 'quick' ? isQuick : !isQuick;
                    })
                    .map((item: any, index: number) => {
                      const isQuick = isQuickAnalysis(item);
                      return (
                    <tr 
                      key={item.validation.id} 
                      className="hover:bg-muted/50 transition-colors"
                      data-testid={`report-row-${index}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.validation.status === 'approved' ? 'bg-primary/10' :
                            item.validation.status === 'attention' ? 'bg-warning/10' :
                            'bg-destructive/10'
                          }`}>
                            <Building className={`w-4 h-4 ${
                              item.validation.status === 'approved' ? 'text-primary' :
                              item.validation.status === 'attention' ? 'text-warning' :
                              'text-destructive'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {item.supplier?.companyName || 'Nome não disponível'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getCnaeDescription(item.supplier?.cnaeCode)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {isQuick ? (
                            <div className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                              <Zap className="w-3 h-3" />
                              <span className="text-xs font-medium">Rápida</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 bg-green-50 text-green-700 px-2 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs font-medium">Completa</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm text-foreground">
                          {item.supplier?.cnpj || '00.000.000/0000-00'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold text-foreground">
                            {item.validation.score}
                          </span>
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-2 rounded-full ${
                                item.validation.score >= 80 ? 'bg-success' :
                                item.validation.score >= 50 ? 'bg-warning' :
                                'bg-destructive'
                              }`}
                              style={{ width: `${item.validation.score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={item.validation.status} size="sm" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {new Date(item.validation.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(item.validation.id, isQuick)}
                            data-testid={`button-view-detail-${index}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportSingle(item.validation.id, item.supplier?.companyName)}
                            data-testid={`button-export-${index}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">Nenhuma validação encontrada</p>
                      <p className="text-sm text-muted-foreground">
                        Execute algumas validações para gerar relatórios
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}