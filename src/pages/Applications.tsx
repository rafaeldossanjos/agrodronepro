import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar } from "lucide-react";

const applications = [
  {
    id: 1,
    property: "Fazenda São João",
    date: "10/11/2024",
    area: 45,
    products: ["Herbicida X", "Adjuvante Y"],
    cost: 1282.5,
    status: "completed",
  },
  {
    id: 2,
    property: "Sítio Boa Vista",
    date: "09/11/2024",
    area: 22,
    products: ["Fungicida A"],
    cost: 627.0,
    status: "completed",
  },
  {
    id: 3,
    property: "Fazenda Santa Maria",
    date: "08/11/2024",
    area: 68,
    products: ["Inseticida B", "Espalhante"],
    cost: 1938.0,
    status: "completed",
  },
  {
    id: 4,
    property: "Fazenda São João",
    date: "15/11/2024",
    area: 55,
    products: ["Herbicida X"],
    cost: 0,
    status: "scheduled",
  },
];

const statusConfig = {
  completed: { label: "Concluída", variant: "default" as const },
  scheduled: { label: "Agendada", variant: "secondary" as const },
  inProgress: { label: "Em Andamento", variant: "outline" as const },
};

export default function Applications() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Histórico de Aplicações
          </h1>
          <p className="text-muted-foreground">
            Registros de todas as pulverizações realizadas
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Aplicação
        </Button>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {applications.map((app) => (
          <Card key={app.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    {app.property}
                  </h3>
                  <Badge variant={statusConfig[app.status].variant}>
                    {statusConfig[app.status].label}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <Calendar className="h-4 w-4" />
                      {app.date}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Área</p>
                    <p className="font-medium text-foreground">{app.area} ha</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos</p>
                    <p className="font-medium text-foreground">
                      {app.products.length} itens
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo</p>
                    <p className="font-medium text-foreground">
                      {app.status === "completed"
                        ? `R$ ${app.cost.toFixed(2)}`
                        : "A calcular"}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm text-muted-foreground">
                    Produtos aplicados:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {app.products.map((product, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button variant="outline" size="sm">
                Ver Detalhes
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
