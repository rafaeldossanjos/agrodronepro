import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Droplet, 
  MapPin, 
  Clock,
  Cylinder,
  Calculator,
  Users,
  Map,
  FileText,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApplications } from "@/hooks/useApplications";
import { useProperties } from "@/hooks/useProperties";
import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PeriodFilter = 1 | 7 | 15 | 30 | 'month' | 'all';

export default function Dashboard() {
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const { applications, isLoading: loadingApps } = useApplications();
  const { properties } = useProperties();

  // Gerar lista de meses disponíveis baseado nas aplicações
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    (applications || []).forEach((app: any) => {
      const date = new Date(app.application_date + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort().reverse();
  }, [applications]);

  const getMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMM yyyy", { locale: ptBR });
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setPeriodFilter('month');
  };

  const handlePeriodChange = (period: PeriodFilter) => {
    setPeriodFilter(period);
    if (period !== 'month') {
      setSelectedMonth("");
    }
  };

  // Calcular estatísticas reais
  const stats = useMemo(() => {
    const now = new Date();
    let periodApps: typeof applications = [];
    let periodLabel = '';

    if (periodFilter === 'all') {
      // Filtro "Todos" - todas as aplicações concluídas
      periodApps = applications.filter(app => app.status === 'concluída');
      periodLabel = 'Todos';
    } else if (periodFilter === 'month' && selectedMonth !== '') {
      // Filtro por mês específico
      const [year, month] = selectedMonth.split('-').map(Number);
      periodApps = applications.filter(app => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate.getFullYear() === year && appDate.getMonth() + 1 === month && app.status === 'concluída';
      });
      periodLabel = getMonthLabel(selectedMonth);
    } else {
      const days = periodFilter === 'month' ? 30 : periodFilter;
      const periodStart = subDays(now, days);

      // Filtrar apenas aplicações CONCLUÍDAS do período selecionado
      periodApps = applications.filter(app => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate >= periodStart && appDate <= now && app.status === 'concluída';
      });
      periodLabel = `${days}d`;
    }

    // Área aplicada no período
    const totalAreaPeriod = periodApps.reduce((sum, app) => sum + Number(app.area_applied), 0);

    // Área em andamento
    const areaEmAndamento = applications
      .filter(app => app.status === 'em_andamento')
      .reduce((sum, app) => sum + Number(app.area_applied), 0);

    // Área planejada
    const areaPlanejada = applications
      .filter(app => app.status === 'planejada')
      .reduce((sum, app) => sum + Number(app.area_applied), 0);

    return {
      periodLabel,
      items: [
        {
          label: "Área total aplicada",
          value: `${totalAreaPeriod.toFixed(2)} ha`,
          icon: MapPin,
          color: "text-primary",
        },
        {
          label: "Aplicações realizadas",
          value: periodApps.length.toString(),
          icon: Droplet,
          color: "text-success",
        },
        {
          label: "Aplicação em andamento",
          value: `${areaEmAndamento.toFixed(2)} ha`,
          icon: Clock,
          color: "text-blue-500",
        },
        {
          label: "Áreas programadas",
          value: `${areaPlanejada.toFixed(2)} ha`,
          icon: TrendingUp,
          color: "text-warning",
        },
      ]
    };
  }, [applications, periodFilter, selectedMonth]);

  // Buscar aplicações recentes
  const recentApplications = useMemo(() => {
    return applications
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime())
      .slice(0, 3)
      .map(app => {
        return {
          name: app.name || 'Aplicação',
          plotName: app.plot_name || '-',
          area: `${Number(app.area_applied)} ha`,
          status: app.status,
        };
      });
  }, [applications]);

  // Contar aplicações pendentes
  const pendingCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'planejada' || app.status === 'em_andamento'
    ).length;
  }, [applications]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-base sm:text-lg text-muted-foreground">
            Visão geral das operações
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={() => navigate('/applications')}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-warning/10 text-warning text-base sm:text-lg font-medium hover:bg-warning/20 transition-colors"
          >
            <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filtros de Período */}
      <div className="flex gap-2 flex-wrap items-center">
        <Button
          variant={periodFilter === 'all' ? "default" : "outline"}
          size="lg"
          onClick={() => handlePeriodChange('all' as PeriodFilter)}
          className="h-12 px-5 text-base sm:text-lg"
        >
          Todos
        </Button>
        {[
          { value: 7, label: '7d' },
          { value: 15, label: '15d' },
          { value: 30, label: '30d' },
        ].map(({ value, label }) => (
          <Button
            key={value}
            variant={periodFilter === value ? "default" : "outline"}
            size="lg"
            onClick={() => handlePeriodChange(value as PeriodFilter)}
            className="h-12 px-5 text-base sm:text-lg"
          >
            {label}
          </Button>
        ))}
        
        <span className="text-base sm:text-lg text-muted-foreground mx-2">ou</span>
        
        <Select value={selectedMonth || undefined} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-12 w-[280px] text-base sm:text-lg">
            <SelectValue placeholder="Selecionar mês" />
          </SelectTrigger>
          <SelectContent className="bg-popover max-h-[200px]">
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month} className="capitalize text-base sm:text-lg">
                {getMonthLabel(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        {stats.items.map((stat) => (
          <Card key={stat.label} className="p-5 sm:p-8 flex flex-col items-center">
            <div className={cn("p-4 sm:p-5 rounded-xl bg-muted", stat.color)}>
              <stat.icon className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
            <div className="mt-4 text-center">
              <p className="text-3xl sm:text-4xl font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-base sm:text-lg text-muted-foreground mt-2">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Applications */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            Aplicações Recentes
          </h2>
          <button 
            onClick={() => navigate('/applications')}
            className="text-base sm:text-lg font-medium text-primary hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div className="space-y-4">
          {loadingApps ? (
            <p className="text-base sm:text-lg text-muted-foreground">Carregando...</p>
          ) : recentApplications.length === 0 ? (
            <p className="text-base sm:text-lg text-muted-foreground">Nenhuma aplicação registrada.</p>
          ) : (
            recentApplications.map((app, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-lg sm:text-xl font-medium text-foreground truncate">{app.name}</p>
                <p className="text-base sm:text-lg text-muted-foreground">{app.plotName}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-lg sm:text-xl font-semibold text-foreground">{app.area}</p>
                <span className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm sm:text-base font-medium",
                  app.status === 'concluída' ? "bg-success/10 text-success" :
                  app.status === 'em_andamento' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                  app.status === 'planejada' ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                )}>
                  {app.status === 'concluída' ? 'OK' : 
                   app.status === 'em_andamento' ? 'Andamento' : 
                   app.status === 'planejada' ? 'Planejada' : 'Cancelada'}
                </span>
              </div>
            </div>
            ))
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-8">
        <h2 className="mb-6 text-3xl font-semibold text-foreground">
          Ações Rápidas
        </h2>
        <div className="grid grid-cols-3 gap-6">
          <button 
            onClick={() => navigate('/applications')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <Droplet className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Aplicação</span>
          </button>
          <button 
            onClick={() => navigate('/calculator')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <Calculator className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Calculadora</span>
          </button>
          <button 
            onClick={() => navigate('/map')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <Map className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Mapa</span>
          </button>
          <button 
            onClick={() => navigate('/team')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <Users className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Equipe</span>
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <TrendingUp className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Relatórios</span>
          </button>
          <button 
            onClick={() => navigate('/properties')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <MapPin className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Propriedades</span>
          </button>
          <button 
            onClick={() => navigate('/products')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <Cylinder className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Produtos</span>
          </button>
          <button 
            onClick={() => navigate('/recipes')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <FileText className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Receituários</span>
          </button>
          <button 
            onClick={() => navigate('/stock')}
            className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 transition-colors hover:border-primary hover:bg-muted"
          >
            <Package className="h-16 w-16 text-primary" />
            <span className="text-xl font-medium text-foreground">Estoque</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
