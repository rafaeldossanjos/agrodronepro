import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Droplet, 
  MapPin, 
  Clock,
  Calculator,
  Map,
  FileText,
  Package,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApplications } from "@/hooks/useApplications";
import { useProperties } from "@/hooks/useProperties";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMemo, useState, useCallback } from "react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import { format, subDays, eachWeekOfInterval, endOfWeek, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { SmartNotifications } from "@/components/SmartNotifications";
import { ApplicationDialog } from "@/components/ApplicationDialog";

type PeriodFilter = 1 | 7 | 15 | 30 | 'month' | 'all';

export default function Dashboard() {
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const isMobile = useIsMobile();
  const { applications, isLoading: loadingApps, refetch: refetchApps, createApplication } = useApplications();
  const { properties, refetch: refetchProps } = useProperties();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchApps(), refetchProps()]);
  }, [refetchApps, refetchProps]);

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

  const handlePropertyChange = (propertyId: string) => {
    setSelectedProperty(propertyId);
  };

  const filteredApps = useMemo(() => {
    const now = new Date();
    let apps = selectedProperty === 'all' 
      ? applications 
      : applications.filter(app => app.property_id === selectedProperty);

    if (periodFilter === 'all') {
      return apps;
    } else if (periodFilter === 'month' && selectedMonth !== '') {
      const [year, month] = selectedMonth.split('-').map(Number);
      return apps.filter(app => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate.getFullYear() === year && appDate.getMonth() + 1 === month;
      });
    } else {
      const days = periodFilter === 'month' ? 30 : periodFilter;
      const periodStart = subDays(now, days);
      return apps.filter(app => {
        const appDate = new Date(app.application_date + 'T00:00:00');
        return appDate >= periodStart && appDate <= now;
      });
    }
  }, [applications, periodFilter, selectedMonth, selectedProperty]);

  const stats = useMemo(() => {
    const concluidas = filteredApps.filter(app => app.status === 'concluída');
    const totalAreaPeriod = concluidas.reduce((sum, app) => sum + Number(app.area_applied), 0);
    const areaEmAndamento = filteredApps
      .filter(app => app.status === 'em_andamento')
      .reduce((sum, app) => sum + Number(app.area_applied), 0);
    const areaPlanejada = filteredApps
      .filter(app => app.status === 'planejada')
      .reduce((sum, app) => sum + Number(app.area_applied), 0);

    return {
      items: [
        { label: "Área aplicada", value: `${totalAreaPeriod.toFixed(1)} ha`, icon: MapPin, color: "text-primary" },
        { label: "Aplicações feitas", value: concluidas.length.toString(), icon: Droplet, color: "text-success" },
        { label: "Em andamento", value: `${areaEmAndamento.toFixed(1)} ha`, icon: Clock, color: "text-blue-500" },
        { label: "Programadas", value: `${areaPlanejada.toFixed(1)} ha`, icon: TrendingUp, color: "text-warning" },
      ]
    };
  }, [filteredApps]);

  const chartData = useMemo(() => {
    const concluidas = filteredApps.filter(app => app.status === 'concluída');
    if (concluidas.length === 0) return [];

    const dates = concluidas.map(a => new Date(a.application_date + 'T00:00:00'));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const diffDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 60) {
      const monthMap: Record<string, { area: number; cost: number; count: number }> = {};
      concluidas.forEach(app => {
        const d = new Date(app.application_date + 'T00:00:00');
        const key = format(d, "MMM/yy", { locale: ptBR });
        if (!monthMap[key]) monthMap[key] = { area: 0, cost: 0, count: 0 };
        monthMap[key].area += Number(app.area_applied);
        monthMap[key].cost += Number(app.total_cost);
        monthMap[key].count += 1;
      });
      return Object.entries(monthMap).map(([name, data]) => ({
        name,
        area: Number(data.area.toFixed(1)),
        custo: Number(data.cost.toFixed(2)),
        aplicacoes: data.count,
      }));
    } else {
      const weeks = eachWeekOfInterval({ start: minDate, end: maxDate }, { weekStartsOn: 1 });
      return weeks.map(weekStart => {
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekApps = concluidas.filter(app => {
          const d = new Date(app.application_date + 'T00:00:00');
          return d >= weekStart && d <= wEnd;
        });
        const area = weekApps.reduce((s, a) => s + Number(a.area_applied), 0);
        const cost = weekApps.reduce((s, a) => s + Number(a.total_cost), 0);
        return {
          name: format(weekStart, "dd/MM", { locale: ptBR }),
          area: Number(area.toFixed(1)),
          custo: Number(cost.toFixed(2)),
          aplicacoes: weekApps.length,
        };
      });
    }
  }, [filteredApps]);

  const pieData = useMemo(() => {
    const concluidas = filteredApps.filter(app => app.status === 'concluída');
    const typeMap: Record<string, number> = {};
    concluidas.forEach(app => {
      const type = app.application_type || 'outro';
      typeMap[type] = (typeMap[type] || 0) + Number(app.area_applied);
    });
    const labels: Record<string, string> = {
      'pulverização': 'Pulverização',
      'adubação': 'Adubação',
      'semeadura': 'Semeadura',
      'outro': 'Outro',
    };
    return Object.entries(typeMap).map(([type, area]) => ({
      name: labels[type] || type,
      value: Number(area.toFixed(1)),
    }));
  }, [filteredApps]);

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(142, 76%, 36%)', 'hsl(var(--warning))'];

  const recentApplications = useMemo(() => {
    const apps = selectedProperty === 'all' 
      ? applications 
      : applications.filter(app => app.property_id === selectedProperty);
    
    return apps
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime())
      .slice(0, 5)
      .map(app => {
        const date = new Date(app.application_date + 'T00:00:00');
        let dateLabel = format(date, "dd/MM", { locale: ptBR });
        if (isToday(date)) dateLabel = "Hoje";
        else if (isYesterday(date)) dateLabel = "Ontem";

        return {
          id: app.id,
          name: app.name || 'Aplicação',
          plotName: app.plot_name || 'Sem talhão',
          area: `${Number(app.area_applied).toFixed(1)} ha`,
          status: app.status,
          dateLabel,
          property: app.properties?.name || '',
        };
      });
  }, [applications, selectedProperty]);

  const pendingCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'planejada' || app.status === 'em_andamento'
    ).length;
  }, [applications]);

  const todayApps = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return applications.filter(app => app.application_date === today);
  }, [applications]);

  if (loadingApps) return <DashboardSkeleton />;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4">
      <OnboardingWizard />
      <SmartNotifications />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-lg text-muted-foreground">Visão geral das operações</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg" className="gap-2 text-base h-12 px-5">
          <Plus className="h-5 w-5" />
          Nova
        </Button>
      </div>

      {/* Pendentes em destaque */}
      {pendingCount > 0 && (
        <button
          onClick={() => navigate('/applications')}
          className="flex w-full items-center justify-between rounded-xl bg-warning/10 px-5 py-4 text-warning text-base"
        >
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6" />
            <span className="font-medium">{pendingCount} aplicação{pendingCount > 1 ? 'ões' : ''} pendente{pendingCount > 1 ? 's' : ''}</span>
          </div>
          <span className="text-base">Ver →</span>
        </button>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={periodFilter === 'all' ? "default" : "outline"}
          size="lg"
          onClick={() => handlePeriodChange('all')}
          className="text-base h-11"
        >
          Todos
        </Button>
        {[
          { value: 7, label: '7 dias' },
          { value: 15, label: '15 dias' },
          { value: 30, label: '30 dias' },
        ].map(({ value, label }) => (
          <Button
            key={value}
            variant={periodFilter === value ? "default" : "outline"}
            size="lg"
            onClick={() => handlePeriodChange(value as PeriodFilter)}
            className="text-base h-11"
          >
            {label}
          </Button>
        ))}
        
        <Select value={selectedMonth || undefined} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-11 w-auto min-w-[130px] text-base">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month} className="text-base capitalize">
                {getMonthLabel(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedProperty} onValueChange={handlePropertyChange}>
          <SelectTrigger className="h-11 w-auto min-w-[160px] text-base">
            <SelectValue placeholder="Fazenda" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-base">Todas</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id} className="text-base">
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.items.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("rounded-lg bg-muted p-2.5", stat.color)}>
                <stat.icon className="h-7 w-7" />
              </div>
              <p className="text-base text-muted-foreground leading-tight">{stat.label}</p>
            </div>
            <p className="text-4xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Gráfico de Área */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-4 text-xl font-semibold">Área Aplicada (ha)</h2>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="area" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Aplicações Recentes */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Aplicações Recentes</h2>
          <button onClick={() => navigate('/applications')} className="text-base text-primary font-medium">
            Ver todas
          </button>
        </div>
        <div className="space-y-4">
          {recentApplications.length === 0 ? (
            <p className="text-base text-muted-foreground">Nenhuma aplicação registrada.</p>
          ) : (
            recentApplications.map((app) => (
              <div key={app.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-medium">{app.name}</p>
                  <p className="text-base text-muted-foreground">
                    {app.dateLabel} • {app.plotName}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="font-semibold text-xl">{app.area}</p>
                  <span className={cn(
                    "inline-flex rounded-full px-3 py-1 text-sm font-medium mt-1",
                    app.status === 'concluída' ? "bg-success/10 text-success" :
                    app.status === 'em_andamento' ? "bg-blue-500/10 text-blue-600" :
                    app.status === 'planejada' ? "bg-warning/10 text-warning" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {app.status === 'concluída' ? 'Concluída' : 
                     app.status === 'em_andamento' ? 'Andamento' : 
                     app.status === 'planejada' ? 'Planejada' : 'Cancelada'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Ações Rápidas */}
      <Card className="p-5">
        <h2 className="mb-4 text-2xl font-semibold">Ações Rápidas</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Droplet, label: "Aplicação", href: "/applications" },
            { icon: Map, label: "Mapa", href: "/map" },
            { icon: FileText, label: "Relatórios", href: "/reports" },
            { icon: Calculator, label: "Calculadora", href: "/calculator" },
            { icon: Package, label: "Estoque", href: "/stock" },
            { icon: MapPin, label: "Fazendas", href: "/properties" },
          ].map(({ icon: Icon, label, href }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-4 text-center transition-colors hover:border-primary hover:bg-muted"
            >
              <Icon className="h-8 w-8 text-primary" />
              <span className="text-base font-medium">{label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>

    <ApplicationDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      onSave={async (data) => {
        await createApplication(data);
        setDialogOpen(false);
        refetchApps();
      }}
    />
    </PullToRefresh>
  );
}
