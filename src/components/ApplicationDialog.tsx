import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProperties } from "@/hooks/useProperties";
import { useProducts } from "@/hooks/useProducts";
import { Application } from "@/hooks/useApplications";
import { z } from "zod";

const applicationSchema = z.object({
  property_id: z.string().uuid(),
  product_id: z.string().uuid(),
  application_date: z.string().min(1, "Data é obrigatória"),
  application_type: z.enum(['pulverização', 'adubação', 'semeadura', 'outro']),
  status: z.enum(['planejada', 'em_andamento', 'concluída', 'cancelada']),
  area_applied: z.number().min(0.1, "Área deve ser maior que 0"),
  product_amount: z.number().min(0.1, "Quantidade deve ser maior que 0"),
  total_cost: z.number().min(0, "Custo deve ser positivo"),
  flight_time_minutes: z.number().int().min(0).nullable(),
  notes: z.string().nullable(),
});

interface ApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  application?: Application;
}

export function ApplicationDialog({ open, onOpenChange, onSave, application }: ApplicationDialogProps) {
  const { properties } = useProperties();
  const { products } = useProducts();
  
  const [formData, setFormData] = useState<{
    property_id: string;
    product_id: string;
    application_date: string;
    application_type: 'pulverização' | 'adubação' | 'semeadura' | 'outro';
    status: 'planejada' | 'em_andamento' | 'concluída' | 'cancelada';
    area_applied: number;
    product_amount: number;
    total_cost: number;
    flight_time_minutes: number | null;
    notes: string;
  }>({
    property_id: "",
    product_id: "",
    application_date: "",
    application_type: "pulverização",
    status: "planejada",
    area_applied: 0,
    product_amount: 0,
    total_cost: 0,
    flight_time_minutes: null,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (application) {
      setFormData({
        property_id: application.property_id,
        product_id: application.product_id,
        application_date: application.application_date,
        application_type: application.application_type,
        status: application.status,
        area_applied: application.area_applied,
        product_amount: application.product_amount,
        total_cost: application.total_cost,
        flight_time_minutes: application.flight_time_minutes || null,
        notes: application.notes || "",
      });
    }
  }, [application]);

  useEffect(() => {
    if (formData.product_id && formData.product_amount) {
      const product = products.find(p => p.id === formData.product_id);
      if (product) {
        const cost = formData.product_amount * product.unit_price;
        setFormData(prev => ({ ...prev, total_cost: cost }));
      }
    }
  }, [formData.product_id, formData.product_amount, products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = applicationSchema.parse({
        ...formData,
        area_applied: Number(formData.area_applied),
        product_amount: Number(formData.product_amount),
        total_cost: Number(formData.total_cost),
        flight_time_minutes: formData.flight_time_minutes ? Number(formData.flight_time_minutes) : null,
        notes: formData.notes || null,
      });

      onSave(validatedData as Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
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
            {application ? "Editar Aplicação" : "Nova Aplicação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="property_id">Propriedade *</Label>
              <Select
                value={formData.property_id}
                onValueChange={(value) => setFormData({ ...formData, property_id: value })}
              >
                <SelectTrigger className={errors.property_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione uma propriedade" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((prop) => (
                    <SelectItem key={prop.id} value={prop.id}>
                      {prop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.property_id && (
                <p className="text-xs text-destructive">{errors.property_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_id">Produto *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger className={errors.product_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.name} - R$ {prod.unit_price.toFixed(2)}/{prod.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.product_id && (
                <p className="text-xs text-destructive">{errors.product_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_date">Data *</Label>
              <Input
                id="application_date"
                type="date"
                value={formData.application_date}
                onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                className={errors.application_date ? "border-destructive" : ""}
              />
              {errors.application_date && (
                <p className="text-xs text-destructive">{errors.application_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="application_type">Tipo *</Label>
              <Select
                value={formData.application_type}
                onValueChange={(value: any) => setFormData({ ...formData, application_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pulverização">Pulverização</SelectItem>
                  <SelectItem value="adubação">Adubação</SelectItem>
                  <SelectItem value="semeadura">Semeadura</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluída">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="area_applied">Área Aplicada (ha) *</Label>
              <Input
                id="area_applied"
                type="number"
                step="0.01"
                value={formData.area_applied || ""}
                onChange={(e) => setFormData({ ...formData, area_applied: Number(e.target.value) })}
                className={errors.area_applied ? "border-destructive" : ""}
              />
              {errors.area_applied && (
                <p className="text-xs text-destructive">{errors.area_applied}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_amount">Quantidade Produto *</Label>
              <Input
                id="product_amount"
                type="number"
                step="0.01"
                value={formData.product_amount || ""}
                onChange={(e) => setFormData({ ...formData, product_amount: Number(e.target.value) })}
                className={errors.product_amount ? "border-destructive" : ""}
              />
              {errors.product_amount && (
                <p className="text-xs text-destructive">{errors.product_amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_cost">Custo Total (R$) *</Label>
              <Input
                id="total_cost"
                type="number"
                step="0.01"
                value={formData.total_cost || ""}
                onChange={(e) => setFormData({ ...formData, total_cost: Number(e.target.value) })}
                className={errors.total_cost ? "border-destructive" : ""}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flight_time_minutes">Tempo de Voo (min)</Label>
              <Input
                id="flight_time_minutes"
                type="number"
                value={formData.flight_time_minutes || ""}
                onChange={(e) => setFormData({ ...formData, flight_time_minutes: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
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
