import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Lightbulb } from "lucide-react";

export default function ScoreDistribution() {
  const { data: distribution, isLoading } = useQuery({
    queryKey: ["/api/dashboard/score-distribution"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
            <div className="mt-6">
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const distributionData = [
    {
      label: "Alto (80-100)",
      value: (distribution as any)?.high || 0,
      color: "bg-success",
      dotColor: "bg-success",
    },
    {
      label: "Médio (50-79)",
      value: (distribution as any)?.medium || 0,
      color: "bg-warning",
      dotColor: "bg-warning",
    },
    {
      label: "Baixo (0-49)",
      value: (distribution as any)?.low || 0,
      color: "bg-destructive",
      dotColor: "bg-destructive",
    },
  ];

  return (
    <Card data-testid="card-score-distribution">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Distribuição de Scores
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {distributionData.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 ${item.dotColor} rounded-full`} />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-foreground" data-testid={`distribution-${index}`}>
                  {item.value}%
                </span>
              </div>
              <Progress
                value={item.value}
                className={`h-2 ${item.color}`}
                data-testid={`progress-${index}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Insight</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {(distribution as any)?.high >= 60
              ? "A maioria dos seus fornecedores possui alta confiabilidade. Continue monitorando aqueles com scores mais baixos."
              : (distribution as any)?.medium >= 50
                ? "Seus fornecedores apresentam scores medianos. Considere revisar os critérios de seleção."
                : "Atenção: muitos fornecedores com scores baixos. Recomendamos uma análise mais rigorosa."
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
