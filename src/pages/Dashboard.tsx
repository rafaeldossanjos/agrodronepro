import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  Droplet, 
  MapPin, 
  Battery, 
  Clock,
  DollarSign,
  Calculator
} from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { useProperties } from "@/hooks/useProperties";
import { useFlightPlanning } from "@/hooks/useFlightPlanning";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const equipmentStatus = [
  { name: "DJI Agras T40", battery: 85, status: "Operacional", flights: 12 },
  { name: "DJI Agras T30", battery: 92, status: "Operacional", flights: 8 },
  { name: "XAG P100", battery: 45, status: "Manutenção", flights: 15 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { applications, isLoading: loadingApps } = useApplications();
  const { properties } = useProperties();
  const { plans } = useFlightPlanning();

  // Calcular estatísticas reais
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtrar aplicações do mês atual
    const thisMonthApps = applications.filter(app => {
      const appDate = new Date(app.application_date);
      return appDate.getMonth() === currentMonth && appDate.getFullYear() === currentYear;
    });

    const lastMonthApps = applications.filter(app => {
      const appDate = new Date(app.application_date);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return appDate.getMonth() === lastMonth && appDate.getFullYear() === lastMonthYear;
    });

    // Área aplicada no mês
    const totalAreaThisMonth = thisMonthApps.reduce((sum, app) => sum + Number(app.area_applied), 0);
    const totalAreaLastMonth = lastMonthApps.reduce((sum, app) => sum + Number(app.area_applied), 0);
    const areaChange = totalAreaLastMonth > 0 
      ? ((totalAreaThisMonth - totalAreaLastMonth) / totalAreaLastMonth * 100).toFixed(0)
      : "0";

    // Aplicações realizadas
    const appsChange = thisMonthApps.length - lastMonthApps.length;

    // Horas de voo
    const totalFlightTimeThisMonth = thisMonthApps.reduce((sum, app) => 
      sum + (app.flight_time_minutes || 0), 0
    );
    const totalFlightTimeLastMonth = lastMonthApps.reduce((sum, app) => 
      sum + (app.flight_time_minutes || 0), 0
    );
    const flightTimeDiff = totalFlightTimeThisMonth - totalFlightTimeLastMonth;

    // Custo médio por hectare
    const totalCost = thisMonthApps.reduce((sum, app) => sum + Number(app.total_cost), 0);
    const avgCostPerHa = totalAreaThisMonth > 0 ? totalCost / totalAreaThisMonth : 0;
    
    const lastMonthTotalCost = lastMonthApps.reduce((sum, app) => sum + Number(app.total_cost), 0);
    const lastMonthAvgCost = totalAreaLastMonth > 0 ? lastMonthTotalCost / totalAreaLastMonth : 0;
    const costChange = lastMonthAvgCost > 0
      ? ((avgCostPerHa - lastMonthAvgCost) / lastMonthAvgCost * 100).toFixed(0)
      : "0";

    return [
      {
        label: "Área Aplicada (Mês)",
        value: `${totalAreaThisMonth.toFixed(1)} ha`,
        change: `${Number(areaChange) > 0 ? '+' : ''}${areaChange}%`,
        icon: MapPin,
        color: "text-primary",
      },
      {
        label: "Aplicações Realizadas",
        value: thisMonthApps.length.toString(),
        change: `${appsChange > 0 ? '+' : ''}${appsChange}`,
        icon: Droplet,
        color: "text-success",
      },
      {
        label: "Horas de Voo",
        value: `${Math.floor(totalFlightTimeThisMonth / 60)}h`,
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
  }, [applications]);

  // Buscar aplicações recentes
  const recentApplications = useMemo(() => {
    return applications
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime())
      .slice(0, 3)
      .map(app => {
        const property = properties.find(p => p.id === app.property_id);
        return {
          property: property?.name || 'Propriedade',
          area: `${Number(app.area_applied).toFixed(1)} ha`,
          date: format(new Date(app.application_date), 'dd/MM/yyyy', { locale: ptBR }),
          status: app.status === 'concluida' ? 'Concluída' : app.status === 'em_andamento' ? 'Em Andamento' : 'Planejada',
        };
      });
  }, [applications, properties]);
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas operações com drone
        </p>
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
                <div>
                  <p className="font-medium text-foreground">{app.property}</p>
                  <p className="text-sm text-muted-foreground">{app.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{app.area}</p>
                  <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                    {app.status}
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
            <button className="text-sm font-medium text-primary hover:underline">
              Gerenciar
            </button>
          </div>
          <div className="space-y-4">
            {equipmentStatus.map((equipment, index) => (
              <div
                key={index}
                className="flex items-center justify-between border-b border-border pb-3 last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{equipment.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {equipment.flights} voos realizados
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Battery className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {equipment.battery}%
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      equipment.status === "Operacional"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    {equipment.status}
                  </span>
                </div>
              </div>
            ))}
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

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
