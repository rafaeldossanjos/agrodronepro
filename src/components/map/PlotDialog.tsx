import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plot, PlotGeometry } from '@/hooks/usePlots';
import { useApplications } from '@/hooks/useApplications';
import { useProperties } from '@/hooks/useProperties';
import { normalizeDecimalInput } from '@/lib/utils';
import { Plus, Link2, Unlink } from 'lucide-react';

interface PlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plot?: Plot | null;
  geometry?: PlotGeometry | null;
  calculatedArea?: number;
  onSave: (data: {
    name: string;
    property_id: string | null;
    area_hectares: number | null;
    geometry: PlotGeometry;
    status: string;
    notes: string | null;
  }) => Promise<void>;
}


export function PlotDialog({ 
  open, 
  onOpenChange, 
  plot, 
  geometry, 
  calculatedArea,
  onSave 
}: PlotDialogProps) {
  const { properties } = useProperties();
  const { applications, updateApplication } = useApplications();
  const [isLoading, setIsLoading] = useState(false);
  const [isLinkingApplication, setIsLinkingApplication] = useState(false);
  const [linkApplicationId, setLinkApplicationId] = useState<string>('none');
  const [formData, setFormData] = useState({
    name: '',
    property_id: '',
    area_hectares: '',
    notes: '',
  });

  useEffect(() => {
    if (plot) {
      setFormData({
        name: plot.name,
        property_id: plot.property_id || '',
        area_hectares: plot.area_hectares?.toString() || '',
        notes: plot.notes || '',
      });
    } else {
      setFormData({
        name: '',
        property_id: '',
        area_hectares: calculatedArea?.toFixed(2) || '',
        notes: '',
      });
    }
  }, [plot, calculatedArea, open]);

  const linkedApplications = useMemo(() => {
    if (!plot?.id) return [];
    return applications
      .filter(app => app.plot_id === plot.id)
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime());
  }, [applications, plot?.id]);

  // Applications NOT already linked to this plot (available to link)
  const linkableApplications = useMemo(() => {
    if (!plot) return [];
    const linkedIds = new Set(linkedApplications.map(a => a.id));
    return applications
      .filter(app => !linkedIds.has(app.id)) // exclude already linked
      .filter(app => (plot.property_id ? app.property_id === plot.property_id : true))
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime());
  }, [applications, plot?.property_id, linkedApplications]);

  const updateApplicationPlotLink = async (applicationId: string, newPlotId: string | null) => {
    if (!plot) return;
    const app = applications.find(a => a.id === applicationId);
    if (!app) return;

    setIsLinkingApplication(true);
    try {
      await updateApplication.mutateAsync({
        id: app.id,
        property_id: app.property_id,
        plot_id: newPlotId,
        // Preserve the application name; only update the plot link fields
        name: app.name,
        plot_name: newPlotId ? plot.name : '',
        application_date: app.application_date,
        application_type: app.application_type,
        status: app.status,
        area_applied: app.area_applied,
        total_cost: app.total_cost,
        flight_time_minutes: app.flight_time_minutes,
        notes: app.notes,
      });
    } finally {
      setIsLinkingApplication(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const geom = plot?.geometry || geometry;
    if (!geom) return;

    setIsLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        property_id: formData.property_id || null,
        area_hectares: formData.area_hectares ? parseFloat(normalizeDecimalInput(formData.area_hectares)) : null,
        geometry: geom,
        status: 'planejada', // Default status - actual status derived from applications
        notes: formData.notes.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[10000] max-h-[95vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-bold">
            {plot ? 'Editar Talhão' : 'Novo Talhão'}
          </DialogTitle>
          <p className="text-base sm:text-lg text-muted-foreground mt-1">
            {plot ? 'Atualize os dados do talhão' : 'Defina um nome e propriedade para o talhão desenhado'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-lg font-medium">
              Nome do Talhão *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Talhão Norte, Pivô 1"
              className="h-14 text-lg px-4 rounded-xl"
              autoFocus={false}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property" className="text-lg font-medium">
              Propriedade
            </Label>
            <Select
              value={formData.property_id || "none"}
              onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value === "none" ? "" : value }))}
            >
              <SelectTrigger id="property" className="h-14 text-lg px-4 rounded-xl">
                <SelectValue placeholder="Selecione uma propriedade" />
              </SelectTrigger>
              <SelectContent className="z-[10001] bg-popover">
                <SelectItem value="none" className="text-lg py-3">Nenhuma</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id} className="text-lg py-3">
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Vincule o talhão a uma fazenda cadastrada
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area" className="text-lg font-medium">
              Área (hectares)
            </Label>
            <Input
              id="area"
              type="text"
              value={formData.area_hectares}
              onChange={(e) => setFormData(prev => ({ ...prev, area_hectares: e.target.value }))}
              placeholder="Área calculada automaticamente"
              className="h-14 text-lg px-4 rounded-xl"
            />
            <p className="text-sm text-muted-foreground">
              A área é calculada automaticamente pelo desenho
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-xl">
            <p className="text-base text-muted-foreground">
              O status do talhão é definido automaticamente pelas aplicações vinculadas.
            </p>
          </div>

          {plot && (
            <div className="space-y-4 p-4 border rounded-xl bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-lg font-medium">
                  <Link2 className="h-5 w-5" />
                  Aplicações vinculadas
                  {linkedApplications.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-base">{linkedApplications.length}</Badge>
                  )}
                </Label>
              </div>

              <p className="text-sm text-muted-foreground">
                Você pode vincular <strong>várias aplicações</strong> ao mesmo talhão (ex: dividir em etapas).
              </p>

              <div className="flex gap-3">
                <Select
                  value={linkApplicationId}
                  onValueChange={async (value) => {
                    setLinkApplicationId(value);
                    if (value === 'none') return;
                    await updateApplicationPlotLink(value, plot.id);
                    setLinkApplicationId('none');
                  }}
                  disabled={isLinkingApplication || linkableApplications.length === 0}
                >
                  <SelectTrigger className="flex-1 h-14 text-lg px-4 rounded-xl">
                    <SelectValue placeholder={linkableApplications.length === 0 ? "Nenhuma aplicação disponível" : "Selecione uma aplicação"} />
                  </SelectTrigger>
                  <SelectContent className="z-[10001] bg-popover">
                    <SelectItem value="none" className="text-lg py-3">Selecionar...</SelectItem>
                    {linkableApplications.map((app) => (
                      <SelectItem key={app.id} value={app.id} className="text-lg py-3">
                        {app.name || app.plot_name || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  disabled={linkApplicationId === 'none' || isLinkingApplication}
                  onClick={async () => {
                    if (linkApplicationId !== 'none') {
                      await updateApplicationPlotLink(linkApplicationId, plot.id);
                      setLinkApplicationId('none');
                    }
                  }}
                  className="h-14 w-14 rounded-xl"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>

              {linkedApplications.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {linkedApplications.map((app) => (
                    <div key={app.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-medium truncate">
                          {app.name || app.plot_name || 'Sem nome'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive shrink-0 h-12 w-12"
                        disabled={isLinkingApplication}
                        onClick={() => updateApplicationPlotLink(app.id, null)}
                        title="Desvincular"
                      >
                        <Unlink className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {linkedApplications.length === 0 && (
                <p className="text-base text-muted-foreground italic text-center py-3">
                  Nenhuma aplicação vinculada a este talhão.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-lg font-medium">
              Observações
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Anotações sobre o talhão..."
              rows={3}
              className="text-lg px-4 py-3 rounded-xl resize-none"
            />
          </div>

          <DialogFooter className="gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 h-14 text-lg rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.name.trim()}
              className="flex-1 h-14 text-lg rounded-xl"
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}