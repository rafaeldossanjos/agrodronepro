import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { getAll, put, remove, bulkPut } from '@/lib/offlineDb';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface PlotGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Plot {
  id: string;
  user_id: string;
  property_id: string | null;
  name: string;
  area_hectares: number | null;
  geometry: PlotGeometry;
  color: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  team_id: string | null;
  synced?: boolean;
}

const STORE_NAME = 'plots';

export const usePlots = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlots = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('plots')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Parse geometry from JSONB
        const parsedPlots = (data || []).map(plot => ({
          ...plot,
          geometry: typeof plot.geometry === 'string' 
            ? JSON.parse(plot.geometry) 
            : plot.geometry
        })) as Plot[];
        
        // Sync to local storage
        await bulkPut(STORE_NAME, parsedPlots);
        setPlots(parsedPlots);
      } else {
        // Load from local storage when offline
        const localPlots = await getAll(STORE_NAME);
        const userPlots = localPlots
          .filter((p: Plot) => p.user_id === user.id)
          .map((plot: Plot) => ({
            ...plot,
            geometry: typeof plot.geometry === 'string' 
              ? JSON.parse(plot.geometry as unknown as string) 
              : plot.geometry
          }));
        setPlots(userPlots);
      }
    } catch (error) {
      console.error('Erro ao carregar talhões:', error);
      // Try to load from local storage on error
      try {
        const localPlots = await getAll(STORE_NAME);
        const userPlots = localPlots
          .filter((p: Plot) => p.user_id === user.id)
          .map((plot: Plot) => ({
            ...plot,
            geometry: typeof plot.geometry === 'string' 
              ? JSON.parse(plot.geometry as unknown as string) 
              : plot.geometry
          }));
        setPlots(userPlots);
      } catch {
        toast.error('Erro ao carregar talhões');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOnline]);

  useEffect(() => {
    loadPlots();
  }, [loadPlots]);

  const createPlot = async (plot: Omit<Plot, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'team_id'>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const newPlot: Plot = {
      ...plot,
      id: uuidv4(),
      user_id: user.id,
      team_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: false,
    };

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('plots')
          .insert([{
            ...plot,
            user_id: user.id,
            geometry: JSON.parse(JSON.stringify(plot.geometry)),
          }])
          .select()
          .single();

        if (error) throw error;
        
        const createdPlot = {
          ...data,
          geometry: typeof data.geometry === 'string' 
            ? JSON.parse(data.geometry) 
            : data.geometry,
          synced: true,
        } as Plot;
        
        await put(STORE_NAME, createdPlot);
        setPlots(prev => [createdPlot, ...prev]);
        toast.success('Talhão criado com sucesso!');
        return createdPlot;
      } else {
        // Create locally when offline
        await put(STORE_NAME, {
          ...newPlot,
          geometry: JSON.parse(JSON.stringify(newPlot.geometry)),
        });
        setPlots(prev => [newPlot, ...prev]);
        toast.success('Talhão salvo localmente. Será sincronizado quando online.');
        return newPlot;
      }
    } catch (error: any) {
      // Save locally if online request fails
      await put(STORE_NAME, {
        ...newPlot,
        geometry: JSON.parse(JSON.stringify(newPlot.geometry)),
      });
      setPlots(prev => [newPlot, ...prev]);
      toast.warning('Talhão salvo localmente. Será sincronizado quando online.');
      return newPlot;
    }
  };

  const updatePlot = async ({ id, ...plot }: Partial<Plot> & { id: string }) => {
    try {
      const existingPlot = plots.find(p => p.id === id);
      if (!existingPlot) throw new Error('Talhão não encontrado');

      const updatedPlot = {
        ...existingPlot,
        ...plot,
        updated_at: new Date().toISOString(),
        synced: false,
      };

      if (isOnline) {
        const updateData: Record<string, unknown> = { ...plot };
        if (plot.geometry) {
          updateData.geometry = JSON.parse(JSON.stringify(plot.geometry));
        }

        const { data, error } = await supabase
          .from('plots')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        
        const syncedPlot = {
          ...data,
          geometry: typeof data.geometry === 'string' 
            ? JSON.parse(data.geometry) 
            : data.geometry,
          synced: true,
        } as Plot;
        
        await put(STORE_NAME, syncedPlot);
        setPlots(prev => prev.map(p => p.id === id ? syncedPlot : p));
        toast.success('Talhão atualizado com sucesso!');
        return syncedPlot;
      } else {
        // Update locally when offline
        await put(STORE_NAME, {
          ...updatedPlot,
          geometry: JSON.parse(JSON.stringify(updatedPlot.geometry)),
        });
        setPlots(prev => prev.map(p => p.id === id ? updatedPlot : p));
        toast.success('Talhão salvo localmente. Será sincronizado quando online.');
        return updatedPlot;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar talhão');
      throw error;
    }
  };

  const deletePlot = async (id: string) => {
    try {
      if (isOnline) {
        const { error } = await supabase
          .from('plots')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }
      
      // Always remove from local storage
      await remove(STORE_NAME, id);
      setPlots(prev => prev.filter(p => p.id !== id));
      toast.success('Talhão removido com sucesso!');
    } catch (error: any) {
      // If we're offline, still remove locally
      if (!isOnline) {
        await remove(STORE_NAME, id);
        setPlots(prev => prev.filter(p => p.id !== id));
        toast.success('Talhão removido localmente.');
      } else {
        toast.error(error.message || 'Erro ao remover talhão');
        throw error;
      }
    }
  };

  return {
    plots,
    isLoading,
    createPlot,
    updatePlot,
    deletePlot,
    refetch: loadPlots,
  };
};
