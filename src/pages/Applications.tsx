import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Edit, Trash2, Check, Clock, Play, X, Map, Search, Filter } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  // Obter lista única de propriedades
  const uniqueProperties = useMemo(() => {
    const seen: Record<string, boolean> = {};
    const result: { id: string; name: string }[] = [];
    applications.forEach((app: any) => {
      if (app.property_id && app.properties?.name && !seen[app.property_id]) {
        seen[app.property_id] = true;
        result.push({ id: app.property_id, name: app.properties.name });
      }
    });
    return result;
  }, [applications]);

  // Filtrar aplicações
  const filteredApplications = useMemo(() => {
    return applications.filter((app: any) => {
      // Filtro de busca
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (app.name?.toLowerCase().includes(searchLower)) ||
        (app.properties?.name?.toLowerCase().includes(searchLower)) ||
        (app.plot_name?.toLowerCase().includes(searchLower)) ||
        (app.notes?.toLowerCase().includes(searchLower));
      
      if (searchTerm && !matchesSearch) return false;
      
      // Filtro de status
      if (statusFilter !== "all" && app.status !== statusFilter) return false;
      
      // Filtro de tipo
      if (typeFilter !== "all" && app.application_type !== typeFilter) return false;
      
      // Filtro de propriedade/fazenda
      if (propertyFilter !== "all" && app.property_id !== propertyFilter) return false;
      
      return true;
    });
  }, [applications, searchTerm, statusFilter, typeFilter, propertyFilter]);

  const handleNew = () => {
    setEditingApp(null);
    setDialogOpen(true);
  };

  const handleEdit = (app: any) => {
    setEditingApp(app);
    setDialogOpen(true);
  };

  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeletingAppId(id);
  };

  const confirmDelete = () => {
    if (deletingAppId) {
      deleteApplication.mutate(deletingAppId);
      setDeletingAppId(null);
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
  const pendingApps = filteredApplications.filter((app: any) => 
    app.status === 'planejada' || app.status === 'em_andamento'
  );
  const otherApps = filteredApplications.filter((app: any) => 
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
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                {app.name || "Sem nome"}
              </h3>
              <StatusBadge app={app} />
              <Badge variant="outline" className="text-sm">
                {typeConfig[app.application_type as keyof typeof typeConfig]}
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground">
              {app.properties?.name || "Propriedade não informada"}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <p className="text-lg text-muted-foreground">Data</p>
              <p className="flex items-center gap-1.5 text-xl font-semibold text-foreground">
                <Calendar className="h-6 w-6" />
                {format(new Date(app.application_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-lg text-muted-foreground">Área</p>
              <p className="text-xl font-semibold text-foreground">
                {app.area_applied} ha
              </p>
            </div>
            <div>
              <p className="text-lg text-muted-foreground">Produtos</p>
              <p className="text-xl font-semibold text-foreground">
                {app.application_products?.length || 0} produto(s)
              </p>
            </div>
          </div>

          {app.notes && (
            <div className="pt-2">
              <p className="text-lg text-muted-foreground">Observações:</p>
              <p className="text-xl text-foreground mt-1">{app.notes}</p>
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
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground">
            Histórico de Aplicações
          </h1>
          <p className="text-2xl text-muted-foreground">
            Registros de todas as pulverizações realizadas
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 h-14 text-lg px-6 w-full sm:w-auto">
          <Plus className="h-6 w-6" />
          Nova Aplicação
        </Button>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, propriedade, talhão ou observações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 text-lg rounded-xl"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="h-14 text-base rounded-xl w-auto min-w-[180px]">
              <SelectValue placeholder="Fazenda" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todas as Fazendas</SelectItem>
              {uniqueProperties.map((prop: any) => (
                <SelectItem key={prop.id} value={prop.id}>{prop.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-14 text-base rounded-xl w-auto min-w-[160px]">
              <Filter className="h-5 w-5 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="planejada">Planejada</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluída">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-14 text-base rounded-xl w-auto min-w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="pulverização">Pulverização</SelectItem>
              <SelectItem value="adubação">Adubação</SelectItem>
              <SelectItem value="semeadura">Semeadura</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
      ) : filteredApplications.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Search className="mx-auto h-14 w-14 text-muted-foreground mb-3" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma aplicação encontrada
            </h3>
            <p className="text-lg text-muted-foreground">
              Tente ajustar os filtros ou buscar por outro termo
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Aplicações pendentes com destaque */}
          {pendingApps.length > 0 && (
            <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
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
                <h2 className="text-2xl font-semibold text-foreground">
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletingAppId} onOpenChange={(open) => !open && setDeletingAppId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta aplicação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
