import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { put, remove, getAll, initOfflineDb } from '@/lib/offlineDb';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface RecipeProduct {
  id: string;
  recipe_id: string;
  product_id: string;
  dose_per_ha: number;
  dose_unit: string;
  created_at: string;
  products?: {
    id: string;
    name: string;
    unit: string;
    unit_price: number;
  };
}

export interface Recipe {
  id: string;
  user_id: string;
  team_id?: string | null;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  synced?: boolean;
  recipe_products?: RecipeProduct[];
}

export const useRecipes = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  // Buscar team_id do usuário
  useEffect(() => {
    const fetchUserTeam = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserTeamId(data?.team_id || null);
    };
    
    fetchUserTeam();
  }, [user?.id]);

  const loadRecipes = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      await initOfflineDb();

      if (isOnline) {
        // Buscar receituários do usuário OU do time (RLS cuida do filtro)
        const { data: serverData, error } = await supabase
          .from('recipes')
          .select(`
            *,
            recipe_products (
              *,
              products (id, name, unit, unit_price)
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRecipes(serverData || []);

        if (serverData) {
          for (const recipe of serverData) {
            await put('recipes', { ...recipe, synced: true });
            if (recipe.recipe_products) {
              for (const rp of recipe.recipe_products) {
                await put('recipe_products', { ...rp, synced: true });
              }
            }
          }
        }
      } else {
        // Offline: carregar dados locais (do usuário e do time)
        const localRecipes = await getAll('recipes');
        const localRecipeProducts = await getAll('recipe_products');
        const localProducts = await getAll('products');

        // Filtrar por usuário ou time
        const filteredRecipes = localRecipes.filter((r: Recipe) => 
          r.user_id === user.id || (userTeamId && r.team_id === userTeamId)
        );

        const enrichedRecipes = filteredRecipes.map((recipe: Recipe) => ({
          ...recipe,
          recipe_products: localRecipeProducts
            .filter((rp: RecipeProduct) => rp.recipe_id === recipe.id)
            .map((rp: RecipeProduct) => ({
              ...rp,
              products: localProducts.find((p: any) => p.id === rp.product_id),
            })),
        }));

        setRecipes(enrichedRecipes);
      }
    } catch (error) {
      console.error('Erro ao carregar receituários:', error);
      try {
        const localRecipes = await getAll('recipes');
        const filteredRecipes = localRecipes.filter((r: Recipe) => 
          r.user_id === user.id || (userTeamId && r.team_id === userTeamId)
        );
        setRecipes(filteredRecipes);
      } catch (localError) {
        console.error('Erro ao carregar dados locais:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOnline, userTeamId]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const createRecipe = async (data: { 
    name: string; 
    description?: string;
    products: Array<{ product_id: string; dose_per_ha: number; dose_unit: string }> 
  }) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const now = new Date().toISOString();
    const recipeId = uuidv4();

    try {
      if (isOnline) {
        const { data: recipe, error: recipeError } = await supabase
          .from('recipes')
          .insert([{ 
            name: data.name, 
            description: data.description, 
            user_id: user.id,
            team_id: userTeamId // Adiciona o team_id automaticamente
          }])
          .select()
          .single();

        if (recipeError) throw recipeError;

        if (data.products.length > 0) {
          const { error: productsError } = await supabase
            .from('recipe_products')
            .insert(data.products.map(p => ({ ...p, recipe_id: recipe.id })));

          if (productsError) throw productsError;
        }

        await put('recipes', { ...recipe, synced: true });
        toast.success('Receituário criado com sucesso!');
        await loadRecipes();
        return recipe;
      } else {
        const localRecipe = await put('recipes', {
          id: recipeId,
          name: data.name,
          description: data.description,
          user_id: user.id,
          team_id: userTeamId, // Adiciona o team_id automaticamente
          created_at: now,
          updated_at: now,
          synced: false,
        });

        for (const p of data.products) {
          await put('recipe_products', {
            id: uuidv4(),
            recipe_id: recipeId,
            product_id: p.product_id,
            dose_per_ha: p.dose_per_ha,
            dose_unit: p.dose_unit,
            created_at: now,
            synced: false,
          });
        }

        toast.success('Receituário salvo localmente! Será sincronizado quando conectar.');
        await loadRecipes();
        return localRecipe;
      }
    } catch (error: any) {
      toast.error('Erro ao criar receituário');
      console.error(error);
      throw error;
    }
  };

  const updateRecipe = async (data: { 
    id: string;
    name: string; 
    description?: string;
    products: Array<{ product_id: string; dose_per_ha: number; dose_unit: string }> 
  }) => {
    const now = new Date().toISOString();

    try {
      if (isOnline) {
        const { error: recipeError } = await supabase
          .from('recipes')
          .update({ name: data.name, description: data.description })
          .eq('id', data.id);

        if (recipeError) throw recipeError;

        await supabase.from('recipe_products').delete().eq('recipe_id', data.id);

        if (data.products.length > 0) {
          const { error: productsError } = await supabase
            .from('recipe_products')
            .insert(data.products.map(p => ({ ...p, recipe_id: data.id })));

          if (productsError) throw productsError;
        }

        toast.success('Receituário atualizado com sucesso!');
        await loadRecipes();
        return data;
      } else {
        const existing = recipes.find(r => r.id === data.id);
        await put('recipes', {
          ...existing,
          name: data.name,
          description: data.description,
          updated_at: now,
          synced: false,
        });

        // Remove old recipe products
        const localRecipeProducts = await getAll('recipe_products');
        for (const rp of localRecipeProducts.filter((rp: RecipeProduct) => rp.recipe_id === data.id)) {
          await remove('recipe_products', rp.id);
        }

        // Add new recipe products
        for (const p of data.products) {
          await put('recipe_products', {
            id: uuidv4(),
            recipe_id: data.id,
            product_id: p.product_id,
            dose_per_ha: p.dose_per_ha,
            dose_unit: p.dose_unit,
            created_at: now,
            synced: false,
          });
        }

        toast.success('Receituário atualizado localmente! Será sincronizado quando conectar.');
        await loadRecipes();
        return data;
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar receituário');
      console.error(error);
      throw error;
    }
  };

  const deleteRecipe = async (id: string) => {
    try {
      if (isOnline) {
        const { error } = await supabase.from('recipes').delete().eq('id', id);
        if (error) throw error;
      }

      // Remove from local DB
      const localRecipeProducts = await getAll('recipe_products');
      for (const rp of localRecipeProducts.filter((rp: RecipeProduct) => rp.recipe_id === id)) {
        await remove('recipe_products', rp.id);
      }
      await remove('recipes', id);

      setRecipes(prev => prev.filter(r => r.id !== id));
      toast.success('Receituário excluído com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao excluir receituário');
      console.error(error);
      throw error;
    }
  };

  return {
    recipes,
    isLoading,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    refetch: loadRecipes,
  };
};
