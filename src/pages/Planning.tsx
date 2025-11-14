import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, Battery, Clock, MapPin } from "lucide-react";

export default function Planning() {
  const [area, setArea] = useState(50);
  const [speed, setSpeed] = useState(5);
  const [swathWidth, setSwathWidth] = useState(6);
  const [batteryTime, setBatteryTime] = useState(12);

  // Cálculos
  const flightTime = (area / (speed * swathWidth * 60)) * 10000; // minutos
  const batteries = Math.ceil(flightTime / batteryTime);
  const efficiency = (area / flightTime) * 60; // ha/hora

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Planejamento de Voos
        </h1>
        <p className="text-muted-foreground">
          Calcule autonomia, baterias necessárias e tempo de operação
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Parâmetros do Voo
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="planArea">Área a Cobrir (ha)</Label>
                <Input
                  id="planArea"
                  type="number"
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                  min="0"
                  step="1"
                />
              </div>
              <div>
                <Label htmlFor="speed">Velocidade (m/s)</Label>
                <Input
                  id="speed"
                  type="number"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <Label htmlFor="swath">Largura da Faixa (m)</Label>
                <Input
                  id="swath"
                  type="number"
                  value={swathWidth}
                  onChange={(e) => setSwathWidth(Number(e.target.value))}
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <Label htmlFor="battery">Autonomia Bateria (min)</Label>
                <Input
                  id="battery"
                  type="number"
                  value={batteryTime}
                  onChange={(e) => setBatteryTime(Number(e.target.value))}
                  min="0"
                  step="1"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Equipamento Recomendado
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Plane className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">DJI Agras T40</p>
                    <p className="text-sm text-muted-foreground">
                      Ideal para áreas médias
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Selecionar
                </Button>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="mb-2 text-sm font-medium text-foreground">
                  Checklist Pré-Voo
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Verificar condições climáticas</li>
                  <li>✓ Inspecionar equipamento</li>
                  <li>✓ Carregar todas as baterias</li>
                  <li>✓ Preparar calda conforme cálculo</li>
                  <li>✓ Verificar coordenadas GPS</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Estimativas
            </h2>

            <div className="space-y-4">
              <div className="rounded-lg bg-primary/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Tempo de Voo</p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {flightTime.toFixed(0)} min
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ≈ {(flightTime / 60).toFixed(1)} horas
                </p>
              </div>

              <div className="rounded-lg bg-success/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Battery className="h-5 w-5 text-success" />
                  <p className="text-sm text-muted-foreground">
                    Baterias Necessárias
                  </p>
                </div>
                <p className="text-2xl font-bold text-success">{batteries}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  + 1 reserva recomendada
                </p>
              </div>

              <div className="rounded-lg bg-warning/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-warning" />
                  <p className="text-sm text-muted-foreground">Eficiência</p>
                </div>
                <p className="text-2xl font-bold text-warning">
                  {efficiency.toFixed(1)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">ha/hora</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Condições Climáticas
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Temperatura</span>
                <span className="font-medium text-foreground">28°C</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Umidade</span>
                <span className="font-medium text-foreground">65%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vento</span>
                <span className="font-medium text-success">8 km/h ✓</span>
              </div>
              <div className="mt-4 rounded-lg bg-success/10 p-3">
                <p className="text-sm font-medium text-success">
                  ✓ Condições favoráveis para aplicação
                </p>
              </div>
            </div>
          </Card>

          <Button className="w-full" size="lg">
            Iniciar Operação
          </Button>
        </div>
      </div>
    </div>
  );
}
