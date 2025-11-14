import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator as CalcIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  dose: number;
  unit: string;
  price: number;
};

export default function Calculator() {
  const [area, setArea] = useState(10);
  const [flowRate, setFlowRate] = useState(10);
  const [tankVolume, setTankVolume] = useState(20);
  const [products, setProducts] = useState<Product[]>([]);

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
  };

  const updateProduct = (id: string, field: keyof Product, value: any) => {
    setProducts(
      products.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const calculate = () => {
    if (area <= 0 || flowRate <= 0 || tankVolume <= 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const totalVolume = (area * flowRate) / 10;
    const tanks = Math.ceil(totalVolume / tankVolume);
    const productPerTank = products.map((p) => ({
      ...p,
      quantity: (p.dose * area) / tanks,
      totalCost: (p.dose * area * p.price) / 1000,
    }));

    const totalCost = productPerTank.reduce((sum, p) => sum + p.totalCost, 0);

    toast.success(`Cálculo realizado! ${tanks} tanques necessários`);
    
    return {
      totalVolume,
      tanks,
      productPerTank,
      totalCost,
    };
  };

  const results = calculate();

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
                  onChange={(e) => setArea(Number(e.target.value))}
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <Label htmlFor="flowRate">Vazão (L/ha)</Label>
                <Input
                  id="flowRate"
                  type="number"
                  value={flowRate}
                  onChange={(e) => setFlowRate(Number(e.target.value))}
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <Label htmlFor="tankVolume">Volume Tanque (L)</Label>
                <Input
                  id="tankVolume"
                  type="number"
                  value={tankVolume}
                  onChange={(e) => setTankVolume(Number(e.target.value))}
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
                  className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-5"
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
                      value={product.dose}
                      onChange={(e) =>
                        updateProduct(product.id, "dose", Number(e.target.value))
                      }
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <Label>Preço (R$/L ou kg)</Label>
                    <Input
                      type="number"
                      value={product.price}
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
          </Card>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Resultados
            </h2>
            
            {results && (
              <div className="space-y-4">
                <div className="rounded-lg bg-primary/10 p-4">
                  <p className="text-sm text-muted-foreground">Volume Total</p>
                  <p className="text-2xl font-bold text-primary">
                    {results.totalVolume.toFixed(1)} L
                  </p>
                </div>

                <div className="rounded-lg bg-secondary/10 p-4">
                  <p className="text-sm text-muted-foreground">
                    Tanques Necessários
                  </p>
                  <p className="text-2xl font-bold text-secondary">
                    {results.tanks}
                  </p>
                </div>

                <div className="rounded-lg bg-success/10 p-4">
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {results.totalCost.toFixed(2)}
                  </p>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Quantidade por Tanque
                  </p>
                  {results.productPerTank.map((p) => (
                    <div
                      key={p.id}
                      className="mb-2 flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{p.name}</span>
                      <span className="font-medium text-foreground">
                        {p.quantity.toFixed(2)} {p.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Button className="w-full" size="lg">
            Salvar Cálculo
          </Button>
        </div>
      </div>
    </div>
  );
}
