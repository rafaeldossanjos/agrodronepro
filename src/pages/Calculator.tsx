import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator as CalcIcon, Plus, Trash2, Package, Save } from "lucide-react";
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
import { ProductDialog } from "@/components/ProductDialog";

const calculationSchema = z.object({
  area: z.number().min(0.0001, 'Área deve ser maior que 0').max(100000, 'Área muito grande'),
  flowRate: z.number().min(0.1, 'Vazão deve ser maior que 0').max(1000, 'Vazão muito alta'),
  tankVolume: z.number().min(1, 'Capacidade do tanque deve ser maior que 0').max(10000, 'Capacidade muito alta'),
});

const productSchema = z.object({
  name: z.string().min(1, 'Nome do produto é obrigatório').max(100),
  dose: z.number().min(0.001, 'Dose deve ser maior que 0').max(100000, 'Dose muito alta'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  price: z.number().min(0, 'Preço não pode ser negativo').max(1000000, 'Preço muito alto'),
});

type Product = {
  id: string;
  productId?: string;
  name: string;
  dose: number;
  unit: string;
  price: number;
};

type CalculationResults = {
  totalVolume: number;
  tanks: number;
  volumePerTank: number;
  totalProductVolume: number;
  waterPerTank: number;
  totalWater: number;
  productPerTank: Array<{
    id: string;
    productId?: string;
    name: string;
    dose: number;
    unit: string;
    price: number;
    quantityPerTank: number;
    totalQuantity: number;
    totalCost: number;
  }>;
  totalCost: number;
  costPerHectare: number;
};

export default function Calculator() {
  const { products: registeredProducts, isLoading: loadingProducts } = useProducts();
  const { properties } = useProperties();
  const { createApplication } = useApplications();
  const [area, setArea] = useState<number>(10);
  const [flowRate, setFlowRate] = useState<number>(10);
  const [tankVolume, setTankVolume] = useState<number>(20);
  const [products, setProducts] = useState<Product[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [results, setResults] = useState<CalculationResults | null>(null);
  
  // Dialog para salvar como aplicação
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savePropertyId, setSavePropertyId] = useState<string>("");
  const [savePlotName, setSavePlotName] = useState<string>("");
  const [saveDate, setSaveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState<string>("planejada");

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
        dose: 0,
        unit: "L/ha",
        price: 0,
      },
    ]);
  };

  const selectRegisteredProduct = (localId: string, productId: string) => {
    const selectedProduct = registeredProducts.find(p => p.id === productId);
    if (selectedProduct) {
      setProducts(
        products.map((p) => 
          p.id === localId 
            ? { 
                ...p, 
                productId: selectedProduct.id,
                name: selectedProduct.name,
                price: selectedProduct.unit_price,
                unit: selectedProduct.unit === 'L' ? 'L/ha' : 
                      selectedProduct.unit === 'mL' ? 'mL/ha' :
                      selectedProduct.unit === 'kg' ? 'kg/ha' : 'g/ha'
              } 
            : p
        )
      );
      setCalculated(false);
    }
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    setCalculated(false);
  };

  const updateProduct = (id: string, field: keyof Product, value: any) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    setCalculated(false);
  };

  const calculate = () => {
    try {
      calculationSchema.parse({ area, flowRate, tankVolume });
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
      try {
        productSchema.parse(p);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast.error(`Produto "${p.name || 'sem nome'}": ${error.errors[0].message}`);
          return;
        }
      }
    }

    const totalVolume = area * flowRate;
    const tanks = Math.ceil(totalVolume / tankVolume);
    const volumePerTank = totalVolume / tanks;

    const productPerTank = products.map((p) => {
      const totalQuantity = p.dose * area;
      const quantityPerTank = totalQuantity / tanks;
      const totalCost = totalQuantity * p.price;

      return {
        ...p,
        quantityPerTank,
        totalQuantity,
        totalCost,
      };
    });

    const totalProductVolume = productPerTank.reduce(
      (sum, p) => sum + p.quantityPerTank,
      0
    );

    const waterPerTank = volumePerTank - totalProductVolume;
    const totalWater = waterPerTank * tanks;
    const totalCost = productPerTank.reduce((sum, p) => sum + p.totalCost, 0);
    const costPerHectare = totalCost / area;

    const calculationResults: CalculationResults = {
      totalVolume,
      tanks,
      volumePerTank,
      totalProductVolume,
      waterPerTank,
      totalWater,
      productPerTank,
      totalCost,
      costPerHectare,
    };

    setResults(calculationResults);
    setCalculated(true);
    toast.success(`Cálculo realizado! ${tanks} tanque(s) necessário(s)`);
  };

  const handleSaveAsApplication = () => {
    if (!savePropertyId) {
      toast.error("Selecione uma propriedade");
      return;
    }

    if (!results) return;

    // Verificar se todos os produtos têm productId cadastrado
    const productsWithId = results.productPerTank.filter(p => p.productId);
    if (productsWithId.length !== results.productPerTank.length) {
      toast.error("Todos os produtos precisam estar cadastrados no sistema para salvar como aplicação");
      return;
    }

    const applicationData = {
      property_id: savePropertyId,
      plot_name: savePlotName || null,
      application_date: saveDate,
      application_type: 'pulverização' as const,
      status: saveStatus,
      area_applied: area,
      total_cost: results.totalCost,
      flight_time_minutes: null,
      notes: `Gerado pela calculadora de calda. Volume total: ${results.totalVolume.toFixed(2)}L, ${results.tanks} tanque(s).`,
      products: productsWithId.map(p => ({
        product_id: p.productId!,
        dose_per_ha: p.dose,
        total_amount: p.totalQuantity,
        unit_cost: p.price,
        total_cost: p.totalCost,
      })),
    };

    createApplication.mutate(applicationData, {
      onSuccess: () => {
        setSaveDialogOpen(false);
        setSavePropertyId("");
        setSavePlotName("");
        setSaveDate(new Date().toISOString().split('T')[0]);
        setSaveStatus("planejada");
        toast.success("Aplicação salva com sucesso!");
      },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Calculadora de Calda
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Calcule a quantidade de produtos e volume de calda necessários
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 text-base sm:text-lg font-semibold text-foreground">
              Parâmetros da Aplicação
            </h2>
            <div className="grid gap-3 sm:gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="area" className="text-xs sm:text-sm">Área (ha)</Label>
                  <Input
                    id="area"
                    type="number"
                    value={area}
                    onChange={(e) => {
                      setArea(Number(e.target.value));
                      setCalculated(false);
                    }}
                    min="0"
                    step="0.0001"
                    className="h-9 sm:h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="flowRate" className="text-xs sm:text-sm">Vazão (L/ha)</Label>
                  <Input
                    id="flowRate"
                    type="number"
                    value={flowRate}
                    onChange={(e) => {
                      setFlowRate(Number(e.target.value));
                      setCalculated(false);
                    }}
                    min="0"
                    step="0.01"
                    className="h-9 sm:h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="tankVolume" className="text-xs sm:text-sm">Tanque (L)</Label>
                  <Input
                    id="tankVolume"
                    type="number"
                    value={tankVolume}
                    onChange={(e) => {
                      setTankVolume(Number(e.target.value));
                      setCalculated(false);
                    }}
                    min="0"
                    step="1"
                    className="h-9 sm:h-10"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-foreground">
                Produtos
              </h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <ProductDialog 
                  trigger={
                    <Button variant="outline" size="sm" className="gap-1 flex-1 sm:flex-initial text-xs">
                      <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Cadastrar</span>
                    </Button>
                  }
                />
                <Button onClick={addProduct} size="sm" className="gap-1 flex-1 sm:flex-initial text-xs">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  Adicionar
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Produto {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeProduct(product.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Select
                      value={product.productId || "manual"}
                      onValueChange={(value) => {
                        if (value !== "manual") {
                          selectRegisteredProduct(product.id, value);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione um produto" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="manual" className="text-xs">Entrada Manual</SelectItem>
                        {registeredProducts.filter(p => p.active).map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} - R$ {p.unit_price.toFixed(2)}/{p.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={product.name}
                      onChange={(e) =>
                        updateProduct(product.id, "name", e.target.value)
                      }
                      placeholder="Nome do produto"
                      className="h-8 text-xs"
                    />
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Dose</Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={product.dose || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                              updateProduct(product.id, "dose", val === "" ? 0 : parseFloat(val) || 0);
                            }
                          }}
                          placeholder="0.5"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unidade</Label>
                        <Select
                          value={product.unit}
                          onValueChange={(value) =>
                            updateProduct(product.id, "unit", value)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="L/ha" className="text-xs">L/ha</SelectItem>
                            <SelectItem value="mL/ha" className="text-xs">mL/ha</SelectItem>
                            <SelectItem value="kg/ha" className="text-xs">kg/ha</SelectItem>
                            <SelectItem value="g/ha" className="text-xs">g/ha</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Preço</Label>
                        <Input
                          type="number"
                          value={product.price || ""}
                          onChange={(e) =>
                            updateProduct(product.id, "price", Number(e.target.value))
                          }
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Button onClick={calculate} className="w-full h-10" size="lg">
                <CalcIcon className="mr-2 h-4 w-4" />
                Calcular
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-6">
            <h2 className="mb-4 text-base sm:text-lg font-semibold text-foreground">
              Resultados
            </h2>

            {!calculated ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalcIcon className="mb-2 h-10 w-10 text-muted-foreground" />
                <p className="text-xs sm:text-sm text-muted-foreground px-4">
                  Configure os parâmetros e clique em Calcular
                </p>
              </div>
            ) : (
              results && (
                <div className="space-y-4">
                  {/* Resumo Geral */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground border-l-4 border-primary pl-2">
                      Resumo Geral
                    </h3>
                    
                    <div className="rounded-lg bg-primary/10 p-3">
                      <p className="text-xs text-muted-foreground">Volume Total de Calda</p>
                      <p className="text-lg font-bold text-primary">
                        {results.totalVolume.toFixed(2)} L
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-secondary/10 p-2">
                        <p className="text-xs text-muted-foreground">Tanques</p>
                        <p className="text-base font-bold text-foreground">
                          {results.tanks}
                        </p>
                      </div>
                      <div className="rounded-lg bg-secondary/10 p-2">
                        <p className="text-xs text-muted-foreground">Vol/Tanque</p>
                        <p className="text-base font-bold text-foreground">
                          {results.volumePerTank.toFixed(2)} L
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <p className="text-xs text-muted-foreground">Água Total</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {results.totalWater.toFixed(2)} L
                      </p>
                    </div>
                  </div>

                  {/* Receita por Tanque */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <h3 className="text-xs font-semibold text-foreground border-l-4 border-primary pl-2">
                      Receita por Tanque
                    </h3>
                    
                    <div className="rounded-lg bg-accent/10 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Água:</span>
                        <span className="font-semibold text-foreground">
                          {results.waterPerTank.toFixed(2)} L
                        </span>
                      </div>
                      
                      <div className="border-t border-border pt-2 space-y-1">
                        {results.productPerTank.map((p) => (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground truncate max-w-[60%]">{p.name}:</span>
                            <span className="font-medium text-foreground">
                              {p.quantityPerTank.toFixed(2)} {p.unit.replace("/ha", "")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Composição Total */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <h3 className="text-xs font-semibold text-foreground border-l-4 border-primary pl-2">
                      Composição da Calda (Total)
                    </h3>
                    
                    <div className="space-y-2">
                      {results.productPerTank.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-lg bg-muted/20 p-2"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-foreground text-xs">
                              {p.name}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">Dose:</span>
                              <p className="text-foreground">{p.dose} {p.unit}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total:</span>
                              <p className="font-semibold text-foreground">
                                {p.totalQuantity.toFixed(2)} {p.unit.replace("/ha", "")}
                              </p>
                            </div>
                            {p.price > 0 && (
                              <div>
                                <span className="text-muted-foreground">Custo:</span>
                                <p className="text-foreground">
                                  R$ {p.totalCost.toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumo de Custos */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <h3 className="text-xs font-semibold text-foreground border-l-4 border-primary pl-2">
                      Resumo de Custos
                    </h3>
                    
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <p className="text-xs text-muted-foreground">Custo Total</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        R$ {results.totalCost.toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-green-500/5 p-2">
                      <p className="text-xs text-muted-foreground">Custo por Hectare</p>
                      <p className="text-base font-bold text-foreground">
                        R$ {results.costPerHectare.toFixed(2)}/ha
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </Card>

          {calculated && results && (
            <Button 
              className="w-full gap-2" 
              size="lg" 
              onClick={() => setSaveDialogOpen(true)}
            >
              <Save className="h-4 w-4" />
              Salvar como Aplicação
            </Button>
          )}
        </div>
      </div>

      {/* Dialog para salvar como aplicação */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar como Aplicação</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Propriedade *</Label>
              <Select value={savePropertyId} onValueChange={setSavePropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a propriedade" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Talhão/Parcela</Label>
              <Input
                value={savePlotName}
                onChange={(e) => setSavePlotName(e.target.value)}
                placeholder="Nome do talhão (opcional)"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Data da Aplicação</Label>
              <Input
                type="date"
                value={saveDate}
                onChange={(e) => setSaveDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={saveStatus} onValueChange={setSaveStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="planejada">Planejada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-2">Resumo:</p>
              <p>Área: {area} ha</p>
              <p>Volume: {results?.totalVolume.toFixed(2)} L</p>
              <p>Custo: R$ {results?.totalCost.toFixed(2)}</p>
              <p>Produtos: {results?.productPerTank.length}</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAsApplication}>
              Salvar Aplicação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
