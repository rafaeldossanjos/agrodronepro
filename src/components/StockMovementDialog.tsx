import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowUpCircle, Trash2, BookOpen, Search, Pencil } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useProperties } from "@/hooks/useProperties";
import { cn } from "@/lib/utils";
import { useRecipes } from "@/hooks/useRecipes";
import { useStockMovements, StockMovement } from "@/hooks/useStockMovements";

interface StockMovementDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  defaultPropertyId?: string;
  defaultProductId?: string;
  editingMovement?: StockMovement | null;
  onEditComplete?: () => void;
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

// Componente de autocomplete para produtos
interface ProductAutocompleteInputProps {
  products: Array<{
    id: string;
    name: string;
    unit: string;
    package_size?: number | null;
  }>;
  onSelect: (product: { id: string; name: string; unit: string; package_size: number | null }) => void;
  placeholder?: string;
}

function ProductAutocompleteInput({ products, onSelect, placeholder }: ProductAutocompleteInputProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (product: typeof products[0]) => {
    setSearch('');
    setIsOpen(false);
    onSelect({
      id: product.id,
      name: product.name,
      unit: product.unit,
      package_size: product.package_size ?? null,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            setHighlightIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 h-14 text-lg"
        />
      </div>
      
      {isOpen && search.length > 0 && (
        <ul 
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-md border bg-popover shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-base text-muted-foreground">
              Nenhum produto encontrado
            </li>
          ) : (
            filtered.map((product, idx) => (
              <li
                key={product.id}
                onClick={() => handleSelect(product)}
                className={cn(
                  "px-4 py-3 text-base cursor-pointer flex justify-between items-center",
                  idx === highlightIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <span className="font-medium">{product.name}</span>
                <span className="text-sm text-muted-foreground">{product.unit}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function StockMovementDialog({
  open, 
  onOpenChange, 
  trigger,
  defaultPropertyId,
  defaultProductId,
  editingMovement,
  onEditComplete,
}: StockMovementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { products } = useProducts();
  const { properties } = useProperties();
  const { recipes } = useRecipes();
  const { createMovement, updateMovement } = useStockMovements();

  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  const isEditing = !!editingMovement;

  const [formData, setFormData] = useState({
    property_id: defaultPropertyId || '',
    recipe_id: '',
    reason: 'aplicacao', // Pré-selecionado como "Aplicação"
    notes: '',
    movement_date: new Date().toISOString().split('T')[0],
  });

  const [productItems, setProductItems] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (dialogOpen) {
      if (editingMovement) {
        // Modo edição: preencher com dados existentes
        const product = products.find(p => p.id === editingMovement.product_id);
        const packageSize = product?.package_size || 1;
        const quantityUnits = packageSize > 0 ? (editingMovement.quantity / packageSize) : editingMovement.quantity;
        
        setFormData({
          property_id: editingMovement.property_id,
          recipe_id: '',
          reason: editingMovement.reason || '',
          notes: editingMovement.notes || '',
          movement_date: editingMovement.movement_date.split('T')[0],
        });
        
        setProductItems([{
          product_id: editingMovement.product_id,
          product_name: editingMovement.product?.name || product?.name || '',
          quantity_units: quantityUnits.toString(),
          unit: editingMovement.unit,
          package_size: packageSize,
        }]);
      } else {
        // Modo criação
        setFormData({
          property_id: defaultPropertyId || '',
          recipe_id: '',
          reason: 'aplicacao', // Pré-selecionado como "Aplicação"
          notes: '',
          movement_date: new Date().toISOString().split('T')[0],
        });
        
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
    }
  }, [dialogOpen, editingMovement, defaultProductId, defaultPropertyId, products]);

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
      if (isEditing && editingMovement) {
        // Atualizar movimentação existente
        const item = productItems[0];
        if (item && item.product_id && item.quantity_units && Number(item.quantity_units) > 0) {
          const totalQuantity = Number(item.quantity_units) * item.package_size;
          
          await updateMovement(editingMovement.id, {
            product_id: item.product_id,
            property_id: formData.property_id,
            quantity: totalQuantity,
            unit: item.unit,
            reason: formData.reason || null,
            notes: formData.notes || null,
            movement_date: new Date(formData.movement_date).toISOString(),
          });
        }
        onEditComplete?.();
      } else {
        // Criar novas movimentações
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
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidProducts = productItems.some(
    item => item.product_id && item.quantity_units && Number(item.quantity_units) > 0
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2">
              <Plus className="h-5 w-5" />
              Registrar Saída
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[85vh] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="h-5 w-5 text-primary" />
                Editar Movimentação
              </>
            ) : (
              <>
                <ArrowUpCircle className="h-5 w-5 text-red-500" />
                Registrar Saída de Estoque
              </>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isEditing ? 'Atualize os dados da movimentação' : 'Registre a retirada de produtos do estoque'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">

          <div className="space-y-1.5">
            <Label>Propriedade *</Label>
            <Select
              value={formData.property_id}
              onValueChange={(value) => setFormData({ ...formData, property_id: value })}
            >
              <SelectTrigger>
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

          {!isEditing && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Carregar do Receituário
              </Label>
              <Select
                value={formData.recipe_id}
                onValueChange={handleRecipeChange}
              >
                <SelectTrigger>
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
          )}

          <div className="space-y-2">
            <Label className="font-semibold">Produtos</Label>
            
            {productItems.length === 0 ? (
              <p className="text-muted-foreground text-sm py-2">
                Selecione um receituário ou adicione produtos manualmente
              </p>
            ) : (
              <div className="space-y-2">
                {productItems.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    {!item.product_id ? (
                      <ProductAutocompleteInput
                        products={products.filter(p => p.active)}
                        onSelect={(product) => {
                          setProductItems(prev => prev.map((it, i) => 
                            i === index ? {
                              ...it,
                              product_id: product.id,
                              product_name: product.name,
                              unit: product.unit,
                              package_size: product.package_size || 1,
                            } : it
                          ));
                        }}
                        placeholder="Digite para buscar produto..."
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{item.product_name}</span>
                        {!isEditing && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeProduct(index)}
                            className="h-8 w-8 p-0 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {item.product_id && (
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Embalagens</Label>
                          <Input
                            type="number"
                            step="0.5"
                            min="0.5"
                            value={item.quantity_units}
                            onChange={(e) => updateProductQuantity(index, e.target.value)}
                            placeholder="Qtd"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tamanho</Label>
                          <Input
                            value={`${item.package_size} ${item.unit}`}
                            readOnly
                            className="bg-muted"
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
                            className="bg-muted font-medium text-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {!isEditing && (
              <Button type="button" variant="outline" onClick={addProduct} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Data da Movimentação</Label>
            <Input
              type="date"
              value={formData.movement_date}
              onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Data em que a retirada foi realizada
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Motivo da Saída</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
            >
              <SelectTrigger>
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

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre a movimentação..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDialogOpen(false)} 
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.property_id || !hasValidProducts} 
              className="flex-1"
            >
              {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Salvar Saída'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
