import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Edit2, Trash2, Package } from "lucide-react";
import { useRecipes } from "@/hooks/useRecipes";
import { RecipeDialog } from "@/components/RecipeDialog";
import { PullToRefresh } from "@/components/PullToRefresh";
import { CardGridSkeleton } from "@/components/PageSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Recipes() {
  const { recipes, isLoading, deleteRecipe } = useRecipes();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <CardGridSkeleton count={3} />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground">
            Receituários
          </h1>
          <p className="text-2xl sm:text-3xl text-muted-foreground">
            Templates de receitas com produtos e doses pré-definidos
          </p>
        </div>
        <RecipeDialog />
      </div>

      {/* Search */}
      {recipes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar receituários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-14 h-14 text-lg rounded-xl"
          />
        </div>
      )}

      {/* Content */}
      {recipes.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-foreground mb-3">
            Nenhum receituário cadastrado
          </h3>
          <p className="text-xl text-muted-foreground mb-4">
            Crie receituários prontos para agilizar o preenchimento
          </p>
          <RecipeDialog />
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-xl text-muted-foreground">
            Nenhum receituário encontrado para "{searchTerm}"
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-2xl text-foreground">{recipe.name}</h3>
                    {recipe.description && (
                      <p className="text-lg text-muted-foreground line-clamp-1">
                        {recipe.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Products list */}
              <div className="flex-1 space-y-2 mb-3">
                {recipe.recipe_products?.map((rp) => (
                  <div key={rp.id} className="flex items-center gap-3 text-lg">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground truncate flex-1">
                      {rp.products?.name || "Produto"}
                    </span>
                    <span className="text-muted-foreground">
                      {rp.dose_per_ha} {rp.dose_unit}
                    </span>
                  </div>
                ))}
                {(!recipe.recipe_products || recipe.recipe_products.length === 0) && (
                  <p className="text-lg text-muted-foreground">Sem produtos</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-border">
                <RecipeDialog
                  recipe={recipe}
                  trigger={
                    <Button variant="outline" size="default" className="flex-1 gap-2">
                      <Edit2 className="h-5 w-5" />
                      Editar
                    </Button>
                  }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="default" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir receituário?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O receituário "{recipe.name}" será excluído.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteRecipe(recipe.id)}>
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
