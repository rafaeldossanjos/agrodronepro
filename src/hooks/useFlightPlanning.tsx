import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FlightPlan {
  id: string;
  user_id: string;
  property_id: string | null;
  name: string;
  area: number;
  flight_speed: number;
  swath_width: number;
  battery_time_minutes: number;
  estimated_flights: number | null;
  estimated_time_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useFlightPlanning = () => {
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['flight_planning'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flight_planning')
        .select(`
          *,
          properties (name, location)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (plan: Omit<FlightPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('flight_planning')
        .insert([{ ...plan, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight_planning'] });
      toast.success('Planejamento criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar planejamento');
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...plan }: Partial<FlightPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('flight_planning')
        .update(plan)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight_planning'] });
      toast.success('Planejamento atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar planejamento');
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flight_planning')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight_planning'] });
      toast.success('Planejamento removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover planejamento');
    },
  });

  return {
    plans,
    isLoading,
    createPlan,
    updatePlan,
    deletePlan,
  };
};
