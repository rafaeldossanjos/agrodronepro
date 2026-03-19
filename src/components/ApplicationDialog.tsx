import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProperties } from "@/hooks/useProperties";
import { useProducts, Product } from "@/hooks/useProducts";
import { useRecipes } from "@/hooks/useRecipes";
import { usePlots } from "@/hooks/usePlots";
import { Application } from "@/hooks/useApplications";
import { z } from "zod";
import { Plus, X, Check, BookOpen, MapPin, Map as MapIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, isValidDecimalInput, parseDecimalInput } from "@/lib/utils";

const productItemSchema = z.object({
  product_id: z.string().uuid("Selecione um produto"),
  dose_per_ha: z.number().min(0.01, "Dose deve ser maior que 0"),
  total_amount: z.number().min(0),
  unit_cost: z.number().min(0),
  total_cost: z.number().min(0),
});

const applicationSchema = z.object({
  property_id: z.string().uuid("Selecione uma propriedade"),
  plot_id: z.string().uuid().nullable().optional(),
  plot_name: z.string().optional(),
  name: z.string().trim().min(1, "Nome da aplicação é obrigatório").max(120, "Máximo 120 caracteres"),
  application_date: z.string().min(1, "Data é obrigatória"),
  application_type: z.enum(['pulverização', 'adubação', 'semeadura', 'outro']),
  status: z.enum(['planejada', 'em_andamento', 'concluída', 'cancelada']),
  area_applied: z.number().min(0.1, "Área deve ser maior que 0"),
  products: z.array(productItemSchema).min(1, "Adicione pelo menos um produto"),
  total_cost: z.number().min(0),
  notes: z.string().nullable(),
});

interface ProductItem {
  product_id: string;
  dose_per_ha: number;
  dose_input: string; // Para permitir digitar valores como "0.5"
  dose_unit: string; // Unidade selecionada para a dose
  total_amount: number;
  unit_cost: number;
  total_cost: number;
}

// Conversões de unidade
const unitConversions: Record<string, Record<string, number>> = {
  L: { L: 1, mL: 0.001, kg: 1, g: 0.001 },
  mL: { mL: 1, L: 1000, g: 1, kg: 1000 },
  kg: { kg: 1, g: 0.001, L: 1, mL: 0.001 },
  g: { g: 1, kg: 1000, mL: 1, L: 1000 },
};

const availableUnits = ['L', 'mL', 'kg', 'g'];

const convertDose = (value: number, fromUnit: string, toUnit: string): number => {
  if (fromUnit === toUnit) return value;
  const conversion = unitConversions[fromUnit]?.[toUnit];
  if (conversion) return value * conversion;
  return value;
};

interface ApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  application?: Application;
}

// Componente de autocompletar para produtos
function ProductAutocomplete({ 
  products, 
  selectedProductId, 
  onSelect 
}: { 
  products: Product[]; 
  selectedProductId: string; 
  onSelect: (id: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Filtrar produtos baseado no input
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(inputValue.toLowerCase()) ||
    (p.manufacturer && p.manufacturer.toLowerCase().includes(inputValue.toLowerCase()))
  );

  useEffect(() => {
    if (selectedProduct && !isOpen) {
      setInputValue(selectedProduct.name);
    }
  }, [selectedProduct, isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts.length]);

  const handleSelect = (product: Product) => {
    onSelect(product.id);
    setInputValue(product.name);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, filteredProducts.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredProducts[highlightedIndex]) {
          handleSelect(filteredProducts[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        if (selectedProduct) {
          setInputValue(selectedProduct.name);
        }
        break;
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
          if (!e.target.value && selectedProductId) {
            onSelect("");
          }
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay to allow click on list item
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Digite para buscar produto..."
        className="h-14 text-lg"
      />
      {isOpen && filteredProducts.length > 0 && (
        <div 
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border bg-popover shadow-lg"
        >
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className={cn(
                "flex items-center justify-between px-4 py-3 cursor-pointer text-lg min-h-[52px]",
                index === highlightedIndex && "bg-accent",
                product.id === selectedProductId && "bg-primary/10"
              )}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(product);
              }}
            >
              <div className="flex flex-col">
                <span className="font-medium text-lg">{product.name}</span>
                <span className="text-muted-foreground text-base">
                  R$ {product.unit_price.toFixed(2)}/{product.unit}
                  {product.manufacturer && ` • ${product.manufacturer}`}
                </span>
              </div>
              {product.id === selectedProductId && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
          ))}
        </div>
      )}
      {isOpen && filteredProducts.length === 0 && inputValue && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-popover p-4 shadow-lg">
          <p className="text-lg text-muted-foreground">
            Nenhum produto encontrado
          </p>
        </div>
      )}
    </div>
  );
}

export function ApplicationDialog({ open, onOpenChange, onSave, application }: ApplicationDialogProps) {
  const navigate = useNavigate();
  const { properties } = useProperties();
  const { products } = useProducts();
  const { recipes } = useRecipes();
  const { plots, isLoading: plotsLoading } = usePlots();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");

  const loadRecipe = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.recipe_products) return;

    const newProducts: ProductItem[] = recipe.recipe_products.map(rp => {
      const prod = products.find(p => p.id === rp.product_id);
      return {
        product_id: rp.product_id,
        dose_per_ha: rp.dose_per_ha,
        dose_input: rp.dose_per_ha.toString(),
        dose_unit: rp.dose_unit || prod?.unit || 'L',
        total_amount: formData.area_applied > 0 ? rp.dose_per_ha * formData.area_applied : 0,
        unit_cost: prod?.unit_price || 0,
        total_cost: 0,
      };
    });

    if (newProducts.length > 0) {
      const totalCost = newProducts.reduce((sum, p) => sum + p.total_cost, 0);
      setFormData(prev => ({ ...prev, products: newProducts, total_cost: totalCost }));
    }
    setSelectedRecipeId(recipeId);
  };
  
  const [areaInput, setAreaInput] = useState("");
  
  const [formData, setFormData] = useState<{
    property_id: string;
    plot_id: string | null;
    plot_name: string;
    name: string;
    application_date: string;
    application_type: 'pulverização' | 'adubação' | 'semeadura' | 'outro';
    status: 'planejada' | 'em_andamento' | 'concluída' | 'cancelada';
    area_applied: number;
    products: ProductItem[];
    total_cost: number;
    notes: string;
  }>({
    property_id: "",
    plot_id: null,
    plot_name: "",
    name: "",
    application_date: new Date().toISOString().split('T')[0], // Data atual pré-preenchida
    application_type: "pulverização",
    status: "planejada",
    area_applied: 0,
    products: [{ product_id: "", dose_per_ha: 0, dose_input: "", dose_unit: "L", total_amount: 0, unit_cost: 0, total_cost: 0 }],
    total_cost: 0,
    notes: "",
  });

  // Show all plots when a property is selected - user can link any plot to any property
  const availablePlots = useMemo(() => {
    if (!formData.property_id) return [];
    // Use spread to avoid mutating original array
    return [...plots].sort((a, b) => {
      const aLinked = a.property_id === formData.property_id ? 0 : 1;
      const bLinked = b.property_id === formData.property_id ? 0 : 1;
      if (aLinked !== bLinked) return aLinked - bLinked;
      return a.name.localeCompare(b.name);
    });
  }, [plots, formData.property_id, formData.plot_id]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (application) {
      // Carregar produtos da aplicação existente
      const loadedProducts = application.application_products && application.application_products.length > 0
        ? application.application_products.map(ap => {
            const prod = products.find(p => p.id === ap.product_id);
            return {
              product_id: ap.product_id,
              dose_per_ha: ap.dose_per_ha,
              dose_input: ap.dose_per_ha.toString(),
              dose_unit: prod?.unit || 'L',
              total_amount: ap.total_amount,
              unit_cost: ap.unit_cost,
              total_cost: ap.total_cost,
            };
          })
        : [{ product_id: "", dose_per_ha: 0, dose_input: "", dose_unit: "L", total_amount: 0, unit_cost: 0, total_cost: 0 }];

      setFormData({
        property_id: application.property_id,
        plot_id: application.plot_id || null,
        plot_name: application.plot_name || "",
        name: (application as any).name || "",
        application_date: application.application_date,
        application_type: application.application_type,
        status: application.status,
        area_applied: application.area_applied,
        products: loadedProducts,
        total_cost: application.total_cost,
        notes: application.notes || "",
      });
      setAreaInput(application.area_applied > 0 ? application.area_applied.toString() : "");
    } else {
      // Reset form quando não está editando
      setFormData({
        property_id: "",
        plot_id: null,
        plot_name: "",
        name: "",
        application_date: new Date().toISOString().split('T')[0], // Data atual pré-preenchida
        application_type: "pulverização",
        status: "planejada",
        area_applied: 0,
        products: [{ product_id: "", dose_per_ha: 0, dose_input: "", dose_unit: "L", total_amount: 0, unit_cost: 0, total_cost: 0 }],
        total_cost: 0,
        notes: "",
      });
      setAreaInput("");
    }
    setErrors({});
  }, [application, open]);

  const updateProductCalculations = (index: number, updates: Partial<ProductItem>) => {
    const newProducts = [...formData.products];
    const product = { ...newProducts[index], ...updates };
    
    // Se mudou o produto_id, pegar o preço e definir a unidade
    if (updates.product_id) {
      const selectedProduct = products.find(p => p.id === updates.product_id);
      if (selectedProduct) {
        product.unit_cost = selectedProduct.unit_price;
        product.dose_unit = selectedProduct.unit;
      }
    }
    
    // Se mudou o dose_input (texto), converter para número
    if (updates.dose_input !== undefined) {
      const numValue = parseDecimalInput(updates.dose_input);
      const selectedProduct = products.find(p => p.id === product.product_id);
      const targetUnit = selectedProduct?.unit || product.dose_unit;
      
      // Converter da unidade selecionada para a unidade do produto
      product.dose_per_ha = convertDose(numValue, product.dose_unit, targetUnit);
    }
    
    // Se mudou a unidade, reconverter a dose
    if (updates.dose_unit && product.dose_input) {
      const numValue = parseDecimalInput(product.dose_input);
      const selectedProduct = products.find(p => p.id === product.product_id);
      const targetUnit = selectedProduct?.unit || updates.dose_unit;
      
      product.dose_per_ha = convertDose(numValue, updates.dose_unit, targetUnit);
    }
    
    // Calcular quantidade total baseado na dose e área
    if (formData.area_applied > 0 && product.dose_per_ha > 0) {
      product.total_amount = product.dose_per_ha * formData.area_applied;
    } else {
      product.total_amount = 0;
    }
    
    // Calcular custo total do produto
    product.total_cost = product.total_amount * product.unit_cost;
    
    newProducts[index] = product;
    
    // Calcular custo total da aplicação
    const totalCost = newProducts.reduce((sum, p) => sum + p.total_cost, 0);
    
    setFormData({ ...formData, products: newProducts, total_cost: totalCost });
  };

  const addProduct = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { product_id: "", dose_per_ha: 0, dose_input: "", dose_unit: "L", total_amount: 0, unit_cost: 0, total_cost: 0 }],
    });
  };

  const removeProduct = (index: number) => {
    if (formData.products.length > 1) {
      const newProducts = formData.products.filter((_, i) => i !== index);
      const totalCost = newProducts.reduce((sum, p) => sum + p.total_cost, 0);
      setFormData({ ...formData, products: newProducts, total_cost: totalCost });
    }
  };

  const handleAreaChange = (area: number, additionalUpdates?: Partial<typeof formData>, updateInput?: boolean) => {
    if (updateInput) {
      setAreaInput(area > 0 ? area.toString() : "");
    }
    setFormData(prev => {
      const newProducts = prev.products.map(p => {
        const total_amount = area > 0 && p.dose_per_ha > 0 ? p.dose_per_ha * area : 0;
        const total_cost = total_amount * p.unit_cost;
        return { ...p, total_amount, total_cost };
      });
      const totalCost = newProducts.reduce((sum, p) => sum + p.total_cost, 0);
      return { ...prev, ...additionalUpdates, area_applied: area, products: newProducts, total_cost: totalCost };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = applicationSchema.parse({
        ...formData,
        plot_id: formData.plot_id || null,
        area_applied: Number(formData.area_applied),
        products: formData.products.map(p => ({
          ...p,
          dose_per_ha: Number(p.dose_per_ha),
          total_amount: Number(p.total_amount),
          unit_cost: Number(p.unit_cost),
          total_cost: Number(p.total_cost),
        })),
        total_cost: Number(formData.total_cost),
        notes: formData.notes || null,
      });

      onSave(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] max-h-[80dvh] flex flex-col p-0 gap-0 rounded-t-2xl sm:rounded-xl">
        <DialogHeader className="px-4 sm:px-6 pt-3 sm:pt-4 pb-3 border-b shrink-0">
          <DialogTitle className="text-2xl sm:text-3xl font-bold">
            {application ? "Editar Aplicação" : "Nova Aplicação"}
          </DialogTitle>
          <p className="text-base sm:text-lg text-muted-foreground mt-1">
            {application ? "Atualize os dados da aplicação" : "Registre uma nova aplicação agrícola"}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-scroll px-4 sm:px-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <form id="application-form" onSubmit={handleSubmit} className="space-y-4 py-3 pb-4">
            {/* Receituário (apenas para nova aplicação) */}
            {!application && recipes.length > 0 && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Carregar Receituário
                </Label>
                <Select value={selectedRecipeId} onValueChange={loadRecipe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um receituário (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name} ({recipe.recipe_products?.length || 0} produtos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Informações Básicas */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground">Informações Básicas</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="property_id" className="text-lg font-medium">Propriedade *</Label>
                  <Select
                    value={formData.property_id}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        property_id: value,
                      }))
                    }
                  >
                    <SelectTrigger className={`h-14 text-lg rounded-xl ${errors.property_id ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id} className="text-lg py-3">
                          {prop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.property_id && (
                    <p className="text-sm text-destructive">{errors.property_id}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plot_id" className="flex items-center gap-2 text-lg font-medium">
                    <MapPin className="h-5 w-5" />
                    Talhão
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.plot_id || "none"}
                      onValueChange={(value) => {
                        const selectedPlot = availablePlots.find(p => p.id === value);
                        const newPlotId = value === "none" ? null : value;
                        const newPlotName = selectedPlot?.name || (value === "none" ? "" : formData.plot_name);
                        
                        setFormData(prev => ({ 
                          ...prev, 
                          plot_id: newPlotId,
                          plot_name: newPlotName,
                        }));
                      }}
                      disabled={!formData.property_id}
                    >
                      <SelectTrigger className="flex-1 h-14 text-lg rounded-xl">
                        <SelectValue placeholder={
                          !formData.property_id 
                            ? "Selecione a propriedade" 
                            : plotsLoading 
                              ? "Carregando..." 
                              : "Selecione um talhão"
                        } />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        <SelectItem value="none" className="text-lg py-3">Nenhum</SelectItem>
                        {availablePlots.map((plot) => (
                          <SelectItem key={plot.id} value={plot.id} className="text-lg py-3">
                            {plot.name} {plot.area_hectares ? `(${plot.area_hectares} ha)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.plot_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/map');
                        }}
                        title="Ver no Mapa"
                      >
                        <MapIcon className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-lg font-medium">Nome da Aplicação *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`h-14 text-lg rounded-xl ${errors.name ? "border-destructive" : ""}`}
                    placeholder="Ex: Dessecação Talhão Norte"
                    required
                  />
                  {errors.name && (
                    <p className="text-base text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="application_date" className="text-lg font-medium">Data *</Label>
                  <Input
                    id="application_date"
                    type="date"
                    value={formData.application_date}
                    onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                    className={`h-14 text-lg rounded-xl ${errors.application_date ? "border-destructive" : ""}`}
                  />
                  {errors.application_date && (
                    <p className="text-base text-destructive">{errors.application_date}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="application_type" className="text-lg font-medium">Tipo *</Label>
                  <Select
                    value={formData.application_type}
                    onValueChange={(value: any) => setFormData({ ...formData, application_type: value })}
                  >
                    <SelectTrigger className="h-14 text-lg rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pulverização" className="text-lg py-3">Pulverização</SelectItem>
                      <SelectItem value="adubação" className="text-lg py-3">Adubação</SelectItem>
                      <SelectItem value="semeadura" className="text-lg py-3">Semeadura</SelectItem>
                      <SelectItem value="outro" className="text-lg py-3">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-lg font-medium">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-14 text-lg rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejada" className="text-lg py-3">Planejada</SelectItem>
                      <SelectItem value="em_andamento" className="text-lg py-3">Em Andamento</SelectItem>
                      <SelectItem value="concluída" className="text-lg py-3">Concluída</SelectItem>
                      <SelectItem value="cancelada" className="text-lg py-3">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area_applied" className="text-lg font-medium">Área (ha) *</Label>
                  <Input
                    id="area_applied"
                    type="text"
                    inputMode="decimal"
                    value={areaInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (isValidDecimalInput(val)) {
                        setAreaInput(val);
                        handleAreaChange(parseDecimalInput(val));
                      }
                    }}
                    className={`h-14 text-lg rounded-xl ${errors.area_applied ? "border-destructive" : ""}`}
                    placeholder="Ex: 10,5"
                  />
                  {errors.area_applied && (
                    <p className="text-base text-destructive">{errors.area_applied}</p>
                  )}
                </div>

              </div>
            </div>

            {/* Produtos */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground">Produtos Aplicados *</h3>

              {errors.products && (
                <p className="text-base text-destructive">{errors.products}</p>
              )}

              <div className="space-y-3">
                {formData.products.map((productItem, index) => (
                  <Card key={index} className="p-4 bg-muted/30 rounded-xl">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-muted-foreground">
                          Produto {index + 1}
                        </span>
                        {formData.products.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(index)}
                            className="h-12 w-12 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-6 w-6" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label className="text-lg font-medium">Produto *</Label>
                          <ProductAutocomplete
                            products={products.filter(p => p.active)}
                            selectedProductId={productItem.product_id}
                            onSelect={(productId) => updateProductCalculations(index, { product_id: productId })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-lg font-medium">Dose/ha *</Label>
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={productItem.dose_input}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^[0-9]*[.,]?[0-9]*$/.test(value)) {
                                  updateProductCalculations(index, { dose_input: value.replace(',', '.') });
                                }
                              }}
                              className="flex-1 h-14 text-lg rounded-xl"
                              placeholder="0.5"
                            />
                            <Select
                              value={productItem.dose_unit}
                              onValueChange={(value) => updateProductCalculations(index, { dose_unit: value })}
                            >
                              <SelectTrigger className="w-24 h-14 text-lg rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                {availableUnits.map((unit) => (
                                  <SelectItem key={unit} value={unit} className="text-lg py-3">
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label>
                            Total
                            {productItem.product_id && (
                              <span className="text-muted-foreground ml-1">
                                ({products.find(p => p.id === productItem.product_id)?.unit || 'L'})
                              </span>
                            )}
                          </Label>
                          <Input
                            type="text"
                            value={productItem.total_amount.toFixed(2)}
                            className="bg-muted font-medium"
                            readOnly
                          />
                        </div>

                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={addProduct}
                className="gap-2 w-full"
              >
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Informações adicionais..."
              />
            </div>
          </form>
        </div>

        <div className="flex gap-3 px-4 sm:px-6 py-3 border-t bg-background shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" form="application-form" className="flex-1">
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}