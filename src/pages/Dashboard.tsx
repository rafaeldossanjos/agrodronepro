import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Droplet, 
  MapPin, 
  Battery, 
  Clock,
  DollarSign,
  Calculator
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApplications } from "@/hooks/useApplications";
import { useProperties } from "@/hooks/useProperties";
import { useFlightPlanning } from "@/hooks/useFlightPlanning";
import { useEquipment } from "@/hooks/useEquipment";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

type PeriodFilter = 1 | 7 | 15 | 30 | 90;

export default function Dashboard() {
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(30);
  const { applications, isLoading: loadingApps } = useApplications();
  const { properties } = useProperties();
  const { plans } = useFlightPlanning();
  const { equipment } = useEquipment();

  // Calcular estatísticas reais
  const stats = useMemo(() => {
    const now = new Date();
    const periodStart = subDays(now, periodFilter);

    // Filtrar apenas aplicações CONCLUÍDAS do período selecionado
    const periodApps = applications.filter(app => {
      const appDate = new Date(app.application_date + 'T00:00:00');
      return appDate >= periodStart && appDate <= now && app.status === 'concluída';
    });

    // Período anterior para comparação (apenas concluídas)
    const previousPeriodStart = subDays(periodStart, periodFilter);
    const previousPeriodApps = applications.filter(app => {
      const appDate = new Date(app.application_date + 'T00:00:00');
      return appDate >= previousPeriodStart && appDate < periodStart && app.status === 'concluída';
    });

    // Área aplicada no período
    const totalAreaPeriod = periodApps.reduce((sum, app) => sum + Number(app.area_applied), 0);
    const totalAreaPrevious = previousPeriodApps.reduce((sum, app) => sum + Number(app.area_applied), 0);
    const areaChange = totalAreaPrevious > 0 
      ? ((totalAreaPeriod - totalAreaPrevious) / totalAreaPrevious * 100).toFixed(0)
      : "0";

    // Aplicações realizadas
    const appsChange = periodApps.length - previousPeriodApps.length;

    // Horas de voo
    const totalFlightTimePeriod = periodApps.reduce((sum, app) => 
      sum + (app.flight_time_minutes || 0), 0
    );
    const totalFlightTimePrevious = previousPeriodApps.reduce((sum, app) => 
      sum + (app.flight_time_minutes || 0), 0
    );
    const flightTimeDiff = totalFlightTimePeriod - totalFlightTimePrevious;

    // Custo médio por hectare
    const totalCost = periodApps.reduce((sum, app) => sum + Number(app.total_cost), 0);
    const avgCostPerHa = totalAreaPeriod > 0 ? totalCost / totalAreaPeriod : 0;
    
    const previousTotalCost = previousPeriodApps.reduce((sum, app) => sum + Number(app.total_cost), 0);
    const previousAvgCost = totalAreaPrevious > 0 ? previousTotalCost / totalAreaPrevious : 0;
    const costChange = previousAvgCost > 0
      ? ((avgCostPerHa - previousAvgCost) / previousAvgCost * 100).toFixed(0)
      : "0";

    return [
      {
        label: `Área Aplicada (${periodFilter}d)`,
        value: `${totalAreaPeriod.toFixed(1)} ha`,
        change: `${Number(areaChange) > 0 ? '+' : ''}${areaChange}%`,
        icon: MapPin,
        color: "text-primary",
      },
      {
        label: "Aplicações Realizadas",
        value: periodApps.length.toString(),
        change: `${appsChange > 0 ? '+' : ''}${appsChange}`,
        icon: Droplet,
        color: "text-success",
      },
      {
        label: "Horas de Voo",
        value: `${Math.floor(totalFlightTimePeriod / 60)}h`,
        change: `${flightTimeDiff > 0 ? '+' : ''}${Math.floor(flightTimeDiff / 60)}h`,
        icon: Clock,
        color: "text-warning",
      },
      {
        label: "Custo Médio/ha",
        value: `R$ ${avgCostPerHa.toFixed(2)}`,
        change: `${Number(costChange) > 0 ? '+' : ''}${costChange}%`,
        icon: DollarSign,
        color: Number(costChange) < 0 ? "text-success" : "text-warning",
      },
    ];
  }, [applications, periodFilter]);

  // Buscar aplicações recentes
  const recentApplications = useMemo(() => {
    return applications
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime())
      .slice(0, 3)
      .map(app => {
        const property = properties.find(p => p.id === app.property_id);
        return {
          property: property?.name || 'Propriedade',
          plotName: app.plot_name || '-',
          area: `${Number(app.area_applied).toFixed(1)} ha`,
          date: format(new Date(app.application_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
          status: app.status,
        };
      });
  }, [applications, properties]);

  // Contar aplicações pendentes
  const pendingCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'planejada' || app.status === 'em_andamento'
    ).length;
  }, [applications]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visão geral das suas operações com drone
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => navigate('/applications')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium hover:bg-warning/20 transition-colors"
          >
            <Clock className="h-4 w-4" />
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filtros de Período */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={periodFilter === 1 ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter(1)}
        >
          Hoje
        </Button>
        <Button
          variant={periodFilter === 7 ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter(7)}
        >
          7 dias
        </Button>
        <Button
          variant={periodFilter === 15 ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter(15)}
        >
          15 dias
        </Button>
        <Button
          variant={periodFilter === 30 ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter(30)}
        >
          30 dias
        </Button>
        <Button
          variant={periodFilter === 90 ? "default" : "outline"}
          size="sm"
          onClick={() => setPeriodFilter(90)}
        >
          90 dias
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
              <span className="text-sm font-medium text-success">
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Applications */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Aplicações Recentes
            </h2>
            <button 
              onClick={() => navigate('/applications')}
              className="text-sm font-medium text-primary hover:underline"
            >
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            {loadingApps ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : recentApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma aplicação registrada ainda.</p>
            ) : (
              recentApplications.map((app, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{app.property}</p>
                  <p className="text-sm text-muted-foreground">{app.plotName}</p>
                  <p className="text-sm text-muted-foreground">{app.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-foreground">{app.area}</p>
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    app.status === 'concluída' ? "bg-success/10 text-success" :
                    app.status === 'em_andamento' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    app.status === 'planejada' ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {app.status === 'concluída' ? 'Concluída' : 
                     app.status === 'em_andamento' ? 'Em Andamento' : 
                     app.status === 'planejada' ? 'Planejada' : 'Cancelada'}
                  </span>
                </div>
              </div>
              ))
            )}
          </div>
        </Card>

        {/* Equipment Status */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Status dos Equipamentos
            </h2>
            <button 
              onClick={() => navigate('/equipment')}
              className="text-sm font-medium text-primary hover:underline"
            >
              Gerenciar
            </button>
          </div>
          <div className="space-y-4">
            {equipment.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum equipamento cadastrado ainda.</p>
            ) : (
              equipment.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.total_flights} voos realizados
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Battery className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {item.battery_capacity}%
                      </span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                        item.status === "operacional"
                          ? "bg-success/10 text-success"
                          : item.status === "manutencao"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.status === "operacional" ? "Operacional" : item.status === "manutencao" ? "Manutenção" : "Inativo"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Ações Rápidas
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <button 
            onClick={() => navigate('/applications')}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted"
          >
            <Droplet className="h-8 w-8 text-primary" />
            <span className="font-medium text-foreground">Nova Aplicação</span>
          </button>
          <button 
            onClick={() => navigate('/calculator')}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted"
          >
            <Calculator className="h-8 w-8 text-primary" />
            <span className="font-medium text-foreground">Calcular Calda</span>
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted"
          >
            <TrendingUp className="h-8 w-8 text-primary" />
            <span className="font-medium text-foreground">Gerar Relatório</span>
          </button>
        </div>
      </Card>
    </div>
  );
}

