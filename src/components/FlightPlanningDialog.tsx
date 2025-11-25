import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProperties } from "@/hooks/useProperties";
import { FlightPlan } from "@/hooks/useFlightPlanning";
import { z } from "zod";

const planningSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  property_id: z.string().uuid().nullable(),
  area: z.number().min(0.1, "Área deve ser maior que 0").max(10000, "Área deve ser menor que 10.000 ha"),
  flight_speed: z.number().min(1, "Velocidade deve ser maior que 0").max(20, "Velocidade deve ser menor que 20 m/s"),
  swath_width: z.number().min(1, "Largura deve ser maior que 0").max(20, "Largura deve ser menor que 20 m"),
  battery_time_minutes: z.number().int().min(5, "Tempo de bateria deve ser maior que 5 min").max(60, "Tempo de bateria deve ser menor que 60 min"),
  notes: z.string().nullable(),
});

interface FlightPlanningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<FlightPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  plan?: FlightPlan;
}

export function FlightPlanningDialog({ open, onOpenChange, onSave, plan }: FlightPlanningDialogProps) {
  const { properties } = useProperties();
  
  const [formData, setFormData] = useState<{
    name: string;
    property_id: string | null;
    area: number;
    flight_speed: number;
    swath_width: number;
    battery_time_minutes: number;
    notes: string;
  }>({
    name: "",
    property_id: null,
    area: 0,
    flight_speed: 5,
    swath_width: 6,
    battery_time_minutes: 12,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        property_id: plan.property_id,
        area: plan.area,
        flight_speed: plan.flight_speed,
        swath_width: plan.swath_width,
        battery_time_minutes: plan.battery_time_minutes,
        notes: plan.notes || "",
      });
    }
  }, [plan]);

  // Cálculos
  const flightTime = (formData.area / (formData.flight_speed * formData.swath_width * 60)) * 10000;
  const batteries = Math.ceil(flightTime / formData.battery_time_minutes);
  const efficiency = (formData.area / flightTime) * 60;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = planningSchema.parse({
        ...formData,
        area: Number(formData.area),
        flight_speed: Number(formData.flight_speed),
        swath_width: Number(formData.swath_width),
        battery_time_minutes: Number(formData.battery_time_minutes),
        notes: formData.notes || null,
      });

      onSave({
        ...validatedData,
        estimated_flights: batteries,
        estimated_time_minutes: Math.round(flightTime),
      } as Omit<FlightPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plan ? "Editar Planejamento" : "Novo Planejamento de Voo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Planejamento *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Aplicação Soja - Talhão Norte"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property_id">Propriedade (opcional)</Label>
            <Select
              value={formData.property_id || "none"}
              onValueChange={(value) => setFormData({ ...formData, property_id: value === "none" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma propriedade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="area">Área a Cobrir (ha) *</Label>
              <Input
                id="area"
                type="number"
                step="0.1"
                value={formData.area || ""}
                onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                className={errors.area ? "border-destructive" : ""}
              />
              {errors.area && (
                <p className="text-xs text-destructive">{errors.area}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="flight_speed">Velocidade (m/s) *</Label>
              <Input
                id="flight_speed"
                type="number"
                step="0.5"
                value={formData.flight_speed || ""}
                onChange={(e) => setFormData({ ...formData, flight_speed: Number(e.target.value) })}
                className={errors.flight_speed ? "border-destructive" : ""}
              />
              {errors.flight_speed && (
                <p className="text-xs text-destructive">{errors.flight_speed}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="swath_width">Largura da Faixa (m) *</Label>
              <Input
                id="swath_width"
                type="number"
                step="0.5"
                value={formData.swath_width || ""}
                onChange={(e) => setFormData({ ...formData, swath_width: Number(e.target.value) })}
                className={errors.swath_width ? "border-destructive" : ""}
              />
              {errors.swath_width && (
                <p className="text-xs text-destructive">{errors.swath_width}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="battery_time_minutes">Autonomia Bateria (min) *</Label>
              <Input
                id="battery_time_minutes"
                type="number"
                value={formData.battery_time_minutes || ""}
                onChange={(e) => setFormData({ ...formData, battery_time_minutes: Number(e.target.value) })}
                className={errors.battery_time_minutes ? "border-destructive" : ""}
              />
              {errors.battery_time_minutes && (
                <p className="text-xs text-destructive">{errors.battery_time_minutes}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h3 className="font-semibold text-sm">Estimativas</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tempo de Voo</p>
                <p className="font-semibold">{flightTime.toFixed(0)} min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Baterias</p>
                <p className="font-semibold">{batteries}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Eficiência</p>
                <p className="font-semibold">{efficiency.toFixed(1)} ha/h</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Informações adicionais sobre o planejamento..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
