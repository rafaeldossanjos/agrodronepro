import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Edit, Trash2, Check, Clock, Play, X, Map } from "lucide-react";
import { useApplications } from "@/hooks/useApplications";
import { ApplicationDialog } from "@/components/ApplicationDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  planejada: { label: "Planejada", variant: "secondary" as const, icon: Clock },
  em_andamento: { label: "Em Andamento", variant: "outline" as const, icon: Play },
  concluída: { label: "Concluída", variant: "default" as const, icon: Check },
  cancelada: { label: "Cancelada", variant: "destructive" as const, icon: X },
};

const typeConfig = {
  pulverização: "Pulverização",
  adubação: "Adubação",
  semeadura: "Semeadura",
  outro: "Outro",
};

export default function Applications() {
  const navigate = useNavigate();
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

  const handleStatusChange = (app: any, newStatus: string) => {
    const updateData: any = { 
      id: app.id, 
      status: newStatus,
      name: app.name,
      property_id: app.property_id,
      plot_id: app.plot_id || null,
      plot_name: app.plot_name,
      application_date: app.application_date,
      application_type: app.application_type,
      area_applied: app.area_applied,
      total_cost: app.total_cost,
      notes: app.notes,
      products: app.application_products?.map((p: any) => ({
        product_id: p.product_id,
        dose_per_ha: p.dose_per_ha,
        total_amount: p.total_amount,
        unit_cost: p.unit_cost,
        total_cost: p.total_cost,
      })) || []
    };
    updateApplication.mutate(updateData);
  };

  const handleSave = async (data: any) => {
    try {
      if (editingApp) {
        await updateApplication.mutateAsync({ id: editingApp.id, ...data });
        setDialogOpen(false);
        setEditingApp(null);
      } else {
        await createApplication.mutateAsync(data);
        setDialogOpen(false);
      }
    } catch (error) {
      // Error already handled in hook
    }
  };

  // Separar aplicações pendentes (planejada/em_andamento) das outras
  const pendingApps = applications.filter((app: any) => 
    app.status === 'planejada' || app.status === 'em_andamento'
  );
  const otherApps = applications.filter((app: any) => 
    app.status !== 'planejada' && app.status !== 'em_andamento'
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando aplicações...</p>
      </div>
    );
  }

  const StatusBadge = ({ app }: { app: any }) => {
    const config = statusConfig[app.status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    // Se for planejada ou em_andamento, mostrar dropdown
    if (app.status === 'planejada' || app.status === 'em_andamento') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity border",
                app.status === 'planejada' 
                  ? "bg-secondary text-secondary-foreground border-secondary" 
                  : "bg-background text-foreground border-input"
              )}
            >
              <Icon className="h-3 w-3" />
              {config.label}
              <span className="ml-1 text-[10px]">▼</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover">
            {app.status === 'planejada' && (
              <DropdownMenuItem 
                onClick={() => handleStatusChange(app, 'em_andamento')}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Iniciar (Em Andamento)
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => handleStatusChange(app, 'concluída')}
              className="gap-2 text-success"
            >
              <Check className="h-4 w-4" />
              Marcar como Concluída
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleStatusChange(app, 'cancelada')}
              className="gap-2 text-destructive"
            >
              <X className="h-4 w-4" />
              Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const ApplicationCard = ({ app }: { app: any }) => (
    <Card key={app.id} className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                {app.name || "Sem nome"}
              </h3>
              <StatusBadge app={app} />
              <Badge variant="outline" className="text-sm">
                {typeConfig[app.application_type as keyof typeof typeConfig]}
              </Badge>
            </div>
            <p className="text-base text-muted-foreground">
              {app.properties?.name || "Propriedade não informada"}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                <Calendar className="h-5 w-5" />
                {format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Área</p>
              <p className="text-base font-semibold text-foreground">
                {app.area_applied} ha
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos</p>
              <p className="text-base font-semibold text-foreground">
                {app.application_products?.length || 0} produto(s)
              </p>
            </div>
          </div>

          {app.notes && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">Observações:</p>
              <p className="text-base text-foreground mt-1">{app.notes}</p>
            </div>
          )}
        </div>

        <div className="flex sm:flex-col gap-2">
          {app.plot_id && (
            <Button
              variant="outline"
              size="default"
              onClick={() => navigate('/map')}
              className="flex-1 sm:flex-none h-12 text-base"
              title="Ver no Mapa"
            >
              <Map className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Mapa</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="default"
            onClick={() => handleEdit(app)}
            className="flex-1 sm:flex-none h-12 text-base"
          >
            <Edit className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Button
            variant="outline"
            size="default"
            onClick={() => handleDelete(app.id)}
            className="flex-1 sm:flex-none h-12 text-base text-destructive hover:text-destructive"
          >
            <Trash2 className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Histórico de Aplicações
          </h1>
          <p className="text-base text-muted-foreground">
            Registros de todas as pulverizações realizadas
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 h-14 text-lg px-6 w-full sm:w-auto">
          <Plus className="h-6 w-6" />
          Nova Aplicação
        </Button>
      </div>

      {applications.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-lg text-muted-foreground mb-4">
            Nenhuma aplicação cadastrada ainda
          </p>
          <Button onClick={handleNew} className="h-14 text-lg px-6">
            <Plus className="h-6 w-6 mr-2" />
            Cadastrar Primeira Aplicação
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Aplicações pendentes com destaque */}
          {pendingApps.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-6 w-6 text-warning" />
                Pendentes ({pendingApps.length})
              </h2>
              <div className="space-y-2">
                {pendingApps.map((app: any) => (
                  <ApplicationCard key={app.id} app={app} />
                ))}
              </div>
            </div>
          )}

          {/* Outras aplicações */}
          {otherApps.length > 0 && (
            <div className="space-y-2">
              {pendingApps.length > 0 && (
                <h2 className="text-xl font-semibold text-foreground">
                  Histórico
                </h2>
              )}
              <div className="space-y-2">
                {otherApps.map((app: any) => (
                  <ApplicationCard key={app.id} app={app} />
                ))}
              </div>
            </div>
          )}
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
