import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Plus } from "lucide-react";

const properties = [
  {
    id: 1,
    name: "Fazenda São João",
    location: "Ribeirão Preto, SP",
    totalArea: 450,
    cultivatedArea: 380,
    plots: 12,
  },
  {
    id: 2,
    name: "Sítio Boa Vista",
    location: "Uberaba, MG",
    totalArea: 220,
    cultivatedArea: 200,
    plots: 8,
  },
  {
    id: 3,
    name: "Fazenda Santa Maria",
    location: "Goiânia, GO",
    totalArea: 680,
    cultivatedArea: 620,
    plots: 18,
  },
];

export default function Properties() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Propriedades</h1>
          <p className="text-muted-foreground">
            Gerencie suas fazendas e talhões
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Propriedade
        </Button>
      </div>

      {/* Properties Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {properties.map((property) => (
          <Card key={property.id} className="p-6 transition-all hover:shadow-lg">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <Button variant="ghost" size="sm">
                Editar
              </Button>
            </div>

            <h3 className="mb-1 text-xl font-semibold text-foreground">
              {property.name}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {property.location}
            </p>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Área Total</span>
                <span className="font-semibold text-foreground">
                  {property.totalArea} ha
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Área Cultivada</span>
                <span className="font-semibold text-foreground">
                  {property.cultivatedArea} ha
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Talhões</span>
                <span className="font-semibold text-foreground">
                  {property.plots}
                </span>
              </div>
            </div>

            <Button className="mt-4 w-full" variant="outline">
              Ver Detalhes
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
