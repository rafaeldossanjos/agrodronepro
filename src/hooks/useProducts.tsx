import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { getByIndex, put, remove, initOfflineDb } from '@/lib/offlineDb';
import { toast } from 'sonner';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  manufacturer?: string;
  category: string;
  unit_price: number;
  unit: string;
  stock_quantity: number;
  active: boolean;
  recommended_dose?: number;
  recommended_dose_unit?: string;
  created_at: string;
  updated_at: string;
  synced?: boolean;
}

export const useProducts = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      await initOfflineDb();

      if (isOnline) {
        const { data: serverData, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (error) throw error;
        setProducts(serverData || []);

        // Save to local DB for offline access
        if (serverData) {
          for (const record of serverData) {
            await put('products', { ...record, synced: true });
          }
        }
      } else {
        // Load from local DB when offline
        const localData = await getByIndex('products', 'user_id', user.id);
        setProducts(localData.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      // Fallback to local data on error
      try {
        const localData = await getByIndex('products', 'user_id', user.id);
        setProducts(localData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (localError) {
        console.error('Erro ao carregar dados locais:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOnline]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const createProductFn = async (product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const now = new Date().toISOString();
    const newProduct = {
      ...product,
      user_id: user.id,
      created_at: now,
      updated_at: now,
    };

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('products')
          .insert([newProduct])
          .select()
          .single();

        if (error) throw error;
        await put('products', { ...data, synced: true });
        setProducts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Produto criado com sucesso!');
        return data;
      } else {
        const localProduct = await put('products', { ...newProduct, synced: false });
        setProducts(prev => [...prev, localProduct].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Produto salvo localmente! Será sincronizado quando conectar.');
        return localProduct;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar produto');
      throw error;
    }
  };

  const createProduct = {
    mutate: createProductFn,
    mutateAsync: createProductFn,
  };

  const updateProductFn = async ({ id, ...product }: Partial<Product> & { id: string }) => {
    try {
      const now = new Date().toISOString();
      const updatedProduct = { ...product, id, updated_at: now };

      if (isOnline) {
        const { data, error } = await supabase
          .from('products')
          .update(product)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        await put('products', { ...data, synced: true });
        setProducts(prev => prev.map(p => p.id === id ? data : p).sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Produto atualizado com sucesso!');
        return data;
      } else {
        const existing = products.find(p => p.id === id);
        const localProduct = await put('products', { ...existing, ...updatedProduct, synced: false });
        setProducts(prev => prev.map(p => p.id === id ? localProduct : p).sort((a, b) => a.name.localeCompare(b.name)));
        toast.success('Produto atualizado localmente! Será sincronizado quando conectar.');
        return localProduct;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar produto');
      throw error;
    }
  };

  const updateProduct = {
    mutate: updateProductFn,
    mutateAsync: updateProductFn,
  };

  const deleteProductFn = async (id: string) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }
      await remove('products', id);
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Produto removido com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover produto');
      throw error;
    }
  };

  const deleteProduct = {
    mutate: deleteProductFn,
    mutateAsync: deleteProductFn,
  };

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: loadProducts,
  };
};
