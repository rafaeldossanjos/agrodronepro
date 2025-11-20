import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Application {
  id: string;
  user_id: string;
  property_id: string;
  product_id: string;
  application_date: string;
  application_type: 'pulverização' | 'adubação' | 'semeadura' | 'outro';
  status: 'planejada' | 'em_andamento' | 'concluída' | 'cancelada';
  area_applied: number;
  product_amount: number;
  total_cost: number;
  flight_time_minutes?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useApplications = () => {
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          properties (name, location),
          products (name, unit)
        `)
        .order('application_date', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const createApplication = useMutation({
    mutationFn: async (application: Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('applications')
        .insert([{ ...application, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Aplicação criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar aplicação');
    },
  });

  const updateApplication = useMutation({
    mutationFn: async ({ id, ...application }: Partial<Application> & { id: string }) => {
      const { data, error } = await supabase
        .from('applications')
        .update(application)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Aplicação atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar aplicação');
    },
  });

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Aplicação removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover aplicação');
    },
  });

  return {
    applications,
    isLoading,
    createApplication,
    updateApplication,
    deleteApplication,
  };
};
