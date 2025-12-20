import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plot, PlotGeometry } from '@/hooks/usePlots';
import { useApplications } from '@/hooks/useApplications';
import { useProperties } from '@/hooks/useProperties';
import { normalizeDecimalInput } from '@/lib/utils';

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

  const linkableApplications = useMemo(() => {
    if (!plot) return [];
    return applications
      .filter(app => (plot.property_id ? app.property_id === plot.property_id : true))
      .sort((a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime());
  }, [applications, plot?.property_id]);

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
      <DialogContent className="sm:max-w-md z-[10000] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{plot ? 'Editar Talhão' : 'Novo Talhão'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Talhão *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Talhão Norte, Pivô 1"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="property">Propriedade</Label>
            <Select
              value={formData.property_id || "none"}
              onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value === "none" ? "" : value }))}
            >
              <SelectTrigger id="property">
                <SelectValue placeholder="Selecione uma propriedade" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="none">Nenhuma</SelectItem>
                {properties.map((prop) => (
                  <SelectItem key={prop.id} value={prop.id}>
                    {prop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">Área (hectares)</Label>
            <Input
              id="area"
              type="text"
              value={formData.area_hectares}
              onChange={(e) => setFormData(prev => ({ ...prev, area_hectares: e.target.value }))}
              placeholder="Área calculada automaticamente"
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>O status do talhão é definido automaticamente pelas aplicações vinculadas.</p>
          </div>

          {plot && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Vincular aplicação a este talhão</Label>
                <Select
                  value={linkApplicationId}
                  onValueChange={async (value) => {
                    setLinkApplicationId(value);
                    if (value === 'none') return;
                    await updateApplicationPlotLink(value, plot.id);
                    setLinkApplicationId('none');
                  }}
                  disabled={isLinkingApplication}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma aplicação" />
                  </SelectTrigger>
                  <SelectContent className="z-[10001]">
                    <SelectItem value="none">Selecionar...</SelectItem>
                    {linkableApplications.map((app) => (
                      <SelectItem key={app.id} value={app.id}>
                        {new Date(app.application_date).toLocaleDateString('pt-BR')} • {app.application_type} • {app.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Isso apenas vincula a aplicação ao talhão (não altera área nem produtos).
                </p>
              </div>

              {linkedApplications.length > 0 && (
                <div className="space-y-2">
                  <Label>Aplicações já vinculadas</Label>
                  <div className="space-y-2">
                    {linkedApplications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {new Date(app.application_date).toLocaleDateString('pt-BR')} • {app.application_type}
                          </p>
                          <p className="text-xs text-muted-foreground">Status: {app.status}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLinkingApplication}
                          onClick={() => updateApplicationPlotLink(app.id, null)}
                        >
                          Desvincular
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Anotações sobre o talhão..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
