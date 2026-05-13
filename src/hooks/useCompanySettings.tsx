import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompanySettings {
  id?: string;
  user_id?: string;
  razao_social?: string | null;
  registro_mapa?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  municipio?: string | null;
  uf?: string | null;
  email?: string | null;
  telefone?: string | null;
  eng_agronomo_nome?: string | null;
  eng_agronomo_crea?: string | null;
  piloto_nome?: string | null;
  piloto_registro?: string | null;
  prefixo_aeronave?: string | null;
  equipamento_padrao?: string | null;
  modelo_padrao?: string | null;
}

export const useCompanySettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      setSettings(data || null);
    } catch (e) {
      console.error('Erro ao carregar configurações da empresa', e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (payload: CompanySettings) => {
    if (!user?.id) throw new Error('Usuário não autenticado');
    try {
      const data = { ...payload, user_id: user.id };
      let result;
      if (settings?.id) {
        const { data: updated, error } = await supabase
          .from('company_settings')
          .update(data)
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        result = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from('company_settings')
          .insert([data])
          .select()
          .single();
        if (error) throw error;
        result = inserted;
      }
      setSettings(result);
      toast.success('Dados da empresa salvos!');
      return result;
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar dados da empresa');
      throw e;
    }
  };

  return { settings, isLoading, save, refetch: load };
};
