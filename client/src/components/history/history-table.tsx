import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/hooks/use-toast";
import { downloadPDF } from "@/lib/pdfExport";
import { Building, Eye, Download, RefreshCw } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

interface HistoryTableProps {
  filters?: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export default function HistoryTable({ filters = {} }: HistoryTableProps) {
  const [page, setPage] = useState(1);
  const { toast } = useToast();
  const limit = 10;

  const { data: validations, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: ["/api/validations", { page, limit, ...filters }],
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
      window.location.href = "/";
    }, 500);
  }

  const handleExportPDF = async (validationId: string, companyName: string) => {
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

  const handleRefreshValidation = (validationId: string) => {
    toast({
      title: "Atualização Iniciada",
      description: "Uma nova validação será realizada para este fornecedor.",
    });
    // In a real implementation, this would trigger a new validation
  };

  const handleViewReport = (validationId: string) => {
    // Navigate to detailed validation view
    window.location.href = `/validation/${validationId}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  {['Empresa', 'CNPJ', 'Score', 'Status', 'Data', 'Ações'].map((header) => (
                    <th key={header} className="text-left p-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-6" />
                        <Skeleton className="h-6 w-6" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="history-table">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Validações Realizadas
          </CardTitle>
          <Button variant="secondary" size="sm" data-testid="button-export-all">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
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
                validations.map((item: any, index: number) => (
                  <tr
                    key={item.validation.id}
                    className="hover:bg-muted/50 transition-colors"
                    data-testid={`validation-row-${index}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.validation.status === 'approved' ? 'bg-primary/10' :
                            item.validation.status === 'attention' ? 'bg-warning/10' :
                              'bg-destructive/10'
                          }`}>
                          <Building className={`w-4 h-4 ${item.validation.status === 'approved' ? 'text-primary' :
                              item.validation.status === 'attention' ? 'text-warning' :
                                'text-destructive'
                            }`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {item.supplier?.companyName || 'Nome não disponível'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.validation.category || 'Geral'}
                          </p>
                        </div>
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
                            className={`h-2 rounded-full ${item.validation.score >= 80 ? 'bg-success' :
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
                      <span className="text-sm text-foreground">
                        {new Date(item.validation.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewReport(item.validation.id)}
                          data-testid={`button-view-${index}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportPDF(item.validation.id, item.supplier?.companyName)}
                          data-testid={`button-download-${index}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefreshValidation(item.validation.id)}
                          data-testid={`button-refresh-${index}`}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma validação encontrada</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {validations && validations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * limit) + 1}-{Math.min(page * limit, validations.length)} de resultados
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  data-testid="button-previous-page"
                >
                  Anterior
                </Button>
                <span className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
                  {page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={validations.length < limit}
                  onClick={() => setPage(page + 1)}
                  data-testid="button-next-page"
                >
                  Próximo
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
