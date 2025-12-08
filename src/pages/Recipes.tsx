import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Edit2, Trash2, Package } from "lucide-react";
import { useRecipes } from "@/hooks/useRecipes";
import { RecipeDialog } from "@/components/RecipeDialog";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando receituários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Receituários
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Templates de receitas com produtos e doses pré-definidos
          </p>
        </div>
        <RecipeDialog />
      </div>

      {/* Search */}
      {recipes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar receituários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Content */}
      {recipes.length === 0 ? (
        <Card className="p-8 sm:p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum receituário cadastrado
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crie receituários prontos para agilizar o preenchimento de aplicações e cálculos
          </p>
          <RecipeDialog />
        </Card>
      ) : filteredRecipes.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum receituário encontrado para "{searchTerm}"
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="p-4 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{recipe.name}</h3>
                    {recipe.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {recipe.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Products list */}
              <div className="flex-1 space-y-1.5 mb-3">
                {recipe.recipe_products?.map((rp) => (
                  <div key={rp.id} className="flex items-center gap-2 text-sm">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-foreground truncate flex-1">
                      {rp.products?.name || "Produto"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {rp.dose_per_ha} {rp.dose_unit}
                    </span>
                  </div>
                ))}
                {(!recipe.recipe_products || recipe.recipe_products.length === 0) && (
                  <p className="text-xs text-muted-foreground">Sem produtos</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <RecipeDialog
                  recipe={recipe}
                  trigger={
                    <Button variant="outline" size="sm" className="flex-1 gap-1">
                      <Edit2 className="h-3 w-3" />
                      Editar
                    </Button>
                  }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir receituário?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O receituário "{recipe.name}" será permanentemente excluído.
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
  );
}
