import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator as CalcIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [area, setArea] = useState<number>(10);
  const [flowRate, setFlowRate] = useState<number>(10);
  const [tankVolume, setTankVolume] = useState<number>(20);
  const [products, setProducts] = useState<Product[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [results, setResults] = useState<CalculationResults | null>(null);

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: Date.now().toString(),
        name: "",
        dose: 0,
        unit: "L/ha",
        price: 0,
      },
    ]);
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
    // Validar parâmetros da aplicação
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

    // Validar produtos
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

    // Volume total de calda necessário
    const totalVolume = area * flowRate;
    
    // Número de tanques necessários
    const tanks = Math.ceil(totalVolume / tankVolume);
    
    // Volume por tanque (último tanque pode ser menor)
    const volumePerTank = totalVolume / tanks;

    // Calcular produtos
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

    // Volume total de produtos por tanque
    const totalProductVolume = productPerTank.reduce(
      (sum, p) => sum + p.quantityPerTank,
      0
    );

    // Água necessária por tanque
    const waterPerTank = volumePerTank - totalProductVolume;
    
    // Água total
    const totalWater = waterPerTank * tanks;

    // Custo total
    const totalCost = productPerTank.reduce((sum, p) => sum + p.totalCost, 0);
    
    // Custo por hectare
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Calculadora de Calda
        </h1>
        <p className="text-muted-foreground">
          Calcule a quantidade de produtos e volume de calda necessários
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Parâmetros da Aplicação
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="area">Área (ha)</Label>
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
                />
              </div>
              <div>
                <Label htmlFor="flowRate">Vazão (L/ha)</Label>
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
                />
              </div>
              <div>
                <Label htmlFor="tankVolume">Capacidade do Tanque (L)</Label>
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
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Produtos
              </h2>
              <Button onClick={addProduct} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>

            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-6"
                >
                  <div className="md:col-span-2">
                    <Label>Nome do Produto</Label>
                    <Input
                      value={product.name}
                      onChange={(e) =>
                        updateProduct(product.id, "name", e.target.value)
                      }
                      placeholder="Ex: Herbicida"
                    />
                  </div>
                  <div>
                    <Label>Dose</Label>
                    <Input
                      type="number"
                      value={product.dose || ""}
                      onChange={(e) =>
                        updateProduct(product.id, "dose", Number(e.target.value))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Unidade</Label>
                    <Select
                      value={product.unit}
                      onValueChange={(value) =>
                        updateProduct(product.id, "unit", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L/ha">L/ha</SelectItem>
                        <SelectItem value="mL/ha">mL/ha</SelectItem>
                        <SelectItem value="kg/ha">kg/ha</SelectItem>
                        <SelectItem value="g/ha">g/ha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preço (R$/unid)</Label>
                    <Input
                      type="number"
                      value={product.price || ""}
                      onChange={(e) =>
                        updateProduct(product.id, "price", Number(e.target.value))
                      }
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {products.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 text-center">
                  <CalcIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum produto adicionado
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <Button onClick={calculate} className="w-full" size="lg">
                <CalcIcon className="mr-2 h-5 w-5" />
                Calcular
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Resultados
            </h2>

            {!calculated ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalcIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Configure os parâmetros e clique em Calcular
                </p>
              </div>
            ) : (
              results && (
                <div className="space-y-4">
                  {/* Resumo Geral */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground border-l-4 border-primary pl-2">
                      Resumo Geral
                    </h3>
                    
                    <div className="rounded-lg bg-primary/10 p-3">
                      <p className="text-xs text-muted-foreground">Volume Total de Calda</p>
                      <p className="text-xl font-bold text-primary">
                        {results.totalVolume.toFixed(2)} L
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-secondary/10 p-3">
                        <p className="text-xs text-muted-foreground">Tanques</p>
                        <p className="text-lg font-bold text-foreground">
                          {results.tanks}
                        </p>
                      </div>
                      <div className="rounded-lg bg-secondary/10 p-3">
                        <p className="text-xs text-muted-foreground">Vol/Tanque</p>
                        <p className="text-lg font-bold text-foreground">
                          {results.volumePerTank.toFixed(2)} L
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <p className="text-xs text-muted-foreground">Água Total</p>
                      <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {results.totalWater.toFixed(2)} L
                      </p>
                    </div>
                  </div>

                  {/* Receita por Tanque */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-foreground border-l-4 border-primary pl-2">
                      Receita por Tanque
                    </h3>
                    
                    <div className="rounded-lg bg-accent/10 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Água por tanque:</span>
                        <span className="font-semibold text-foreground">
                          {results.waterPerTank.toFixed(2)} L
                        </span>
                      </div>
                      
                      <div className="border-t border-border pt-2 space-y-1">
                        {results.productPerTank.map((p) => (
                          <div key={p.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{p.name}:</span>
                            <span className="font-medium text-foreground">
                              {p.quantityPerTank.toFixed(2)} {p.unit.replace("/ha", "")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Composição Total */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-foreground border-l-4 border-primary pl-2">
                      Composição da Calda (Total)
                    </h3>
                    
                    <div className="space-y-2">
                      {results.productPerTank.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-lg bg-muted/20 p-3"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-foreground text-sm">
                              {p.name}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Dose:</span>
                              <span className="text-foreground">{p.dose} {p.unit}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total:</span>
                              <span className="font-semibold text-foreground">
                                {p.totalQuantity.toFixed(2)} {p.unit.replace("/ha", "")}
                              </span>
                            </div>
                            {p.price > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Custo:</span>
                                <span className="text-foreground">
                                  R$ {p.totalCost.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumo de Custos */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-foreground border-l-4 border-primary pl-2">
                      Resumo de Custos
                    </h3>
                    
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <p className="text-xs text-muted-foreground">Custo Total</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        R$ {results.totalCost.toFixed(2)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-green-500/5 p-3">
                      <p className="text-xs text-muted-foreground">Custo por Hectare</p>
                      <p className="text-lg font-bold text-foreground">
                        R$ {results.costPerHectare.toFixed(2)}/ha
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </Card>

          {calculated && results && (
            <Button className="w-full" size="lg" variant="outline">
              Salvar Cálculo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
