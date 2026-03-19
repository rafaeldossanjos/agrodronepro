import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { useRecipes, Recipe } from "@/hooks/useRecipes";
import { Plus, Trash2, FileText, Check, Search } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { isValidDecimalInput, parseDecimalInput, cn } from "@/lib/utils";

interface RecipeProductItem {
  product_id: string;
  dose_per_ha: string;
  dose_unit: string;
}

interface RecipeDialogProps {
  recipe?: Recipe;
  trigger?: React.ReactNode;
}

export function RecipeDialog({ recipe, trigger }: RecipeDialogProps) {
  const [open, setOpen] = useState(false);
  const { products, createProduct } = useProducts();
  const { createRecipe, updateRecipe } = useRecipes();
  const [isLoading, setIsLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [recipeProducts, setRecipeProducts] = useState<RecipeProductItem[]>([
    { product_id: "", dose_per_ha: "", dose_unit: "L/ha" }
  ]);

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setDescription(recipe.description || "");
      setRecipeProducts(
        recipe.recipe_products?.map(rp => ({
          product_id: rp.product_id,
          dose_per_ha: String(rp.dose_per_ha),
          dose_unit: rp.dose_unit
        })) || [{ product_id: "", dose_per_ha: "", dose_unit: "L/ha" }]
      );
    } else {
      setName("");
      setDescription("");
      setRecipeProducts([{ product_id: "", dose_per_ha: "", dose_unit: "L/ha" }]);
    }
  }, [recipe, open]);

  const addProduct = () => {
    setRecipeProducts([...recipeProducts, { product_id: "", dose_per_ha: "", dose_unit: "L/ha" }]);
  };

  const removeProduct = (index: number) => {
    if (recipeProducts.length > 1) {
      setRecipeProducts(recipeProducts.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof RecipeProductItem, value: string) => {
    const updated = [...recipeProducts];
    updated[index] = { ...updated[index], [field]: value };
    
    // Se mudou o produto, preencher com a dose recomendada
    if (field === 'product_id' && value) {
      const selectedProduct = products.find(p => p.id === value);
      if (selectedProduct?.recommended_dose && selectedProduct?.recommended_dose_unit) {
        updated[index].dose_per_ha = String(selectedProduct.recommended_dose);
        updated[index].dose_unit = selectedProduct.recommended_dose_unit;
      }
    }
    
    setRecipeProducts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Nome do receituário é obrigatório");
      return;
    }

    const validProducts = recipeProducts.filter(p => p.product_id && parseDecimalInput(p.dose_per_ha) > 0);
    if (validProducts.length === 0) {
      toast.error("Adicione pelo menos um produto com dose válida");
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        products: validProducts.map(p => ({
          product_id: p.product_id,
          dose_per_ha: parseDecimalInput(p.dose_per_ha),
          dose_unit: p.dose_unit
        }))
      };

      if (recipe) {
        await updateRecipe({ id: recipe.id, ...data });
      } else {
        await createRecipe(data);
      }

      setOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-3 h-14 px-6 text-lg rounded-xl">
            <Plus className="h-6 w-6" />
            Novo Receituário
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl sm:text-3xl font-bold">
            <FileText className="h-7 w-7 text-primary" />
            {recipe ? "Editar Receituário" : "Novo Receituário"}
          </DialogTitle>
          <p className="text-base sm:text-lg text-muted-foreground mt-1">
            {recipe ? 'Atualize os produtos e doses' : 'Crie uma receita com produtos e doses padrão'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-lg font-medium">
              Nome do Receituário *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Dessecação pré-plantio"
              className="h-14 text-lg px-4 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-lg font-medium">
              Descrição
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do receituário..."
              rows={3}
              className="text-lg px-4 py-3 rounded-xl resize-none"
            />
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-medium">Produtos e Doses *</Label>
            <p className="text-sm text-muted-foreground -mt-2">
              Adicione os produtos que compõem este receituário
            </p>
            
            {recipeProducts.map((item, index) => (
              <Card key={index} className="p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-foreground">
                    Produto {index + 1}
                  </span>
                  {recipeProducts.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProduct(index)}
                      className="h-10 w-10 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                <Select
                  value={item.product_id}
                  onValueChange={(v) => updateProduct(index, "product_id", v)}
                >
                  <SelectTrigger className="h-14 text-lg px-4 rounded-xl">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-[300px]">
                    {products.filter(p => p.active).map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-lg py-3">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-base">Dose por Hectare</Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={item.dose_per_ha}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isValidDecimalInput(val)) {
                          updateProduct(index, "dose_per_ha", val);
                        }
                      }}
                      placeholder="0.5"
                      className="h-14 text-lg px-4 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base">Unidade</Label>
                    <Select
                      value={item.dose_unit}
                      onValueChange={(v) => updateProduct(index, "dose_unit", v)}
                    >
                      <SelectTrigger className="h-14 text-lg px-4 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="L/ha" className="text-lg py-3">L/ha</SelectItem>
                        <SelectItem value="mL/ha" className="text-lg py-3">mL/ha</SelectItem>
                        <SelectItem value="kg/ha" className="text-lg py-3">kg/ha</SelectItem>
                        <SelectItem value="g/ha" className="text-lg py-3">g/ha</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addProduct}
              className="w-full gap-2 h-14 text-lg rounded-xl"
            >
              <Plus className="h-5 w-5" />
              Adicionar Produto
            </Button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              className="flex-1 h-14 text-lg rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="flex-1 h-14 text-lg rounded-xl"
            >
              {isLoading ? "Salvando..." : recipe ? "Atualizar" : "Criar Receituário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}