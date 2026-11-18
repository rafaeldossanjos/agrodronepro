import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { bulkPut, initOfflineDb } from '@/lib/offlineDb';

/**
 * Preloads all main data into IndexedDB whenever the user is online.
 * This way the app has data available even after a long time offline.
 */
export function useOfflinePreload() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!user?.id || !isOnline) return;

    const preload = async () => {
      try {
        await initOfflineDb();

        // Properties
        const { data: properties } = await supabase
          .from('properties')
          .select('*');
        if (properties?.length) await bulkPut('properties', properties);

        // Products
        const { data: products } = await supabase
          .from('products')
          .select('*');
        if (products?.length) await bulkPut('products', products);

        // Applications + products
        const { data: applications } = await supabase
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
          `);
        if (applications?.length) {
          await bulkPut('applications', applications);
          const allAP = applications.flatMap((app: any) => app.application_products || []);
          if (allAP.length) await bulkPut('application_products', allAP);
        }

        // Plots
        const { data: plots } = await supabase
          .from('plots')
          .select('*');
        if (plots?.length) await bulkPut('plots', plots);

        // Recipes
        const { data: recipes } = await supabase
          .from('recipes')
          .select(`
            *,
            recipe_products(
              id,
              product_id,
              dose_per_ha,
              dose_unit,
              products(name, unit)
            )
          `);
        if (recipes?.length) {
          await bulkPut('recipes', recipes);
          const allRP = recipes.flatMap((r: any) => r.recipe_products || []);
          if (allRP.length) await bulkPut('recipe_products', allRP);
        }

        // Stock movements (last 90 days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const { data: movements } = await supabase
          .from('stock_movements')
          .select('*')
          .gte('created_at', ninetyDaysAgo.toISOString());
        if (movements?.length) await bulkPut('stock_movements', movements);

        console.log('[OfflinePreload] Data saved to IndexedDB');
      } catch (err) {
        console.warn('[OfflinePreload] Failed:', err);
      }
    };

    preload();
  }, [user?.id, isOnline]);
}
