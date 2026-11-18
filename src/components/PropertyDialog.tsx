import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProperties, Property } from '@/hooks/useProperties';
import { toast } from 'sonner';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { isValidDecimalInput, parseDecimalInput } from '@/lib/utils';

const propertySchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  location: z.string().min(3, 'Localização deve ter pelo menos 3 caracteres').max(200),
  total_area: z.number().min(0).max(999999).optional(),
  plot_count: z.number().int().min(1, 'Deve ter pelo menos 1 talhão').max(1000).optional(),
  notes: z.string().max(500).optional(),
});

type PropertyDialogProps = {
  property?: Property;
  trigger?: React.ReactNode;
};

export const PropertyDialog = ({ property, trigger }: PropertyDialogProps) => {
  const [open, setOpen] = useState(false);
  const { createProperty, updateProperty } = useProperties();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: property?.name || '',
    location: property?.location || '',
    total_area: property?.total_area || 0,
    plot_count: property?.plot_count || 1,
    notes: property?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const areaValue = typeof formData.total_area === 'string' ? parseDecimalInput(formData.total_area as string) : formData.total_area;
      const validated = propertySchema.parse({
        ...formData,
        total_area: areaValue || undefined,
        plot_count: formData.plot_count || undefined,
      });

      if (property) {
        await updateProperty.mutateAsync({ id: property.id, ...validated });
      } else {
        await createProperty.mutateAsync({
          name: validated.name,
          location: validated.location,
          total_area: validated.total_area,
          plot_count: validated.plot_count,
          notes: validated.notes,
        });
      }

      setOpen(false);
      setFormData({ name: '', location: '', total_area: 0, plot_count: 1, notes: '' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-3 h-16 px-6 text-xl rounded-xl">
            <Plus className="h-6 w-6" />
            Nova Propriedade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">
            {property ? 'Editar Propriedade' : 'Nova Propriedade'}
          </DialogTitle>
          <p className="text-base sm:text-lg text-muted-foreground mt-1">
            {property ? 'Atualize os dados da propriedade' : 'Cadastre uma nova fazenda ou propriedade rural'}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xl font-medium">
              Nome da Propriedade *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Fazenda São João"
              className="h-16 text-xl px-4 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="text-xl font-medium">
              Localização *
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ex: Ribeirão Preto, SP"
              className="h-16 text-xl px-4 rounded-xl"
              required
            />
            <p className="text-sm text-muted-foreground">
              Cidade e estado onde a propriedade está localizada
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_area" className="text-xl font-medium">
                Área Total (ha)
              </Label>
              <Input
                id="total_area"
                type="text"
                inputMode="decimal"
                value={formData.total_area || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^[\d]*[.,]?[\d]*$/.test(val)) {
                    setFormData({ ...formData, total_area: val as any });
                  }
                }}
                placeholder="0.00"
                className="h-16 text-xl px-4 rounded-xl"
              />
              <p className="text-sm text-muted-foreground">
                Opcional - área em hectares
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plot_count" className="text-xl font-medium">
                Número de Talhões
              </Label>
              <Input
                id="plot_count"
                type="number"
                min="1"
                value={formData.plot_count || ''}
                onChange={(e) => setFormData({ ...formData, plot_count: parseInt(e.target.value) || 0 })}
                placeholder="1"
                className="h-16 text-xl px-4 rounded-xl"
              />
              <p className="text-sm text-muted-foreground">
                Quantidade estimada
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xl font-medium">
              Observações
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre a propriedade..."
              rows={4}
              className="text-lg px-4 py-3 rounded-xl resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              className="flex-1 h-14 text-lg rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="flex-1 h-14 text-lg rounded-xl"
            >
              {isLoading ? 'Salvando...' : property ? 'Atualizar' : 'Criar Propriedade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};