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

const stats = [
  {
    label: "Área Aplicada (Mês)",
    value: "450 ha",
    change: "+12%",
    icon: MapPin,
    color: "text-primary",
  },
  {
    label: "Aplicações Realizadas",
    value: "38",
    change: "+8",
    icon: Droplet,
    color: "text-success",
  },
  {
    label: "Horas de Voo",
    value: "127h",
    change: "+15h",
    icon: Clock,
    color: "text-warning",
  },
  {
    label: "Custo Médio/ha",
    value: "R$ 28,50",
    change: "-5%",
    icon: DollarSign,
    color: "text-success",
  },
];

const recentApplications = [
  { property: "Fazenda São João", area: "45 ha", date: "10/11/2024", status: "Concluída" },
  { property: "Sítio Boa Vista", area: "22 ha", date: "09/11/2024", status: "Concluída" },
  { property: "Fazenda Santa Maria", area: "68 ha", date: "08/11/2024", status: "Concluída" },
];

const equipmentStatus = [
  { name: "DJI Agras T40", battery: 85, status: "Operacional", flights: 12 },
  { name: "DJI Agras T30", battery: 92, status: "Operacional", flights: 8 },
  { name: "XAG P100", battery: 45, status: "Manutenção", flights: 15 },
];

export default function Dashboard() {
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
            <button className="text-sm font-medium text-primary hover:underline">
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            {recentApplications.map((app, index) => (
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
            ))}
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
          <button className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted">
            <Droplet className="h-8 w-8 text-primary" />
            <span className="font-medium text-foreground">Nova Aplicação</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted">
            <Calculator className="h-8 w-8 text-primary" />
            <span className="font-medium text-foreground">Calcular Calda</span>
          </button>
          <button className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted">
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
