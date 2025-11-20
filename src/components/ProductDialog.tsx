import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts, Product } from '@/hooks/useProducts';
import { toast } from 'sonner';
import { z } from 'zod';
import { Plus } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  manufacturer: z.string().max(100).optional(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  unit_price: z.number().min(0, 'Preço não pode ser negativo'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  stock_quantity: z.number().min(0, 'Estoque não pode ser negativo'),
  active: z.boolean(),
});

type ProductDialogProps = {
  product?: Product;
  trigger?: React.ReactNode;
};

export const ProductDialog = ({ product, trigger }: ProductDialogProps) => {
  const [open, setOpen] = useState(false);
  const { createProduct, updateProduct } = useProducts();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    manufacturer: product?.manufacturer || '',
    category: product?.category || 'Herbicida',
    unit_price: product?.unit_price || 0,
    unit: product?.unit || 'L',
    stock_quantity: product?.stock_quantity || 0,
    active: product?.active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validated = productSchema.parse(formData);

      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...validated });
      } else {
        await createProduct.mutateAsync({
          name: validated.name,
          manufacturer: validated.manufacturer,
          category: validated.category,
          unit_price: validated.unit_price,
          unit: validated.unit,
          stock_quantity: validated.stock_quantity,
          active: validated.active,
        });
      }

      setOpen(false);
      setFormData({ 
        name: '', 
        manufacturer: '', 
        category: 'Herbicida', 
        unit_price: 0, 
        unit: 'L', 
        stock_quantity: 0, 
        active: true 
      });
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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {product ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Produto *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Herbicida Glifosato 480"
              required
            />
          </div>
          <div>
            <Label htmlFor="manufacturer">Fabricante</Label>
            <Input
              id="manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              placeholder="Ex: Agro Solutions"
            />
          </div>
          <div>
            <Label htmlFor="category">Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Herbicida">Herbicida</SelectItem>
                <SelectItem value="Fungicida">Fungicida</SelectItem>
                <SelectItem value="Inseticida">Inseticida</SelectItem>
                <SelectItem value="Adjuvante">Adjuvante</SelectItem>
                <SelectItem value="Fertilizante">Fertilizante</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit_price">Preço Unitário (R$) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price || ''}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="unit">Unidade *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Litros (L)</SelectItem>
                  <SelectItem value="mL">Mililitros (mL)</SelectItem>
                  <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                  <SelectItem value="g">Gramas (g)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="stock_quantity">Estoque Inicial *</Label>
            <Input
              id="stock_quantity"
              type="number"
              step="0.01"
              min="0"
              value={formData.stock_quantity || ''}
              onChange={(e) => setFormData({ ...formData, stock_quantity: parseFloat(e.target.value) })}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Salvando...' : product ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
