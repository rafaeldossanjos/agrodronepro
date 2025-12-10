import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  color: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  team_id: string | null;
}

export const usePlots = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlots = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
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
      
      setPlots(parsedPlots);
    } catch (error) {
      console.error('Erro ao carregar talhões:', error);
      toast.error('Erro ao carregar talhões');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPlots();
  }, [loadPlots]);

  const createPlot = async (plot: Omit<Plot, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'team_id'>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    try {
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
      
      const newPlot = {
        ...data,
        geometry: typeof data.geometry === 'string' 
          ? JSON.parse(data.geometry) 
          : data.geometry
      } as Plot;
      
      setPlots(prev => [newPlot, ...prev]);
      toast.success('Talhão criado com sucesso!');
      return newPlot;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar talhão');
      throw error;
    }
  };

  const updatePlot = async ({ id, ...plot }: Partial<Plot> & { id: string }) => {
    try {
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
      
      const updatedPlot = {
        ...data,
        geometry: typeof data.geometry === 'string' 
          ? JSON.parse(data.geometry) 
          : data.geometry
      } as Plot;
      
      setPlots(prev => prev.map(p => p.id === id ? updatedPlot : p));
      toast.success('Talhão atualizado com sucesso!');
      return updatedPlot;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar talhão');
      throw error;
    }
  };

  const deletePlot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('plots')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPlots(prev => prev.filter(p => p.id !== id));
      toast.success('Talhão removido com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover talhão');
      throw error;
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
