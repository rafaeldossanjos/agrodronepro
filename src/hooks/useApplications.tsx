import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { getByIndex, put, remove, getAll, initOfflineDb } from '@/lib/offlineDb';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface Application {
  id: string;
  user_id: string;
  property_id: string;
  plot_name?: string | null;
  application_date: string;
  application_type: 'pulverização' | 'adubação' | 'semeadura' | 'outro';
  status: 'planejada' | 'em_andamento' | 'concluída' | 'cancelada';
  area_applied: number;
  total_cost: number;
  flight_time_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  synced?: boolean;
  properties?: { name: string };
  application_products?: Array<{
    id: string;
    product_id: string;
    dose_per_ha: number;
    total_amount: number;
    unit_cost: number;
    total_cost: number;
    products?: { name: string; unit: string };
  }>;
}

export const useApplications = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadApplications = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      await initOfflineDb();

      if (isOnline) {
        const { data: serverData, error } = await supabase
          .from('applications')
          .select(`
            *,
            properties(name),
            application_products(
              id,
              product_id,
              dose_per_ha,
              total_amount,
              unit_cost,
              total_cost,
              products(name, unit)
            )
          `)
          .eq('user_id', user.id)
          .order('application_date', { ascending: false });

        if (error) throw error;
        setApplications(serverData || []);

        // Save applications to local DB
        if (serverData) {
          for (const app of serverData) {
            await put('applications', { ...app, synced: true });
            // Save application_products
            if (app.application_products) {
              for (const ap of app.application_products) {
                await put('application_products', { ...ap, synced: true });
              }
            }
          }
        }
      } else {
        // Load from local DB when offline
        const localApps = await getByIndex('applications', 'user_id', user.id);
        const localProperties = await getAll('properties');
        const localAppProducts = await getAll('application_products');
        const localProducts = await getAll('products');

        // Join data locally
        const enrichedApps = localApps.map(app => ({
          ...app,
          properties: localProperties.find(p => p.id === app.property_id),
          application_products: localAppProducts
            .filter(ap => ap.application_id === app.id)
            .map(ap => ({
              ...ap,
              products: localProducts.find(p => p.id === ap.product_id),
            })),
        }));

        setApplications(enrichedApps.sort((a, b) => 
          new Date(b.application_date).getTime() - new Date(a.application_date).getTime()
        ));
      }
    } catch (error) {
      console.error('Erro ao carregar aplicações:', error);
      try {
        const localApps = await getByIndex('applications', 'user_id', user.id);
        setApplications(localApps);
      } catch (localError) {
        console.error('Erro ao carregar dados locais:', localError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOnline]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const createApplicationFn = async (application: any) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    const now = new Date().toISOString();
    const appId = uuidv4();
    
    const newApp = {
      id: appId,
      user_id: user.id,
      property_id: application.property_id,
      plot_name: application.plot_name || null,
      application_date: application.application_date,
      application_type: application.application_type,
      status: application.status,
      area_applied: application.area_applied,
      total_cost: application.total_cost,
      flight_time_minutes: application.flight_time_minutes,
      notes: application.notes,
      created_at: now,
      updated_at: now,
    };

    try {
      if (isOnline) {
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .insert([newApp])
          .select()
          .single();

        if (appError) throw appError;

        if (application.products && application.products.length > 0) {
          const productsData = application.products.map((p: any) => ({
            application_id: appData.id,
            product_id: p.product_id,
            dose_per_ha: p.dose_per_ha,
            total_amount: p.total_amount,
            unit_cost: p.unit_cost,
            total_cost: p.total_cost,
          }));

          const { error: productsError } = await supabase
            .from('application_products')
            .insert(productsData);

          if (productsError) throw productsError;
        }

        await put('applications', { ...appData, synced: true });
        toast.success('Aplicação criada com sucesso!');
        await loadApplications();
        return appData;
      } else {
        // Offline: save locally
        const localApp = await put('applications', { ...newApp, synced: false });

        if (application.products && application.products.length > 0) {
          for (const p of application.products) {
            await put('application_products', {
              id: uuidv4(),
              application_id: appId,
              product_id: p.product_id,
              dose_per_ha: p.dose_per_ha,
              total_amount: p.total_amount,
              unit_cost: p.unit_cost,
              total_cost: p.total_cost,
              synced: false,
            });
          }
        }

        toast.success('Aplicação salva localmente! Será sincronizada quando conectar.');
        await loadApplications();
        return localApp;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar aplicação');
      throw error;
    }
  };

  const createApplication = {
    mutate: createApplicationFn,
    mutateAsync: createApplicationFn,
  };

  const updateApplicationFn = async ({ id, ...application }: Partial<Application> & { id: string }) => {
    try {
      const now = new Date().toISOString();

      if (isOnline) {
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .update({
            property_id: application.property_id,
            plot_name: application.plot_name || null,
            application_date: application.application_date,
            application_type: application.application_type,
            status: application.status,
            area_applied: application.area_applied,
            total_cost: application.total_cost,
            flight_time_minutes: application.flight_time_minutes,
            notes: application.notes,
          })
          .eq('id', id)
          .select()
          .single();

        if (appError) throw appError;

        if ((application as any).products) {
          await supabase
            .from('application_products')
            .delete()
            .eq('application_id', id);

          const productsData = (application as any).products.map((p: any) => ({
            application_id: id,
            product_id: p.product_id,
            dose_per_ha: p.dose_per_ha,
            total_amount: p.total_amount,
            unit_cost: p.unit_cost,
            total_cost: p.total_cost,
          }));

          const { error: productsError } = await supabase
            .from('application_products')
            .insert(productsData);

          if (productsError) throw productsError;
        }

        await put('applications', { ...appData, synced: true });
        toast.success('Aplicação atualizada com sucesso!');
        await loadApplications();
        return appData;
      } else {
        const existing = applications.find(a => a.id === id);
        const localApp = await put('applications', { 
          ...existing, 
          ...application, 
          id, 
          updated_at: now, 
          synced: false 
        });

        toast.success('Aplicação atualizada localmente! Será sincronizada quando conectar.');
        await loadApplications();
        return localApp;
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar aplicação');
      throw error;
    }
  };

  const updateApplication = {
    mutate: updateApplicationFn,
    mutateAsync: updateApplicationFn,
  };

  const deleteApplicationFn = async (id: string) => {
    try {
      if (isOnline) {
        await supabase
          .from('application_products')
          .delete()
          .eq('application_id', id);

        const { error } = await supabase
          .from('applications')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }
      
      // Remove from local DB
      const localAppProducts = await getAll('application_products');
      for (const ap of localAppProducts.filter(ap => ap.application_id === id)) {
        await remove('application_products', ap.id);
      }
      await remove('applications', id);
      
      setApplications(prev => prev.filter(a => a.id !== id));
      toast.success('Aplicação removida com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover aplicação');
      throw error;
    }
  };

  const deleteApplication = {
    mutate: deleteApplicationFn,
    mutateAsync: deleteApplicationFn,
  };

  return {
    applications,
    isLoading,
    createApplication,
    updateApplication,
    deleteApplication,
    refetch: loadApplications,
  };
};
