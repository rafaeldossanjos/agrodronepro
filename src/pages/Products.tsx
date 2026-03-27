import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Cylinder, Edit, Trash2 } from "lucide-react";
import { useState, useCallback } from "react";
import { Pagination, usePagination } from "@/components/Pagination";
import { useProducts } from "@/hooks/useProducts";
import { PullToRefresh } from "@/components/PullToRefresh";
import { ListSkeleton } from "@/components/PageSkeleton";
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
  const { products, isLoading, deleteProduct, refetch } = useProducts();
  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <ListSkeleton count={4} />;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground">
            Banco de Produtos
          </h1>
          <p className="text-2xl sm:text-3xl text-muted-foreground">
            Gerencie defensivos, fertilizantes e adjuvantes
          </p>
        </div>
        <ProductDialog />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-14 h-14 text-lg rounded-xl"
        />
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Cylinder className="mx-auto h-14 w-14 text-muted-foreground mb-3" />
            <h3 className="text-3xl font-semibold text-foreground mb-2">
              Nenhum produto cadastrado
            </h3>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-3">
              Comece criando seu primeiro produto
            </p>
            <ProductDialog />
          </div>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Search className="mx-auto h-14 w-14 text-muted-foreground mb-3" />
            <h3 className="text-3xl font-semibold text-foreground mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-xl sm:text-2xl text-muted-foreground">
              Tente buscar por outro termo
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="mb-2">
                <div className="flex gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                    <Cylinder className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-2xl sm:text-3xl text-foreground line-clamp-1">
                      {product.name}
                    </h3>
                    {product.manufacturer && (
                      <p className="text-xl text-muted-foreground truncate">
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

              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                <div>
                  <p className="text-lg sm:text-xl text-muted-foreground">Dose Recomendada</p>
                  <p className="font-semibold text-2xl sm:text-3xl text-foreground">
                    {product.recommended_dose 
                      ? `${product.recommended_dose} ${product.recommended_dose_unit || `${product.unit}/ha`}`
                      : "Não informada"}
                  </p>
                </div>
                <div>
                  <p className="text-lg sm:text-xl text-muted-foreground">Tamanho Embalagem</p>
                  <p className="font-semibold text-2xl sm:text-3xl text-foreground">
                    {product.package_size 
                      ? `${product.package_size} ${product.unit}`
                      : "Não informado"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <ProductDialog
                  product={product}
                  trigger={
                    <Button variant="outline" size="default" className="flex-1 h-12 text-lg">
                      <Edit className="h-5 w-5 mr-2" />
                      Editar
                    </Button>
                  }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="default" className="flex-1 h-12 text-lg">
                      <Trash2 className="h-5 w-5 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir o produto "{product.name}"?
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
    </PullToRefresh>
  );
}
