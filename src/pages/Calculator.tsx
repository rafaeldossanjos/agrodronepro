import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator as CalcIcon, Plus, Trash2, Package, Save, Settings2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useProducts } from "@/hooks/useProducts";
import { useProperties } from "@/hooks/useProperties";
import { useApplications } from "@/hooks/useApplications";
import { useRecipes } from "@/hooks/useRecipes";
import { ProductDialog } from "@/components/ProductDialog";
import { ProductAutocomplete } from "@/components/ProductAutocomplete";
import { isValidDecimalInput, parseDecimalInput } from "@/lib/utils";

const SAVED_PARAMS_KEY = "calculator_default_params";

const calculationSchema = z.object({
  area: z.number().min(0.0001, 'Área deve ser maior que 0').max(100000, 'Área muito grande'),
  flowRate: z.number().min(0.1, 'Vazão deve ser maior que 0').max(1000, 'Vazão muito alta'),
  tankVolume: z.number().min(1, 'Capacidade do tanque deve ser maior que 0').max(10000, 'Capacidade muito alta'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório').max(100),
  dose: z.number().min(0.0001, 'Dose deve ser maior que 0').max(100000, 'Dose muito alta'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
});

type Product = {
  id: string;
  productId?: string;
  name: string;
  dose: string;
  unit: string;
};

type TankBreakdown = {
  tankNumber: number;
  volume: number;
  water: number;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
  }>;
  isComplement: boolean;
};

type CalculationResults = {
  totalVolume: number;
  tanks: number;
  volumePerTank: number;
  totalProductVolume: number;
  waterPerTank: number;
  totalWater: number;
  tankBreakdown: TankBreakdown[];
  productPerTank: Array<{
    id: string;
    productId?: string;
    name: string;
    dose: number;
    unit: string;
    quantityPerTank: number;
    totalQuantity: number;
  }>;
};

type SavedParams = {
  flowRate: string;
  tankVolume: string;
};

// Helper para formatar quantidade com conversão automática de unidades
const formatQuantity = (value: number, unit: string): string => {
  const baseUnit = unit.replace('/ha', '').trim().toLowerCase();
  
  // Converter g para kg se >= 1000g
  if (baseUnit === 'g' && value >= 1000) {
    const kg = value / 1000;
    return kg < 10 ? `${kg.toFixed(2)} kg` : `${kg.toFixed(1)} kg`;
  }
  // Converter kg para g se < 1kg
  if (baseUnit === 'kg' && value < 1 && value > 0) {
    return `${Math.round(value * 1000)} g`;
  }
  // Converter mL para L se >= 1000mL
  if (baseUnit === 'ml' && value >= 1000) {
    const liters = value / 1000;
    return liters < 10 ? `${liters.toFixed(2)} L` : `${liters.toFixed(1)} L`;
  }
  // Converter L para mL se < 1L
  if (baseUnit === 'l' && value < 1 && value > 0) {
    return `${Math.round(value * 1000)} mL`;
  }
  
  // Formatação padrão com unidade original (capitalizada)
  const displayUnit = baseUnit === 'ml' ? 'mL' : baseUnit === 'l' ? 'L' : baseUnit;
  if (value < 10) {
    return `${value.toFixed(2)} ${displayUnit}`;
  }
  return `${value.toFixed(1)} ${displayUnit}`;
};

export default function Calculator() {
  const { products: registeredProducts, isLoading: loadingProducts } = useProducts();
  const { properties } = useProperties();
  const { createApplication } = useApplications();
  const { recipes } = useRecipes();
  
  const getSavedParams = (): SavedParams | null => {
    try {
      const saved = localStorage.getItem(SAVED_PARAMS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };
  
  const savedParams = getSavedParams();
  const [area, setArea] = useState<string>("");
  const [flowRate, setFlowRate] = useState<string>(savedParams?.flowRate || "");
  const [tankVolume, setTankVolume] = useState<string>(savedParams?.tankVolume || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [hasSavedParams, setHasSavedParams] = useState(!!savedParams);
  const [showSaveParamsDialog, setShowSaveParamsDialog] = useState(false);
  
  // Dialog para salvar como aplicação
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveAppName, setSaveAppName] = useState<string>("");
  const [savePropertyId, setSavePropertyId] = useState<string>("");
  const [savePlotName, setSavePlotName] = useState<string>("");
  const [saveDate, setSaveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState<string>("planejada");

  // Dialog para salvar como receituário
  const [saveRecipeDialogOpen, setSaveRecipeDialogOpen] = useState(false);
  const [recipeName, setRecipeName] = useState<string>("");
  const [recipeDescription, setRecipeDescription] = useState<string>("");
  const { createRecipe } = useRecipes();

  useEffect(() => {
    if (products.length === 0) {
      addProduct();
    }
  }, []);

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: Date.now().toString(),
        productId: undefined,
        name: "",
        dose: "",
        unit: "L/ha",
      },
    ]);
  };

  const selectRegisteredProduct = (localId: string, selectedProduct: typeof registeredProducts[0]) => {
    setProducts(
      products.map((p) => 
        p.id === localId 
          ? { 
              ...p, 
              productId: selectedProduct.id,
              name: selectedProduct.name,
              unit: selectedProduct.recommended_dose_unit || 
                    (selectedProduct.unit === 'L' ? 'L/ha' : 
                     selectedProduct.unit === 'mL' ? 'mL/ha' :
                     selectedProduct.unit === 'kg' ? 'kg/ha' : 'g/ha'),
              dose: selectedProduct.recommended_dose ? String(selectedProduct.recommended_dose) : ""
            } 
          : p
      )
    );
    setCalculated(false);
  };

  const loadRecipe = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.recipe_products) return;

    const newProducts = recipe.recipe_products.map(rp => {
      const registeredProduct = registeredProducts.find(p => p.id === rp.product_id);
      return {
        id: Date.now().toString() + Math.random(),
        productId: rp.product_id,
        name: registeredProduct?.name || rp.products?.name || "",
        dose: String(rp.dose_per_ha),
        unit: rp.dose_unit,
      };
    });

    setProducts(newProducts);
    setCalculated(false);
    toast.success(`Receituário "${recipe.name}" carregado!`);
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    setCalculated(false);
  };

  const updateProduct = (id: string, field: keyof Product, value: any) => {
    setProducts(prev =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    setCalculated(false);
  };

  const updateProductFields = (id: string, fields: Partial<Product>) => {
    setProducts(prev =>
      prev.map((p) => (p.id === id ? { ...p, ...fields } : p))
    );
    setCalculated(false);
  };

  const saveDefaultParams = () => {
    const params: SavedParams = { flowRate, tankVolume };
    localStorage.setItem(SAVED_PARAMS_KEY, JSON.stringify(params));
    setHasSavedParams(true);
    setShowSaveParamsDialog(false);
    toast.success("Parâmetros salvos como padrão!");
  };

  const clearDefaultParams = () => {
    localStorage.removeItem(SAVED_PARAMS_KEY);
    setHasSavedParams(false);
    setFlowRate("");
    setTankVolume("");
    setCalculated(false);
    toast.success("Parâmetros limpos!");
  };

  const calculate = () => {
    const areaNum = parseDecimalInput(area);
    const flowRateNum = parseDecimalInput(flowRate);
    const tankVolumeNum = parseDecimalInput(tankVolume);
    
    if (!area || areaNum <= 0) {
      toast.error("Área é obrigatória");
      return;
    }
    if (!flowRate || flowRateNum <= 0) {
      toast.error("Vazão é obrigatória");
      return;
    }
    if (!tankVolume || tankVolumeNum <= 0) {
      toast.error("Capacidade do tanque é obrigatória");
      return;
    }
    
    try {
      calculationSchema.parse({ area: areaNum, flowRate: flowRateNum, tankVolume: tankVolumeNum });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (products.length === 0) {
      toast.error("Adicione pelo menos um produto");
      return;
    }

    for (const p of products) {
      const doseValue = parseDecimalInput(p.dose);
      try {
        productSchema.parse({ ...p, dose: doseValue });
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(`Produto "${p.name || 'sem nome'}": ${error.errors[0].message}`);
          return;
        }
      }
    }

    const totalVolume = areaNum * flowRateNum;
    const fullTanks = Math.floor(totalVolume / tankVolumeNum);
    const remainder = totalVolume - (fullTanks * tankVolumeNum);
    const tanks = remainder > 0 ? fullTanks + 1 : fullTanks;
    const volumePerTank = tankVolumeNum; // Tanques cheios usam capacidade total

    const productPerTank = products.map((p) => {
      const doseValue = parseDecimalInput(p.dose);
      const totalQuantity = doseValue * areaNum;
      // Para "por tanque" mantemos proporcional ao volume de um tanque cheio
      const quantityPerTank = (doseValue * flowRateNum * tankVolumeNum) / totalVolume * areaNum / tanks;

      return {
        ...p,
        dose: doseValue,
        quantityPerTank: totalQuantity / tanks, // Média para compatibilidade
        totalQuantity,
      };
    });

    // Calcular o volume de produtos em LITROS para subtrair da água
    // Considera densidade 1:1 para sólidos (1kg = 1L, 1g = 1mL)
    const totalProductVolumeInLiters = productPerTank.reduce((sum, p) => {
      const normalizedUnit = p.unit.trim().toLowerCase();
      const baseUnit = normalizedUnit.replace("/ha", "");

      // Líquidos
      if (baseUnit === "ml") return sum + p.quantityPerTank / 1000;
      if (baseUnit === "l") return sum + p.quantityPerTank;
      
      // Sólidos com densidade 1:1 (1kg = 1L, 1g = 1mL = 0.001L)
      if (baseUnit === "g") return sum + p.quantityPerTank / 1000;
      if (baseUnit === "kg") return sum + p.quantityPerTank;

      return sum;
    }, 0);

    const totalProductVolume = productPerTank.reduce(
      (sum, p) => sum + p.quantityPerTank,
      0
    );

    const waterPerTank = volumePerTank - totalProductVolumeInLiters;
    const totalWater = totalVolume - (totalProductVolumeInLiters * tanks / (remainder > 0 ? tanks : tanks));

    // Criar breakdown detalhado de cada tanque
    const tankBreakdown: TankBreakdown[] = [];
    
    for (let i = 0; i < tanks; i++) {
      const isComplement = remainder > 0 && i === tanks - 1;
      const tankVolume = isComplement ? remainder : tankVolumeNum;
      const volumeRatio = tankVolume / totalVolume;
      
      // Calcular produtos proporcionais ao volume deste tanque
      const tankProducts = productPerTank.map(p => ({
        id: p.id,
        name: p.name,
        quantity: p.totalQuantity * volumeRatio,
        unit: p.unit,
      }));
      
      // Calcular volume de produtos em litros para este tanque
      const productVolumeInLiters = tankProducts.reduce((sum, p) => {
        const normalizedUnit = p.unit.trim().toLowerCase();
        const baseUnit = normalizedUnit.replace("/ha", "");
        if (baseUnit === "ml") return sum + p.quantity / 1000;
        if (baseUnit === "l") return sum + p.quantity;
        if (baseUnit === "g") return sum + p.quantity / 1000;
        if (baseUnit === "kg") return sum + p.quantity;
        return sum;
      }, 0);
      
      tankBreakdown.push({
        tankNumber: i + 1,
        volume: tankVolume,
        water: tankVolume - productVolumeInLiters,
        products: tankProducts,
        isComplement,
      });
    }

    const calculationResults: CalculationResults = {
      totalVolume,
      tanks,
      volumePerTank: tankVolumeNum,
      totalProductVolume,
      waterPerTank,
      totalWater: tankBreakdown.reduce((sum, t) => sum + t.water, 0),
      tankBreakdown,
      productPerTank,
    };

    setResults(calculationResults);
    setCalculated(true);
    toast.success(`Cálculo realizado! ${tanks} tanque(s) necessário(s)`);
    
    if (!hasSavedParams && flowRate && tankVolume) {
      setShowSaveParamsDialog(true);
    }
  };

  const handleSaveAsApplication = async () => {
    if (!savePropertyId) {
      toast.error("Selecione uma propriedade");
      return;
    }

    if (!results) return;

    const productsWithId = results.productPerTank.filter(p => p.productId);
    const productsWithoutId = results.productPerTank.filter(p => !p.productId);
    
    // Aviso se houver produtos não cadastrados, mas continua salvando os cadastrados
    let notesExtra = "";
    if (productsWithoutId.length > 0) {
      const manualNames = productsWithoutId.map(p => p.name).join(", ");
      notesExtra = ` Produtos manuais não salvos: ${manualNames}.`;
      toast.info(`${productsWithoutId.length} produto(s) manual(is) não serão vinculados à aplicação`);
    }

    const applicationData = {
      property_id: savePropertyId,
      plot_name: savePlotName || null,
      name: saveAppName || null,
      application_date: saveDate,
      application_type: 'pulverização' as const,
      status: saveStatus,
      area_applied: parseDecimalInput(area),
      total_cost: 0,
      flight_time_minutes: null,
      notes: `Gerado pela calculadora de calda. Volume total: ${results.totalVolume.toFixed(0)}L, ${results.tanks} tanque(s).${notesExtra}`,
      products: productsWithId.map(p => ({
        product_id: p.productId!,
        dose_per_ha: p.dose,
        total_amount: p.totalQuantity,
        unit_cost: 0,
        total_cost: 0,
      })),
    };

    try {
      await createApplication.mutateAsync(applicationData);
      setSaveDialogOpen(false);
      setSaveAppName("");
      setSavePropertyId("");
      setSavePlotName("");
      setSaveDate(new Date().toISOString().split('T')[0]);
      setSaveStatus("planejada");
      toast.success("Aplicação salva com sucesso!");
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleSaveAsRecipe = async () => {
    if (!recipeName.trim()) {
      toast.error("Nome do receituário é obrigatório");
      return;
    }

    if (!results) return;

    const productsWithId = results.productPerTank.filter(p => p.productId);
    const productsWithoutId = results.productPerTank.filter(p => !p.productId);
    
    if (productsWithId.length === 0) {
      toast.error("É necessário ao menos um produto cadastrado para criar um receituário");
      return;
    }
    
    // Aviso se houver produtos não cadastrados
    if (productsWithoutId.length > 0) {
      toast.info(`${productsWithoutId.length} produto(s) manual(is) não serão incluídos no receituário`);
    }

    try {
      await createRecipe({
        name: recipeName.trim(),
        description: recipeDescription.trim() || undefined,
        products: productsWithId.map(p => ({
          product_id: p.productId!,
          dose_per_ha: p.dose,
          dose_unit: p.unit,
        })),
      });
      setSaveRecipeDialogOpen(false);
      setRecipeName("");
      setRecipeDescription("");
    } catch (error) {
      // Error already handled in hook
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Calculadora de Calda
        </h1>
        <p className="text-base text-muted-foreground">
          Calcule a quantidade de produtos e volume necessários para sua aplicação
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                Parâmetros da Aplicação
              </h2>
              {hasSavedParams && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearDefaultParams}
                  className="gap-1 text-sm h-10 px-3 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area" className="text-base font-medium">Área (ha) *</Label>
                <Input
                  id="area"
                  type="text"
                  inputMode="decimal"
                  value={area}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isValidDecimalInput(val)) {
                      setArea(val);
                      setCalculated(false);
                    }
                  }}
                  placeholder="Ex: 10"
                  className="h-14 text-base rounded-xl"
                  required
                />
                <p className="text-sm text-muted-foreground">Área total a ser aplicada</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="flowRate" className="text-base font-medium">Vazão (L/ha) *</Label>
                <Input
                  id="flowRate"
                  type="text"
                  inputMode="decimal"
                  value={flowRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isValidDecimalInput(val)) {
                      setFlowRate(val);
                      setCalculated(false);
                    }
                  }}
                  placeholder="Ex: 10"
                  className="h-14 text-base rounded-xl"
                  required
                />
                <p className="text-sm text-muted-foreground">Litros por hectare</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tankVolume" className="text-base font-medium">Tanque (L) *</Label>
                <Input
                  id="tankVolume"
                  type="text"
                  inputMode="decimal"
                  value={tankVolume}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isValidDecimalInput(val)) {
                      setTankVolume(val);
                      setCalculated(false);
                    }
                  }}
                  placeholder="Ex: 20"
                  className="h-14 text-base rounded-xl"
                  required
                />
                <p className="text-sm text-muted-foreground">Capacidade do tanque</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 rounded-xl">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">
                Produtos
              </h2>
              <div className="flex gap-2">
                {recipes.length > 0 && (
                  <Select onValueChange={loadRecipe}>
                    <SelectTrigger className="h-12 text-base w-auto min-w-[140px] gap-2 rounded-xl">
                      <FileText className="h-5 w-5" />
                      <span>Receituário</span>
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {recipes.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-base py-3">
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <ProductDialog 
                  trigger={
                    <Button variant="outline" size="default" className="gap-2 text-base h-12 px-4 rounded-xl">
                      <Package className="h-5 w-5" />
                      <span className="hidden sm:inline">Cadastrar</span>
                    </Button>
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              {products.map((product, index) => (
                <div key={product.id}>
                  <div className="rounded-xl border border-border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-muted-foreground">
                        Produto {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => removeProduct(product.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>

                    <ProductAutocomplete
                      products={registeredProducts}
                      value={product.name}
                      onSelect={(p) => selectRegisteredProduct(product.id, p)}
                      onManualInput={(name) => {
                        updateProductFields(product.id, { name, productId: undefined });
                      }}
                      placeholder="Buscar produto..."
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Dose</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={product.dose}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (isValidDecimalInput(val)) {
                              updateProduct(product.id, "dose", val);
                            }
                          }}
                          placeholder="Ex: 0.5"
                          className="h-14 text-base rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-base font-medium">Unidade</Label>
                        <Select
                          value={product.unit}
                          onValueChange={(value) =>
                            updateProduct(product.id, "unit", value)
                          }
                        >
                          <SelectTrigger className="h-14 text-base rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="L/ha" className="text-base py-3">L/ha</SelectItem>
                            <SelectItem value="mL/ha" className="text-base py-3">mL/ha</SelectItem>
                            <SelectItem value="kg/ha" className="text-base py-3">kg/ha</SelectItem>
                            <SelectItem value="g/ha" className="text-base py-3">g/ha</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {index === products.length - 1 && (
                    <Button 
                      onClick={addProduct} 
                      variant="outline" 
                      size="default" 
                      className="w-full mt-3 gap-2 text-base h-12 rounded-xl"
                    >
                      <Plus className="h-5 w-5" />
                      Adicionar Produto
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Button onClick={calculate} className="w-full h-14 text-lg rounded-xl" size="lg">
                <CalcIcon className="mr-2 h-6 w-6" />
                Calcular
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-5 rounded-xl">
            <h2 className="mb-4 text-xl font-bold text-foreground">
              Resultados
            </h2>

            {!calculated ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalcIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-base text-muted-foreground px-4">
                  Configure os parâmetros e clique em Calcular
                </p>
              </div>
            ) : (
              results && (
                <div className="space-y-5">
                  {/* Resumo Geral */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">
                      Resumo Geral
                    </h3>
                    
                    <div className="rounded-xl bg-primary/10 p-5">
                      <p className="text-base text-muted-foreground">Volume Total de Calda</p>
                      <p className="text-3xl font-bold text-primary">
                        {Math.round(results.totalVolume)} L
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-muted p-4">
                        <p className="text-base text-muted-foreground">Tanques</p>
                        <p className="text-2xl font-bold text-foreground">
                          {results.tanks}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted p-4">
                        <p className="text-base text-muted-foreground">Capacidade</p>
                        <p className="text-2xl font-bold text-foreground">
                          {results.volumePerTank.toFixed(0)} L
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhamento por Tanque */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">
                      Receita por Tanque
                    </h3>
                    
                    {(() => {
                      const fullTanks = results.tankBreakdown.filter(t => !t.isComplement);
                      const complementTank = results.tankBreakdown.find(t => t.isComplement);
                      const fullTankCount = fullTanks.length;
                      const sampleFullTank = fullTanks[0];
                      
                      return (
                        <>
                          {/* Tanques cheios agrupados */}
                          {sampleFullTank && (
                            <div className="rounded-xl border-2 border-border p-5">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-lg font-bold text-foreground">
                                  {fullTankCount === 1 ? 'Tanque Cheio' : `${fullTankCount}x Tanque Cheio`}
                                </span>
                                <span className="text-xl font-bold text-primary">
                                  {Math.round(sampleFullTank.volume)} L
                                </span>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex justify-between text-base">
                                  <span className="text-muted-foreground">💧 Água</span>
                                  <span className="font-bold text-foreground text-lg">
                                    {Math.round(sampleFullTank.water)} L
                                  </span>
                                </div>
                                {sampleFullTank.products.map((p) => (
                                  <div key={p.id} className="flex justify-between text-base">
                                    <span className="text-muted-foreground truncate max-w-[55%]">🧪 {p.name}</span>
                                    <span className="font-bold text-foreground text-lg">
                                      {formatQuantity(p.quantity, p.unit)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Tanque complemento */}
                          {complementTank && (
                            <div className="rounded-xl border-2 border-warning bg-warning/5 p-5">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-lg font-bold text-warning">
                                  ⚠️ Complemento
                                </span>
                                <span className="text-xl font-bold text-warning">
                                  {Math.round(complementTank.volume)} L
                                </span>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex justify-between text-base">
                                  <span className="text-muted-foreground">💧 Água</span>
                                  <span className="font-bold text-foreground text-lg">
                                    {Math.round(complementTank.water)} L
                                  </span>
                                </div>
                                {complementTank.products.map((p) => (
                                  <div key={p.id} className="flex justify-between text-base">
                                    <span className="text-muted-foreground truncate max-w-[55%]">🧪 {p.name}</span>
                                    <span className="font-bold text-foreground text-lg">
                                      {formatQuantity(p.quantity, p.unit)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Total Geral */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">
                      Total Geral
                    </h3>
                    
                    <div className="rounded-xl border-2 border-border p-5 space-y-3">
                      <div className="flex justify-between text-base">
                        <span className="text-muted-foreground">💧 Água Total</span>
                        <span className="font-bold text-foreground text-lg">
                          {Math.round(results.totalWater)} L
                        </span>
                      </div>
                      {results.productPerTank.map((p) => (
                        <div key={p.id} className="flex justify-between text-base">
                          <span className="text-muted-foreground truncate max-w-[55%]">🧪 {p.name}</span>
                          <span className="font-bold text-foreground text-lg">
                            {formatQuantity(p.totalQuantity, p.unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teste de Compatibilidade */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground border-l-4 border-warning pl-3">
                      Teste de Compatibilidade
                    </h3>
                    <div className="rounded-xl bg-warning/10 border-2 border-warning/30 p-5 space-y-4">
                      <p className="text-base text-muted-foreground">
                        Antes de preparar a calda completa, faça um teste em pequena escala:
                      </p>
                      {[2, 5].map((liters) => {
                        const ratio = liters / results.volumePerTank;
                        return (
                          <div key={liters} className="rounded-xl bg-background/50 p-4">
                            <p className="text-lg font-bold text-foreground mb-3">
                              Receita para {liters}L:
                            </p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-base">
                                <span className="text-muted-foreground">Água</span>
                                <span className="font-semibold text-foreground">
                                  {(results.waterPerTank * ratio).toFixed(2)} L
                                </span>
                              </div>
                              {results.productPerTank.map((p) => (
                                <div key={p.id} className="flex justify-between text-base">
                                  <span className="text-muted-foreground truncate max-w-[50%]">{p.name}</span>
                                  <span className="font-semibold text-foreground">
                                    {formatQuantity(p.quantityPerTank * ratio, p.unit)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botões de Salvar */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-foreground border-l-4 border-primary pl-3">
                      Salvar Como
                    </h3>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => setSaveDialogOpen(true)} 
                        variant="outline" 
                        className="flex-1 h-14 gap-2 text-base rounded-xl"
                      >
                        <Save className="h-5 w-5" />
                        Aplicação
                      </Button>
                      <Button 
                        onClick={() => setSaveRecipeDialogOpen(true)} 
                        variant="outline" 
                        className="flex-1 h-14 gap-2 text-base rounded-xl"
                      >
                        <FileText className="h-5 w-5" />
                        Receituário
                      </Button>
                    </div>
                  </div>
                </div>
              )
            )}
          </Card>
        </div>
      </div>

      {/* Dialog para salvar como aplicação */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Salvar como Aplicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Nome da Aplicação</Label>
              <Input
                value={saveAppName}
                onChange={(e) => setSaveAppName(e.target.value)}
                placeholder="Ex: Aplicação Talhão 5"
                className="h-14 text-base rounded-xl"
              />
              <p className="text-sm text-muted-foreground">Identificação desta aplicação</p>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Propriedade *</Label>
              <Select value={savePropertyId} onValueChange={setSavePropertyId}>
                <SelectTrigger className="h-14 text-base rounded-xl">
                  <SelectValue placeholder="Selecione a propriedade" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-base py-3">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Talhão/Parcela</Label>
              <Input
                value={savePlotName}
                onChange={(e) => setSavePlotName(e.target.value)}
                placeholder="Ex: Talhão 1"
                className="h-14 text-base rounded-xl"
              />
              <p className="text-sm text-muted-foreground">Área específica dentro da propriedade</p>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Data *</Label>
              <Input
                type="date"
                value={saveDate}
                onChange={(e) => setSaveDate(e.target.value)}
                className="h-14 text-base rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Status</Label>
              <Select value={saveStatus} onValueChange={setSaveStatus}>
                <SelectTrigger className="h-14 text-base rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="planejada" className="text-base py-3">Planejada</SelectItem>
                  <SelectItem value="em_andamento" className="text-base py-3">Em Andamento</SelectItem>
                  <SelectItem value="concluída" className="text-base py-3">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-3 pt-4">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="h-12 text-base rounded-xl flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSaveAsApplication} className="h-12 text-base rounded-xl flex-1">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para salvar como receituário */}
      <Dialog open={saveRecipeDialogOpen} onOpenChange={setSaveRecipeDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Salvar como Receituário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Nome do Receituário *</Label>
              <Input
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="Ex: Controle de daninhas"
                className="h-14 text-base rounded-xl"
              />
              <p className="text-sm text-muted-foreground">Nome para identificar este receituário</p>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-medium">Descrição</Label>
              <Input
                value={recipeDescription}
                onChange={(e) => setRecipeDescription(e.target.value)}
                placeholder="Descrição opcional"
                className="h-14 text-base rounded-xl"
              />
            </div>
            <div className="rounded-xl bg-muted p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Produtos incluídos:</p>
              {results?.productPerTank.map((p) => (
                <div key={p.id} className="flex justify-between text-base">
                  <span className="text-muted-foreground truncate max-w-[60%]">{p.name}</span>
                  <span className="font-medium text-foreground">{p.dose} {p.unit}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-3 pt-4">
            <Button variant="outline" onClick={() => setSaveRecipeDialogOpen(false)} className="h-12 text-base rounded-xl flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSaveAsRecipe} className="h-12 text-base rounded-xl flex-1">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para salvar parâmetros */}
      <Dialog open={showSaveParamsDialog} onOpenChange={setShowSaveParamsDialog}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Salvar Parâmetros?
            </DialogTitle>
          </DialogHeader>
          <p className="text-base text-muted-foreground">
            Deseja salvar esses parâmetros como padrão para próximos cálculos?
          </p>
          <div className="text-base space-y-2 bg-muted p-4 rounded-xl">
            <p><strong>Vazão:</strong> {flowRate} L/ha</p>
            <p><strong>Tanque:</strong> {tankVolume} L</p>
          </div>
          <DialogFooter className="gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowSaveParamsDialog(false)} className="h-12 text-base rounded-xl flex-1">
              Não
            </Button>
            <Button onClick={saveDefaultParams} className="h-12 text-base rounded-xl flex-1">
              Sim, Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
