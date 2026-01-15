import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useProperties } from "@/hooks/useProperties";
import { useStockMovements, StockMovement } from "@/hooks/useStockMovements";

interface StockMovementDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  defaultType?: 'entrada' | 'saida' | 'ajuste';
  defaultPropertyId?: string;
  defaultProductId?: string;
}

const reasons = {
  entrada: [
    { value: 'compra', label: 'Compra' },
    { value: 'devolucao', label: 'Devolução' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'outro', label: 'Outro' },
  ],
  saida: [
    { value: 'aplicacao', label: 'Aplicação' },
    { value: 'perda', label: 'Perda/Vencimento' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'outro', label: 'Outro' },
  ],
  ajuste: [
    { value: 'ajuste_inventario', label: 'Ajuste de Inventário' },
    { value: 'correcao', label: 'Correção' },
  ],
};

export function StockMovementDialog({ 
  open, 
  onOpenChange, 
  trigger,
  defaultType = 'entrada',
  defaultPropertyId,
  defaultProductId,
}: StockMovementDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { products } = useProducts();
  const { properties } = useProperties();
  const { createMovement } = useStockMovements();

  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  const [formData, setFormData] = useState({
    movement_type: defaultType as 'entrada' | 'saida' | 'ajuste',
    product_id: defaultProductId || '',
    property_id: defaultPropertyId || '',
    quantity_units: '', // Quantidade em embalagens
    unit: '',
    reason: '',
    notes: '',
    movement_date: new Date().toISOString().split('T')[0],
  });

  // Get selected product info
  const selectedProduct = products.find(p => p.id === formData.product_id);
  const packageSize = selectedProduct?.package_size || 1;
  const totalQuantity = Number(formData.quantity_units || 0) * packageSize;

  useEffect(() => {
    if (dialogOpen) {
      setFormData({
        movement_type: defaultType,
        product_id: defaultProductId || '',
        property_id: defaultPropertyId || '',
        quantity_units: '',
        unit: '',
        reason: '',
        notes: '',
        movement_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [dialogOpen, defaultType, defaultProductId, defaultPropertyId]);

  useEffect(() => {
    if (formData.product_id) {
      const product = products.find(p => p.id === formData.product_id);
      if (product) {
        setFormData(prev => ({ ...prev, unit: product.unit }));
      }
    }
  }, [formData.product_id, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Registrar a quantidade total (embalagens × tamanho)
      await createMovement({
        product_id: formData.product_id,
        property_id: formData.property_id,
        movement_type: formData.movement_type,
        quantity: totalQuantity, // Total em unidade base (L, kg, etc)
        unit: formData.unit,
        reason: formData.reason || null,
        notes: formData.notes 
          ? `${formData.notes} (${formData.quantity_units} embalagem(ns) de ${packageSize}${formData.unit})`
          : `${formData.quantity_units} embalagem(ns) de ${packageSize}${formData.unit}`,
        movement_date: new Date(formData.movement_date).toISOString(),
      });
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao criar movimentação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <ArrowDownCircle className="h-4 w-4 text-green-500" />;
      case 'saida': return <ArrowUpCircle className="h-4 w-4 text-red-500" />;
      case 'ajuste': return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Movimentação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon(formData.movement_type)}
            Registrar Movimentação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Movimentação</Label>
            <Select
              value={formData.movement_type}
              onValueChange={(value: 'entrada' | 'saida' | 'ajuste') => 
                setFormData({ ...formData, movement_type: value, reason: '' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="entrada">
                  <span className="flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-green-500" />
                    Entrada
                  </span>
                </SelectItem>
                <SelectItem value="saida">
                  <span className="flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-red-500" />
                    Saída
                  </span>
                </SelectItem>
                <SelectItem value="ajuste">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-500" />
                    Ajuste
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label>Produto *</Label>
            <Select
              value={formData.product_id}
              onValueChange={(value) => setFormData({ ...formData, product_id: value })}
            >
              <SelectTrigger>
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
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Qtd. Embalagens *</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.quantity_units}
                  onChange={(e) => setFormData({ ...formData, quantity_units: e.target.value })}
                  placeholder="Ex: 3"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tamanho cada</Label>
                <Input
                  value={selectedProduct?.package_size ? `${selectedProduct.package_size} ${formData.unit}` : formData.unit}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            {formData.quantity_units && Number(formData.quantity_units) > 0 && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium">
                  Total: <span className="text-primary">{totalQuantity.toFixed(2)} {formData.unit}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.quantity_units} embalagem(ns) × {packageSize} {formData.unit}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={formData.movement_date}
              onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => setFormData({ ...formData, reason: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {reasons[formData.movement_type].map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.product_id || !formData.property_id || !formData.quantity_units || Number(formData.quantity_units) <= 0}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
