import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Edit, Trash2 } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { ApplicationDialog } from "@/components/ApplicationDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  planejada: { label: "Planejada", variant: "secondary" as const },
  em_andamento: { label: "Em Andamento", variant: "outline" as const },
  concluída: { label: "Concluída", variant: "default" as const },
  cancelada: { label: "Cancelada", variant: "destructive" as const },
};

const typeConfig = {
  pulverização: "Pulverização",
  adubação: "Adubação",
  semeadura: "Semeadura",
  outro: "Outro",
};

export default function Applications() {
  const { applications, isLoading, createApplication, updateApplication, deleteApplication } = useApplications();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<any>(null);

  const handleNew = () => {
    setEditingApp(null);
    setDialogOpen(true);
  };

  const handleEdit = (app: any) => {
    setEditingApp(app);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente remover esta aplicação?")) {
      deleteApplication.mutate(id);
    }
  };

  const handleSave = (data: any) => {
    if (editingApp) {
      updateApplication.mutate({ id: editingApp.id, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingApp(null);
        }
      });
    } else {
      createApplication.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando aplicações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Histórico de Aplicações
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Registros de todas as pulverizações realizadas
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Nova Aplicação
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhuma aplicação cadastrada ainda
          </p>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Primeira Aplicação
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app: any) => (
            <Card key={app.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground">
                      {app.properties?.name || "Propriedade não informada"}
                    </h3>
                    <Badge variant={statusConfig[app.status as keyof typeof statusConfig].variant}>
                      {statusConfig[app.status as keyof typeof statusConfig].label}
                    </Badge>
                    <Badge variant="outline">
                      {typeConfig[app.application_type as keyof typeof typeConfig]}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Data</p>
                      <p className="flex items-center gap-1.5 text-sm sm:text-base font-medium text-foreground">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                        {format(new Date(app.application_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Área</p>
                      <p className="text-sm sm:text-base font-medium text-foreground">
                        {app.area_applied} ha
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Produtos</p>
                      <p className="text-sm sm:text-base font-medium text-foreground">
                        {app.application_products?.length || 0} produto(s)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Custo</p>
                      <p className="text-sm sm:text-base font-medium text-foreground">
                        R$ {app.total_cost.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {app.notes && (
                    <div className="pt-2">
                      <p className="text-xs sm:text-sm text-muted-foreground">Observações:</p>
                      <p className="text-xs sm:text-sm text-foreground mt-1">{app.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(app)}
                    className="flex-1 sm:flex-none"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(app.id)}
                    className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Excluir</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        application={editingApp}
      />
    </div>
  );
}
