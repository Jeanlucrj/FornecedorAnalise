import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface HistoryFiltersProps {
  onFiltersChange?: (filters: any) => void;
}

export default function HistoryFilters({ onFiltersChange }: HistoryFiltersProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState("");

  const handleSearch = () => {
    const filters = {
      search: search.trim() || undefined,
      status: status && status !== "all" ? status : undefined,
      dateFrom: getDateFromPeriod(period),
      dateTo: new Date().toISOString(),
    };
    
    onFiltersChange?.(filters);
  };

  const getDateFromPeriod = (period: string) => {
    if (!period || period === "all") return undefined;
    
    const now = new Date();
    switch (period) {
      case '30':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '60':
        return new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
      case '90':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '365':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return undefined;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="mb-6" data-testid="history-filters">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
              Buscar
            </Label>
            <Input
              id="search"
              type="text"
              placeholder="CNPJ ou Razão Social"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={handleKeyPress}
              data-testid="input-search"
            />
          </div>
          
          <div>
            <Label htmlFor="status" className="block text-sm font-medium text-foreground mb-2">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="Todos os Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="attention">Atenção</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="period" className="block text-sm font-medium text-foreground mb-2">
              Período
            </Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger data-testid="select-period">
                <SelectValue placeholder="Todos os períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button 
              onClick={handleSearch}
              className="w-full"
              data-testid="button-filter"
            >
              <Search className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
