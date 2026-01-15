import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowUpCircle, Trash2, BookOpen } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useProperties } from "@/hooks/useProperties";
import { useRecipes } from "@/hooks/useRecipes";
import { useStockMovements } from "@/hooks/useStockMovements";

interface StockMovementDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  defaultPropertyId?: string;
  defaultProductId?: string;
}

interface ProductItem {
  product_id: string;
  product_name: string;
  quantity_units: string;
  unit: string;
  package_size: number;
}

const reasons = {
  saida: [
    { value: 'aplicacao', label: 'Aplicação' },
    { value: 'perda', label: 'Perda/Vencimento' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'outro', label: 'Outro' },
  ],
};

export function StockMovementDialog({ 
  open, 
  onOpenChange, 
  trigger,
  defaultPropertyId,
  defaultProductId,
}: StockMovementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { products } = useProducts();
  const { properties } = useProperties();
  const { recipes } = useRecipes();
  const { createMovement } = useStockMovements();

  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  const [formData, setFormData] = useState({
    property_id: defaultPropertyId || '',
    recipe_id: '',
    reason: '',
    notes: '',
    movement_date: new Date().toISOString().split('T')[0],
  });

  const [productItems, setProductItems] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (dialogOpen) {
      setFormData({
        property_id: defaultPropertyId || '',
        recipe_id: '',
        reason: '',
        notes: '',
        movement_date: new Date().toISOString().split('T')[0],
      });
      
      // Se tiver um produto padrão, adiciona ele
      if (defaultProductId) {
        const product = products.find(p => p.id === defaultProductId);
        if (product) {
          setProductItems([{
            product_id: product.id,
            product_name: product.name,
            quantity_units: '',
            unit: product.unit,
            package_size: product.package_size || 1,
          }]);
        }
      } else {
        setProductItems([]);
      }
    }
  }, [dialogOpen, defaultProductId, defaultPropertyId, products]);

  // Quando seleciona um receituário, preenche os produtos automaticamente
  const handleRecipeChange = (recipeId: string) => {
    setFormData(prev => ({ ...prev, recipe_id: recipeId }));
    
    if (recipeId) {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe && recipe.recipe_products) {
        const items: ProductItem[] = recipe.recipe_products.map(rp => {
          const product = products.find(p => p.id === rp.product_id);
          return {
            product_id: rp.product_id,
            product_name: product?.name || rp.products?.name || 'Produto',
            quantity_units: '',
            unit: product?.unit || 'L',
            package_size: product?.package_size || 1,
          };
        });
        setProductItems(items);
      }
    }
  };

  const updateProductQuantity = (index: number, quantity: string) => {
    setProductItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity_units: quantity } : item
    ));
  };

  const removeProduct = (index: number) => {
    setProductItems(prev => prev.filter((_, i) => i !== index));
  };

  const addProduct = () => {
    setProductItems(prev => [...prev, {
      product_id: '',
      product_name: '',
      quantity_units: '',
      unit: '',
      package_size: 1,
    }]);
  };

  const updateProductSelection = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setProductItems(prev => prev.map((item, i) => 
        i === index ? {
          ...item,
          product_id: productId,
          product_name: product.name,
          unit: product.unit,
          package_size: product.package_size || 1,
        } : item
      ));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Registrar cada produto como uma movimentação separada
      for (const item of productItems) {
        if (item.product_id && item.quantity_units && Number(item.quantity_units) > 0) {
          const totalQuantity = Number(item.quantity_units) * item.package_size;
          
          await createMovement({
            product_id: item.product_id,
            property_id: formData.property_id,
            movement_type: 'saida',
            quantity: totalQuantity,
            unit: item.unit,
            reason: formData.reason || null,
            notes: formData.notes 
              ? `${formData.notes} (${item.quantity_units} embalagem(ns) de ${item.package_size}${item.unit})`
              : `${item.quantity_units} embalagem(ns) de ${item.package_size}${item.unit}`,
            movement_date: new Date(formData.movement_date).toISOString(),
          });
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar movimentação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidProducts = productItems.some(
    item => item.product_id && item.quantity_units && Number(item.quantity_units) > 0
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 h-12 text-lg">
            <Plus className="h-5 w-5" />
            Registrar Saída
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowUpCircle className="h-5 w-5 text-red-500" />
            Registrar Saída de Estoque
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">

          <div className="space-y-1">
            <Label className="text-base">Propriedade *</Label>
            <Select
              value={formData.property_id}
              onValueChange={(value) => setFormData({ ...formData, property_id: value })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Selecione a propriedade" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Carregar do Receituário
            </Label>
            <Select
              value={formData.recipe_id}
              onValueChange={handleRecipeChange}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Selecione um receituário (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-60">
                {recipes.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.name} ({recipe.recipe_products?.length || 0} produtos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Produtos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProduct} className="h-8">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            {productItems.length === 0 ? (
              <p className="text-muted-foreground text-sm py-2">
                Selecione um receituário ou adicione produtos manualmente
              </p>
            ) : (
              <div className="space-y-2">
                {productItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-2 space-y-2">
                    {!item.product_id ? (
                      <Select
                        value={item.product_id}
                        onValueChange={(value) => updateProductSelection(index, value)}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover max-h-60">
                          {products.filter(p => p.active).map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{item.product_name}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeProduct(index)}
                          className="h-7 w-7 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    
                    {item.product_id && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Embalagens</Label>
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            value={item.quantity_units}
                            onChange={(e) => updateProductQuantity(index, e.target.value)}
                            placeholder="Qtd"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamanho</Label>
                          <Input
                            value={`${item.package_size} ${item.unit}`}
                            readOnly
                            className="bg-muted h-9 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Total</Label>
                          <Input
                            value={item.quantity_units ? 
                              `${(Number(item.quantity_units) * item.package_size).toFixed(1)} ${item.unit}` : 
                              '-'
                            }
                            readOnly
                            className="bg-muted h-9 text-sm font-medium text-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-base">Data</Label>
            <Input
              type="date"
              value={formData.movement_date}
              onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
              className="h-11 text-base"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-base">Motivo</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
            >
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {reasons.saida.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-base">Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={2}
              className="text-base"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 h-11">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.property_id || !hasValidProducts} 
              className="flex-1 h-11 text-base"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
