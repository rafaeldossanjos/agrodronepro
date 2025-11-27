import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Equipment } from "@/hooks/useEquipment";

const equipmentSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  model: z.string().min(1, "Modelo é obrigatório"),
  battery_capacity: z.coerce.number().min(0, "Capacidade da bateria deve ser positiva"),
  flight_time_minutes: z.coerce.number().min(0, "Tempo de voo deve ser positivo"),
  tank_capacity: z.coerce.number().min(0, "Capacidade do tanque deve ser positiva"),
  status: z.string().min(1, "Status é obrigatório"),
  total_flights: z.coerce.number().min(0).default(0),
  total_flight_hours: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

interface EquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  onSubmit: (data: EquipmentFormData) => Promise<void>;
}

export function EquipmentDialog({
  open,
  onOpenChange,
  equipment,
  onSubmit,
}: EquipmentDialogProps) {
  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: "",
      model: "",
      battery_capacity: 0,
      flight_time_minutes: 0,
      tank_capacity: 0,
      status: "operacional",
      total_flights: 0,
      total_flight_hours: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (equipment) {
      form.reset({
        name: equipment.name,
        model: equipment.model,
        battery_capacity: equipment.battery_capacity,
        flight_time_minutes: equipment.flight_time_minutes,
        tank_capacity: equipment.tank_capacity,
        status: equipment.status,
        total_flights: equipment.total_flights,
        total_flight_hours: equipment.total_flight_hours,
        notes: equipment.notes || "",
      });
    } else {
      form.reset({
        name: "",
        model: "",
        battery_capacity: 0,
        flight_time_minutes: 0,
        tank_capacity: 0,
        status: "operacional",
        total_flights: 0,
        total_flight_hours: 0,
        notes: "",
      });
    }
  }, [equipment, form]);

  const handleSubmit = async (data: EquipmentFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {equipment ? "Editar Equipamento" : "Novo Equipamento"}
          </DialogTitle>
          <DialogDescription>
            {equipment
              ? "Atualize as informações do equipamento"
              : "Cadastre um novo equipamento/drone"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Drone 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: DJI Agras T40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="battery_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade Bateria (%)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="flight_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo Voo (minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tank_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade Tanque (L)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="40"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="operacional">Operacional</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_flights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de Voos</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_flight_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Horas Voo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o equipamento..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {equipment ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
