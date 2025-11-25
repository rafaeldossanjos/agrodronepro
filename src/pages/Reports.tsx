import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, DollarSign, Target, Download, Filter } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { useProperties } from "@/hooks/useProperties";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Reports() {
  const { applications } = useApplications();
  const { properties } = useProperties();
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");

  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (selectedProperty !== "all") {
      filtered = filtered.filter((app: any) => app.property_id === selectedProperty);
    }

    const now = new Date();
    const daysAgo = new Date(now.getTime() - Number(selectedPeriod) * 24 * 60 * 60 * 1000);

    filtered = filtered.filter((app: any) => {
      const appDate = new Date(app.application_date);
      return appDate >= daysAgo && appDate <= now;
    });

    return filtered;
  }, [applications, selectedProperty, selectedPeriod]);

  const stats = useMemo(() => {
    const totalArea = filteredApplications.reduce((sum: number, app: any) => sum + app.area_applied, 0);
    const totalCost = filteredApplications.reduce((sum: number, app: any) => sum + app.total_cost, 0);
    const avgCostPerHa = totalArea > 0 ? totalCost / totalArea : 0;
    const completedApps = filteredApplications.filter((app: any) => app.status === "concluída").length;
    const efficiency = filteredApplications.length > 0 ? (completedApps / filteredApplications.length) * 100 : 0;

    return { totalArea, totalCost, avgCostPerHa, efficiency };
  }, [filteredApplications]);

  const propertyStats = useMemo(() => {
    const grouped = filteredApplications.reduce((acc: any, app: any) => {
      const propId = app.property_id;
      if (!acc[propId]) {
        acc[propId] = {
          name: app.properties?.name || "Sem propriedade",
          area: 0,
          apps: 0,
          cost: 0,
        };
      }
      acc[propId].area += app.area_applied;
      acc[propId].apps += 1;
      acc[propId].cost += app.total_cost;
      return acc;
    }, {});

    return Object.values(grouped);
  }, [filteredApplications]);

  const exportToCSV = () => {
    const headers = ["Propriedade", "Data", "Tipo", "Status", "Área (ha)", "Produto", "Quantidade", "Custo (R$)"];
    const rows = filteredApplications.map((app: any) => [
      app.properties?.name || "N/A",
      format(new Date(app.application_date), "dd/MM/yyyy", { locale: ptBR }),
      app.application_type,
      app.status,
      app.area_applied,
      app.products?.name || "N/A",
      app.product_amount,
      app.total_cost.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_aplicacoes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Relatórios e Análises
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visão analítica das suas operações e custos
          </p>
        </div>
        <Button onClick={exportToCSV} className="gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <h2 className="font-semibold">Filtros</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Propriedade</label>
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Propriedades</SelectItem>
                {properties.map((prop: any) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 sm:p-6">
          <div className="mb-2 sm:mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <p className="text-xs sm:text-sm text-muted-foreground">Área Total</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            {stats.totalArea.toFixed(1)} ha
          </p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {filteredApplications.length} aplicações
          </p>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-2 sm:mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
            <p className="text-xs sm:text-sm text-muted-foreground">Custo Total</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            R$ {stats.totalCost.toFixed(2)}
          </p>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-2 sm:mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
            <p className="text-xs sm:text-sm text-muted-foreground">Custo/ha</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            R$ {stats.avgCostPerHa.toFixed(2)}
          </p>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-2 sm:mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
            <p className="text-xs sm:text-sm text-muted-foreground">Eficiência</p>
          </div>
          <p className="text-xl sm:text-3xl font-bold text-foreground">
            {stats.efficiency.toFixed(0)}%
          </p>
        </Card>
      </div>


      {/* Detailed Table */}
      <Card className="p-4 sm:p-6">
        <h2 className="mb-4 text-base sm:text-lg font-semibold text-foreground">
          Resumo por Propriedade
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="pb-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                  Propriedade
                </th>
                <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Área (ha)
                </th>
                <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Aplicações
                </th>
                <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Custo Total
                </th>
                <th className="pb-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">
                  Custo/ha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {propertyStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum dado disponível para o período selecionado
                  </td>
                </tr>
              ) : (
                propertyStats.map((row: any) => (
                  <tr key={row.name}>
                    <td className="py-3 text-xs sm:text-sm font-medium text-foreground">
                      {row.name}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm text-foreground">
                      {row.area.toFixed(1)}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm text-foreground">
                      {row.apps}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm text-foreground">
                      R$ {row.cost.toFixed(2)}
                    </td>
                    <td className="py-3 text-right text-xs sm:text-sm font-medium text-foreground">
                      R$ {(row.cost / row.area).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
