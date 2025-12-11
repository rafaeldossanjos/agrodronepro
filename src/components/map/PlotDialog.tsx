import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plot, PlotGeometry } from '@/hooks/usePlots';
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

const STATUS_OPTIONS = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Em Andamento', value: 'in_progress' },
  { label: 'Concluído', value: 'completed' },
];

export function PlotDialog({ 
  open, 
  onOpenChange, 
  plot, 
  geometry, 
  calculatedArea,
  onSave 
}: PlotDialogProps) {
  const { properties } = useProperties();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    property_id: '',
    area_hectares: '',
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    if (plot) {
      setFormData({
        name: plot.name,
        property_id: plot.property_id || '',
        area_hectares: plot.area_hectares?.toString() || '',
        status: plot.status || 'pending',
        notes: plot.notes || '',
      });
    } else {
      setFormData({
        name: '',
        property_id: '',
        area_hectares: calculatedArea?.toString() || '',
        status: 'pending',
        notes: '',
      });
    }
  }, [plot, calculatedArea, open]);

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
        status: formData.status,
        notes: formData.notes.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{plot ? 'Editar Talhão' : 'Novo Talhão'}</DialogTitle>
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

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
