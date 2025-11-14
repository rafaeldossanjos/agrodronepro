import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package } from "lucide-react";
import { useState } from "react";

const productsData = [
  {
    id: 1,
    name: "Herbicida Glifosato 480",
    category: "Herbicida",
    manufacturer: "Agro Solutions",
    unit: "L",
    price: 45.0,
    stock: 120,
    minStock: 20,
  },
  {
    id: 2,
    name: "Fungicida Azoxistrobina",
    category: "Fungicida",
    manufacturer: "Crop Protection",
    unit: "L",
    price: 89.5,
    stock: 45,
    minStock: 15,
  },
  {
    id: 3,
    name: "Inseticida Lambda-Cialotrina",
    category: "Inseticida",
    manufacturer: "BioAgro",
    unit: "L",
    price: 125.0,
    stock: 8,
    minStock: 10,
  },
  {
    id: 4,
    name: "Adjuvante Espalhante",
    category: "Adjuvante",
    manufacturer: "AgroTech",
    unit: "L",
    price: 32.0,
    stock: 65,
    minStock: 25,
  },
];

const categoryColors = {
  Herbicida: "bg-primary/10 text-primary",
  Fungicida: "bg-success/10 text-success",
  Inseticida: "bg-destructive/10 text-destructive",
  Adjuvante: "bg-warning/10 text-warning",
};

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = productsData.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Banco de Produtos
          </h1>
          <p className="text-muted-foreground">
            Gerencie defensivos, fertilizantes e adjuvantes
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {product.manufacturer}
                  </p>
                </div>
              </div>
              <Badge
                className={categoryColors[product.category]}
                variant="outline"
              >
                {product.category}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Preço</p>
                <p className="font-semibold text-foreground">
                  R$ {product.price.toFixed(2)}/{product.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque</p>
                <p
                  className={`font-semibold ${
                    product.stock < product.minStock
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {product.stock} {product.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Mín.</p>
                <p className="font-semibold text-foreground">
                  {product.minStock} {product.unit}
                </p>
              </div>
            </div>

            {product.stock < product.minStock && (
              <div className="mt-4 rounded-lg bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Estoque abaixo do mínimo!
                </p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                Editar
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Detalhes
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
