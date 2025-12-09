import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { getByIndex, put, remove, initOfflineDb } from '@/lib/offlineDb';
import { toast } from 'sonner';

export interface Property {
  id: string;
  user_id: string;
  name: string;
  location: string;
  total_area: number;
  plot_count: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  synced?: boolean;
}

export const useProperties = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProperties = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      await initOfflineDb();

      if (isOnline) {
        const { data: serverData, error } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProperties(serverData || []);

        if (serverData) {
          for (const record of serverData) {
            await put('properties', { ...record, synced: true });
          }
        }
      } else {
        const localData = await getByIndex('properties', 'user_id', user.id);
        setProperties(localData);
      }
    } catch (error) {
      console.error('Erro ao carregar propriedades:', error);
      try {
        const localData = await getByIndex('properties', 'user_id', user.id);
        setProperties(localData);
      } catch (localError) {
        console.error('Erro ao carregar dados locais:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOnline]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const createPropertyFn = async (property: Omit<Property, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const now = new Date().toISOString();
    const newProperty = {
      ...property,
      user_id: user.id,
      created_at: now,
      updated_at: now,
    };

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('properties')
          .insert([newProperty])
          .select()
          .single();

        if (error) throw error;
        await put('properties', { ...data, synced: true });
        setProperties(prev => [data, ...prev]);
        toast.success('Propriedade criada com sucesso!');
        return data;
      } else {
        const localProperty = await put('properties', { ...newProperty, synced: false });
        setProperties(prev => [localProperty, ...prev]);
        toast.success('Propriedade salva localmente! Será sincronizada quando conectar.');
        return localProperty;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar propriedade');
      throw error;
    }
  };

  const createProperty = {
    mutate: createPropertyFn,
    mutateAsync: createPropertyFn,
  };

  const updatePropertyFn = async ({ id, ...property }: Partial<Property> & { id: string }) => {
    try {
      const now = new Date().toISOString();

      if (isOnline) {
        const { data, error } = await supabase
          .from('properties')
          .update(property)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        await put('properties', { ...data, synced: true });
        setProperties(prev => prev.map(p => p.id === id ? data : p));
        toast.success('Propriedade atualizada com sucesso!');
        return data;
      } else {
        const existing = properties.find(p => p.id === id);
        const localProperty = await put('properties', { ...existing, ...property, id, updated_at: now, synced: false });
        setProperties(prev => prev.map(p => p.id === id ? localProperty : p));
        toast.success('Propriedade atualizada localmente! Será sincronizada quando conectar.');
        return localProperty;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar propriedade');
      throw error;
    }
  };

  const updateProperty = {
    mutate: updatePropertyFn,
    mutateAsync: updatePropertyFn,
  };

  const deletePropertyFn = async (id: string) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('properties')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }
      await remove('properties', id);
      setProperties(prev => prev.filter(p => p.id !== id));
      toast.success('Propriedade removida com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover propriedade');
      throw error;
    }
  };

  const deleteProperty = {
    mutate: deletePropertyFn,
    mutateAsync: deletePropertyFn,
  };

  return {
    properties,
    isLoading,
    createProperty,
    updateProperty,
    deleteProperty,
    refetch: loadProperties,
  };
};
