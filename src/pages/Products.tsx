import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Cylinder, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { ProductDialog } from "@/components/ProductDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const categoryColors: Record<string, string> = {
  Herbicida: "bg-primary/10 text-primary",
  Fungicida: "bg-green-500/10 text-green-600 dark:text-green-400",
  Inseticida: "bg-destructive/10 text-destructive",
  Adjuvante: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  Fertilizante: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Outro: "bg-muted text-muted-foreground",
};

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const { products, isLoading, deleteProduct } = useProducts();

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

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
        <ProductDialog />
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
      {products.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Cylinder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum produto cadastrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro produto
            </p>
            <ProductDialog />
          </div>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-muted-foreground">
              Tente buscar por outro termo
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-6">
              <div className="mb-4">
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <Cylinder className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground line-clamp-2">
                      {product.name}
                    </h3>
                    {product.manufacturer && (
                      <p className="text-sm text-muted-foreground truncate">
                        {product.manufacturer}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <Badge
                    className={categoryColors[product.category] || categoryColors.Outro}
                    variant="outline"
                  >
                    {product.category}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Preço</p>
                  <p className="font-semibold text-foreground">
                    R$ {product.unit_price.toFixed(2)}/{product.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque</p>
                  <p className="font-semibold text-foreground">
                    {product.stock_quantity} {product.unit}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <ProductDialog
                  product={product}
                  trigger={
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o produto "{product.name}"?
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteProduct.mutate(product.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
