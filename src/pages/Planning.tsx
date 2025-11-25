import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Plane, Battery, Clock, MapPin } from "lucide-react";
import { useFlightPlanning } from "@/hooks/useFlightPlanning";
import { FlightPlanningDialog } from "@/components/FlightPlanningDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Planning() {
  const { plans, isLoading, createPlan, updatePlan, deletePlan } = useFlightPlanning();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const handleNew = () => {
    setEditingPlan(null);
    setDialogOpen(true);
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente remover este planejamento?")) {
      deletePlan.mutate(id);
    }
  };

  const handleSave = (data: any) => {
    if (editingPlan) {
      updatePlan.mutate({ id: editingPlan.id, ...data });
    } else {
      createPlan.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando planejamentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Planejamento de Voos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie e visualize seus planejamentos de voo
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Novo Planejamento
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum planejamento cadastrado ainda
          </p>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Planejamento
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {plans.map((plan: any) => (
            <Card key={plan.id} className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                      {plan.name}
                    </h3>
                    {plan.properties && (
                      <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {plan.properties.name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(plan.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Área</p>
                    <p className="text-sm font-medium text-foreground">{plan.area} ha</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Velocidade</p>
                    <p className="text-sm font-medium text-foreground">{plan.flight_speed} m/s</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Faixa</p>
                    <p className="text-sm font-medium text-foreground">{plan.swath_width} m</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Bateria</p>
                    <p className="text-sm font-medium text-foreground">{plan.battery_time_minutes} min</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="text-xs text-muted-foreground">Tempo</p>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-primary">
                      {plan.estimated_time_minutes} min
                    </p>
                  </div>

                  <div className="rounded-lg bg-success/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Battery className="h-4 w-4 text-success" />
                      <p className="text-xs text-muted-foreground">Baterias</p>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-success">
                      {plan.estimated_flights}
                    </p>
                  </div>

                  <div className="rounded-lg bg-warning/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Plane className="h-4 w-4 text-warning" />
                      <p className="text-xs text-muted-foreground">Eficiência</p>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-warning">
                      {((plan.area / plan.estimated_time_minutes) * 60).toFixed(1)}
                    </p>
                  </div>
                </div>

                {plan.notes && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Observações:</p>
                    <p className="text-xs sm:text-sm text-foreground">{plan.notes}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Criado em {format(new Date(plan.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FlightPlanningDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        plan={editingPlan}
      />
    </div>
  );
}
