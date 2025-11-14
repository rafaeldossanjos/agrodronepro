import { Card } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Target } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Relatórios e Análises
        </h1>
        <p className="text-muted-foreground">
          Visão analítica das suas operações e custos
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Área Total Aplicada</p>
          </div>
          <p className="text-3xl font-bold text-foreground">1.350 ha</p>
          <p className="mt-1 text-sm text-success">+18% vs mês anterior</p>
        </Card>

        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            <p className="text-sm text-muted-foreground">Custo Total</p>
          </div>
          <p className="text-3xl font-bold text-foreground">R$ 38.475</p>
          <p className="mt-1 text-sm text-success">-5% de redução</p>
        </Card>

        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-warning" />
            <p className="text-sm text-muted-foreground">Custo Médio/ha</p>
          </div>
          <p className="text-3xl font-bold text-foreground">R$ 28,50</p>
          <p className="mt-1 text-sm text-muted-foreground">Últimos 30 dias</p>
        </Card>

        <Card className="p-6">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-secondary" />
            <p className="text-sm text-muted-foreground">Eficiência</p>
          </div>
          <p className="text-3xl font-bold text-foreground">94%</p>
          <p className="mt-1 text-sm text-success">+3% de melhora</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Aplicações por Mês
          </h2>
          <div className="flex h-64 items-end justify-around gap-2">
            {[45, 62, 58, 73, 68, 82].map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center">
                <div
                  className="w-full rounded-t-lg bg-primary transition-all hover:bg-primary/80"
                  style={{ height: `${(value / 82) * 100}%` }}
                />
                <span className="mt-2 text-xs text-muted-foreground">
                  {["Jun", "Jul", "Ago", "Set", "Out", "Nov"][index]}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Custos por Categoria
          </h2>
          <div className="space-y-4">
            {[
              { name: "Herbicidas", value: 42, color: "bg-primary" },
              { name: "Fungicidas", value: 28, color: "bg-success" },
              { name: "Inseticidas", value: 18, color: "bg-warning" },
              { name: "Adjuvantes", value: 12, color: "bg-secondary" },
            ].map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-foreground">{item.name}</span>
                  <span className="font-medium text-foreground">
                    {item.value}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full ${item.color}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Resumo por Propriedade
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                  Propriedade
                </th>
                <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                  Área (ha)
                </th>
                <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                  Aplicações
                </th>
                <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                  Custo Total
                </th>
                <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                  Custo/ha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                {
                  name: "Fazenda São João",
                  area: 450,
                  apps: 15,
                  cost: 12825,
                },
                {
                  name: "Sítio Boa Vista",
                  area: 220,
                  apps: 8,
                  cost: 6270,
                },
                {
                  name: "Fazenda Santa Maria",
                  area: 680,
                  apps: 23,
                  cost: 19380,
                },
              ].map((row) => (
                <tr key={row.name}>
                  <td className="py-3 text-sm font-medium text-foreground">
                    {row.name}
                  </td>
                  <td className="py-3 text-right text-sm text-foreground">
                    {row.area}
                  </td>
                  <td className="py-3 text-right text-sm text-foreground">
                    {row.apps}
                  </td>
                  <td className="py-3 text-right text-sm text-foreground">
                    R$ {row.cost.toLocaleString("pt-BR")}
                  </td>
                  <td className="py-3 text-right text-sm font-medium text-foreground">
                    R$ {(row.cost / row.area).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
