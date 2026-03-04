import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Star, AlertTriangle, Search, TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<{
    validated: number;
    averageScore: number;
    alerts: number;
    remaining: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-24 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Fornecedores Validados",
      value: stats?.validated || 0,
      icon: CheckCircle,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      trend: "+12% este mês",
      trendIcon: TrendingUp,
      trendColor: "text-success",
    },
    {
      title: "Score Médio",
      value: stats?.averageScore || 0,
      icon: Star,
      bgColor: "bg-success/10",
      iconColor: "text-success",
      trend: "+5 pontos",
      trendIcon: TrendingUp,
      trendColor: "text-success",
    },
    {
      title: "Alertas Ativos",
      value: stats?.alerts || 0,
      icon: AlertTriangle,
      bgColor: "bg-warning/10",
      iconColor: "text-warning",
      trend: "-2 esta semana",
      trendIcon: TrendingDown,
      trendColor: "text-warning",
    },
    {
      title: "Consultas Restantes",
      value: stats?.remaining || 0,
      icon: Search,
      bgColor: "bg-accent/10",
      iconColor: "text-accent-foreground",
      trend: "Renova em 23 dias",
      trendIcon: null,
      trendColor: "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => (
        <Card key={index} data-testid={`card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid={`stat-${index}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
            <p className={`text-xs mt-2 flex items-center ${stat.trendColor}`}>
              {stat.trendIcon && <stat.trendIcon className="w-3 h-3 mr-1" />}
              {stat.trend}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
