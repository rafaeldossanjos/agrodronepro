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
import { useMemo, useState, useCallback } from "react";
import { PullToRefresh } from "@/components/PullToRefresh";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import { format, subDays, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

type PeriodFilter = 1 | 7 | 15 | 30 | 'month' | 'all';

export default function Dashboard() {
  const navigate = useNavigate();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const { applications, isLoading: loadingApps, refetch: refetchApps } = useApplications();
  const { properties, refetch: refetchProps } = useProperties();

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

  // Filtrar aplicações por propriedade e período
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
        { label: "Área total aplicada", value: `${totalAreaPeriod.toFixed(2)} ha`, icon: MapPin, color: "text-primary" },
        { label: "Aplicações realizadas", value: concluidas.length.toString(), icon: Droplet, color: "text-success" },
        { label: "Aplicação em andamento", value: `${areaEmAndamento.toFixed(2)} ha`, icon: Clock, color: "text-blue-500" },
        { label: "Áreas programadas", value: `${areaPlanejada.toFixed(2)} ha`, icon: TrendingUp, color: "text-warning" },
      ]
    };
  }, [filteredApps]);

  // Dados para gráfico de barras - área aplicada por semana/mês
  const chartData = useMemo(() => {
    const concluidas = filteredApps.filter(app => app.status === 'concluída');
    if (concluidas.length === 0) return [];

    const dates = concluidas.map(a => new Date(a.application_date + 'T00:00:00'));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Se range > 60 dias, agrupar por mês; senão por semana
    const diffDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (diffDays > 60) {
      // Agrupar por mês
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
        area: Number(data.area.toFixed(2)),
        custo: Number(data.cost.toFixed(2)),
        aplicacoes: data.count,
      }));
    } else {
      // Agrupar por semana
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
          area: Number(area.toFixed(2)),
          custo: Number(cost.toFixed(2)),
          aplicacoes: weekApps.length,
        };
      });
    }
  }, [filteredApps]);

  // Dados para gráfico de pizza - distribuição por tipo
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
      value: Number(area.toFixed(2)),
    }));
  }, [filteredApps]);

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(142, 76%, 36%)', 'hsl(var(--warning))'];

  const recentApplications = useMemo(() => {
    const apps = selectedProperty === 'all' 
      ? applications 
      : applications.filter(app => app.property_id === selectedProperty);
    
    return apps
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime())
      .slice(0, 3)
      .map(app => ({
        name: app.name || 'Aplicação',
        plotName: app.plot_name || '-',
        area: `${Number(app.area_applied)} ha`,
        status: app.status,
      }));
  }, [applications, selectedProperty]);

  const pendingCount = useMemo(() => {
    return applications.filter(app => 
      app.status === 'planejada' || app.status === 'em_andamento'
    ).length;
  }, [applications]);

  if (loadingApps) return <DashboardSkeleton />;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground">Dashboard</h1>
          <p className="text-xl sm:text-2xl text-muted-foreground">
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
      <div className="flex gap-3 flex-wrap items-center">
        <Button
          variant={periodFilter === 'all' ? "default" : "outline"}
          size="lg"
          onClick={() => handlePeriodChange('all' as PeriodFilter)}
          className="h-14 px-5 text-lg sm:text-xl rounded-xl"
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
            className="h-14 px-5 text-lg sm:text-xl rounded-xl"
          >
            {label}
          </Button>
        ))}
        
        <Select value={selectedMonth || undefined} onValueChange={handleMonthChange}>
          <SelectTrigger className="h-14 w-auto min-w-[140px] text-lg sm:text-xl rounded-xl px-4">
            <SelectValue placeholder="Selecionar mês" />
          </SelectTrigger>
          <SelectContent className="bg-popover max-h-[280px]">
            {availableMonths.map((month) => (
              <SelectItem key={month} value={month} className="capitalize text-lg sm:text-xl py-3">
                {getMonthLabel(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedProperty} onValueChange={handlePropertyChange}>
          <SelectTrigger className="h-14 w-auto min-w-[180px] text-lg sm:text-xl rounded-xl px-4">
            <SelectValue placeholder="Selecionar fazenda" />
          </SelectTrigger>
          <SelectContent className="bg-popover max-h-[280px]">
            <SelectItem value="all" className="text-lg sm:text-xl py-3">Todas as fazendas</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id} className="text-lg sm:text-xl py-3">
                {property.name}
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

      {/* Gráficos */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico de barras - Área aplicada */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
              Área Aplicada (ha)
            </h2>
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'area') return [`${value} ha`, 'Área'];
                      if (name === 'custo') return [`R$ ${value.toFixed(2)}`, 'Custo'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="area" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Gráfico de pizza - Distribuição por tipo */}
          <Card className="p-5 sm:p-6">
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
              Distribuição por Tipo
            </h2>
            <div className="h-[250px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}ha`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value: number) => [`${value} ha`, 'Área']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Applications */}
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">
            Aplicações Recentes
          </h2>
          <button 
            onClick={() => navigate('/applications')}
            className="text-lg sm:text-xl font-medium text-primary hover:underline"
          >
            Ver todas
          </button>
        </div>
        <div className="space-y-4">
          {recentApplications.length === 0 ? (
            <p className="text-lg sm:text-xl text-muted-foreground">Nenhuma aplicação registrada.</p>
          ) : (
            recentApplications.map((app, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xl sm:text-2xl font-medium text-foreground truncate">{app.name}</p>
                <p className="text-lg sm:text-xl text-muted-foreground">{app.plotName}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-xl sm:text-2xl font-semibold text-foreground">{app.area}</p>
                <span className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-base sm:text-lg font-medium",
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { icon: Droplet, label: "Aplicação", href: "/applications" },
            { icon: Calculator, label: "Calculadora", href: "/calculator" },
            { icon: Map, label: "Mapa", href: "/map" },
            { icon: Users, label: "Equipe", href: "/team" },
            { icon: TrendingUp, label: "Relatórios", href: "/reports" },
            { icon: MapPin, label: "Propriedades", href: "/properties" },
            { icon: Cylinder, label: "Produtos", href: "/products" },
            { icon: FileText, label: "Receituários", href: "/recipes" },
            { icon: Package, label: "Estoque", href: "/stock" },
          ].map(({ icon: Icon, label, href }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="flex flex-col items-center gap-3 sm:gap-4 rounded-xl border border-dashed border-border p-5 sm:p-8 transition-colors hover:border-primary hover:bg-muted"
            >
              <Icon className="h-10 w-10 sm:h-16 sm:w-16 text-primary" />
              <span className="text-base sm:text-xl font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
    </PullToRefresh>
  );
}
