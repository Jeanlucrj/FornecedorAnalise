import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLocation } from "wouter";

export default function RecentValidations() {
  const [, setLocation] = useLocation();

  const { data: validations, isLoading } = useQuery({
    queryKey: ["/api/dashboard/recent"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-recent-validations">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground">
            Validações Recentes
          </CardTitle>
          <Button
            variant="link"
            size="sm"
            onClick={() => setLocation("/history")}
            data-testid="link-view-all-validations"
          >
            Ver todas
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {validations && (validations as any[]).length > 0 ? (
            (validations as any[]).map((item: any, index: number) => (
              <div
                key={item.validation.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                data-testid={`validation-item-${index}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building className={`w-5 h-5 ${item.validation.status === 'approved' ? 'text-primary' :
                        item.validation.status === 'attention' ? 'text-warning' :
                          'text-destructive'
                      }`} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground" data-testid={`company-name-${index}`}>
                      {item.supplier?.companyName || 'Nome não disponível'}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`company-cnpj-${index}`}>
                      {item.supplier?.cnpj || '00.000.000/0000-00'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={item.validation.status} />
                  <p className="text-xs text-muted-foreground mt-1" data-testid={`score-${index}`}>
                    Score: {item.validation.score}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma validação realizada ainda</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setLocation("/validate")}
                data-testid="button-first-validation"
              >
                Fazer primeira validação
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
