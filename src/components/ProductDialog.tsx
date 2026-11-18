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
import { isValidDecimalInput, parseDecimalInput } from '@/lib/utils';

const productSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  manufacturer: z.string().max(100).optional(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  unit_price: z.number().min(0, 'Preço não pode ser negativo').optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  package_size: z.number().min(0.01, 'Tamanho da embalagem deve ser maior que 0').optional(),
  recommended_dose: z.number().min(0, 'Dose não pode ser negativa').optional(),
  recommended_dose_unit: z.string().optional(),
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
    package_size: product?.package_size?.toString() || '',
    recommended_dose: product?.recommended_dose?.toString() || '',
    recommended_dose_unit: product?.recommended_dose_unit || 'L/ha',
    active: product?.active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToValidate = {
        ...formData,
        package_size: formData.package_size ? parseDecimalInput(formData.package_size) : undefined,
        recommended_dose: formData.recommended_dose ? parseDecimalInput(formData.recommended_dose) : undefined,
      };
      
      const validated = productSchema.parse(dataToValidate);

      if (product) {
        await updateProduct.mutateAsync({ id: product.id, ...validated });
      } else {
        await createProduct.mutateAsync({
          name: validated.name,
          manufacturer: validated.manufacturer,
          category: validated.category,
          unit_price: validated.unit_price,
          unit: validated.unit,
          stock_quantity: 0,
          package_size: validated.package_size,
          recommended_dose: validated.recommended_dose,
          recommended_dose_unit: validated.recommended_dose_unit,
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
        package_size: '',
        recommended_dose: '',
        recommended_dose_unit: 'L/ha',
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
          <Button className="gap-3 h-16 px-6 text-xl rounded-xl">
            <Plus className="h-6 w-6" />
            Novo Produto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">
            {product ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
          <p className="text-base sm:text-lg text-muted-foreground mt-1">
            {product ? 'Atualize os dados do produto' : 'Cadastre um novo defensivo agrícola ou insumo'}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xl font-medium">
              Nome do Produto *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Herbicida Glifosato 480"
              className="h-16 text-xl px-4 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manufacturer" className="text-xl font-medium">
              Fabricante
            </Label>
            <Input
              id="manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              placeholder="Ex: Agro Solutions"
              className="h-16 text-xl px-4 rounded-xl"
            />
            <p className="text-sm text-muted-foreground">
              Empresa que fabrica o produto
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category" className="text-xl font-medium">
              Categoria *
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="h-16 text-xl px-4 rounded-xl">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="Herbicida" className="text-lg py-3">Herbicida</SelectItem>
                <SelectItem value="Fungicida" className="text-lg py-3">Fungicida</SelectItem>
                <SelectItem value="Inseticida" className="text-lg py-3">Inseticida</SelectItem>
                <SelectItem value="Adjuvante" className="text-lg py-3">Adjuvante</SelectItem>
                <SelectItem value="Fertilizante" className="text-lg py-3">Fertilizante</SelectItem>
                <SelectItem value="Outro" className="text-lg py-3">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit" className="text-xl font-medium">
                Unidade de Medida *
              </Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger className="h-16 text-xl px-4 rounded-xl">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="L" className="text-lg py-3">Litros (L)</SelectItem>
                  <SelectItem value="mL" className="text-lg py-3">Mililitros (mL)</SelectItem>
                  <SelectItem value="kg" className="text-lg py-3">Quilogramas (kg)</SelectItem>
                  <SelectItem value="g" className="text-lg py-3">Gramas (g)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="package_size" className="text-xl font-medium">
                Tamanho Embalagem
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="package_size"
                  type="text"
                  inputMode="decimal"
                  value={formData.package_size}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isValidDecimalInput(val)) {
                      setFormData({ ...formData, package_size: val });
                    }
                  }}
                  placeholder="20"
                  className="h-16 text-xl px-4 rounded-xl"
                />
                <span className="text-lg text-muted-foreground whitespace-nowrap min-w-[40px]">
                  {formData.unit}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Capacidade de cada embalagem/balde
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit_price" className="text-xl font-medium">
              Preço por Embalagem (R$)
            </Label>
            <Input
              id="unit_price"
              type="text"
              inputMode="decimal"
              value={formData.unit_price || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (isValidDecimalInput(val)) {
                  setFormData({ ...formData, unit_price: parseDecimalInput(val) });
                }
              }}
              placeholder="0.00"
              className="h-16 text-xl px-4 rounded-xl"
            />
            <p className="text-sm text-muted-foreground">
              Valor pago por cada unidade/embalagem do produto
            </p>
          </div>
          
          {/* Dose Recomendada */}
          <div className="rounded-xl border border-border p-4 space-y-4 bg-muted/30">
            <div>
              <Label className="text-xl font-medium">Dose Recomendada (opcional)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Será preenchida automaticamente ao selecionar este produto na calculadora
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recommended_dose" className="text-base">
                  Dose
                </Label>
                <Input
                  id="recommended_dose"
                  type="text"
                  inputMode="decimal"
                  value={formData.recommended_dose}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isValidDecimalInput(val)) {
                      setFormData({ ...formData, recommended_dose: val });
                    }
                  }}
                  placeholder="0.5"
                  className="h-16 text-xl px-4 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recommended_dose_unit" className="text-base">
                  Unidade da Dose
                </Label>
                <Select
                  value={formData.recommended_dose_unit}
                  onValueChange={(value) => setFormData({ ...formData, recommended_dose_unit: value })}
                >
                  <SelectTrigger className="h-16 text-xl px-4 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="L/ha" className="text-lg py-3">L/ha</SelectItem>
                    <SelectItem value="mL/ha" className="text-lg py-3">mL/ha</SelectItem>
                    <SelectItem value="kg/ha" className="text-lg py-3">kg/ha</SelectItem>
                    <SelectItem value="g/ha" className="text-lg py-3">g/ha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
              {isLoading ? 'Salvando...' : product ? 'Atualizar' : 'Criar Produto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};