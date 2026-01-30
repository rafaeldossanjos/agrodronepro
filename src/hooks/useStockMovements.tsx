import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
import { getByIndex, put } from '@/lib/offlineDb';
import { toast } from 'sonner';

export type MovementType = 'entrada' | 'saida' | 'ajuste';

export interface StockMovement {
  id: string;
  user_id: string;
  team_id?: string | null;
  product_id: string;
  property_id: string;
  application_id?: string | null;
  movement_type: MovementType;
  quantity: number;
  unit: string;
  reason?: string | null;
  notes?: string | null;
  movement_date: string;
  created_at: string;
  updated_at: string;
  // Joined data
  product?: { name: string; unit: string } | null;
  property?: { name: string };
  application?: { name: string | null };
}

export interface StockBalance {
  id: string;
  user_id: string;
  team_id?: string | null;
  product_id: string;
  property_id: string;
  current_quantity: number;
  unit: string;
  min_quantity: number;
  created_at: string;
  updated_at: string;
  // Joined data
  product?: { name: string; manufacturer?: string };
  property?: { name: string };
}

const computeBalancesFromMovements = (rows: Array<Record<string, any>>): StockBalance[] => {
  const now = new Date().toISOString();
  const map = new Map<string, StockBalance>();

  for (const m of rows) {
    const key = `${m.product_id}__${m.property_id}`;
    const qty = Number(m.quantity || 0);
    const delta =
      m.movement_type === 'entrada'
        ? qty
        : m.movement_type === 'saida'
          ? -qty
          : qty;

    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        id: `local_${key}`,
        user_id: m.user_id,
        team_id: m.team_id ?? null,
        product_id: m.product_id,
        property_id: m.property_id,
        current_quantity: delta,
        unit: m.unit,
        min_quantity: 0,
        created_at: m.created_at ?? now,
        updated_at: m.updated_at ?? now,
      });
    } else {
      prev.current_quantity = Number(prev.current_quantity) + delta;
      prev.updated_at = now;
    }
  }

  return Array.from(map.values());
};

export const useStockMovements = () => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  // Fetch user team
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

  const loadMovements = useCallback(async () => {
    if (!user?.id) {
      setMovements([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      if (isOnline) {
        const { data, error } = await supabase
          .from('stock_movements')
          .select(`
            *,
            product:products(name, unit),
            property:properties(name),
            application:applications(name)
          `)
          .order('movement_date', { ascending: false });

        if (error) throw error;

        // Cache local (sem joins) para funcionar offline e evitar erros no sync
        await Promise.all(
          (data || []).map((d: any) => {
            const { product, property, application, ...row } = d;
            return put('stock_movements', { ...row, synced: true });
          })
        );

        setMovements((data || []).map((d: any) => ({
          ...d,
          movement_type: d.movement_type as MovementType,
        })));
      } else {
        const localData = await getByIndex('stock_movements', 'user_id', user.id);
        const sorted = [...(localData || [])].sort((a: any, b: any) =>
          new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime()
        );
        setMovements(sorted.map((d: any) => ({
          ...d,
          movement_type: d.movement_type as MovementType,
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
      try {
        const localData = await getByIndex('stock_movements', 'user_id', user.id);
        setMovements((localData || []).map((d: any) => ({
          ...d,
          movement_type: d.movement_type as MovementType,
        })));
      } catch {
        setMovements([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isOnline]);

  const loadBalances = useCallback(async () => {
    if (!user?.id) {
      setBalances([]);
      return;
    }

    try {
      if (isOnline) {
        const { data, error } = await supabase
          .from('stock_balances')
          .select(`
            *,
            product:products(name, manufacturer),
            property:properties(name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Cache local (sem joins)
        await Promise.all(
          (data || []).map((d: any) => {
            const { product, property, ...row } = d;
            return put('stock_balances', { ...row, synced: true });
          })
        );

        setBalances(data || []);
      } else {
        const localBalances = await getByIndex('stock_balances', 'user_id', user.id);
        if (localBalances && localBalances.length > 0) {
          setBalances(localBalances);
        } else {
          const localMovements = await getByIndex('stock_movements', 'user_id', user.id);
          setBalances(computeBalancesFromMovements(localMovements || []));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar saldos:', error);
      try {
        const localBalances = await getByIndex('stock_balances', 'user_id', user.id);
        if (localBalances && localBalances.length > 0) {
          setBalances(localBalances);
        } else {
          const localMovements = await getByIndex('stock_movements', 'user_id', user.id);
          setBalances(computeBalancesFromMovements(localMovements || []));
        }
      } catch {
        setBalances([]);
      }
    }
  }, [user?.id, isOnline]);

  useEffect(() => {
    loadMovements();
    loadBalances();
  }, [loadMovements, loadBalances]);

  const createMovement = async (movement: Omit<StockMovement, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'team_id'>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    try {
      // Offline-first: salva localmente e sincroniza automaticamente ao reconectar
      if (!isOnline) {
        const now = new Date().toISOString();
        const localRecord = await put('stock_movements', {
          ...movement,
          user_id: user.id,
          team_id: userTeamId,
          created_at: now,
          updated_at: now,
          synced: false,
        });

        await loadMovements();
        await loadBalances();
        toast.success('Movimentação salva offline. Será sincronizada ao reconectar.');
        return localRecord;
      }

      const { data, error } = await supabase
        .from('stock_movements')
        .insert([{
          ...movement,
          user_id: user.id,
          team_id: userTeamId,
        }])
        .select(`
          *,
          product:products(name, unit),
          property:properties(name)
        `)
        .single();

      if (error) throw error;
      
      await loadMovements();
      await loadBalances();
      toast.success('Movimentação registrada com sucesso!');
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar movimentação');
      throw error;
    }
  };

  const createBulkMovements = async (movements: Array<Omit<StockMovement, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'team_id'>>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    try {
      const movementsWithUser = movements.map(m => ({
        ...m,
        user_id: user.id,
        team_id: userTeamId,
      }));

      const { error } = await supabase
        .from('stock_movements')
        .insert(movementsWithUser);

      if (error) throw error;
      
      await loadMovements();
      await loadBalances();
      return true;
    } catch (error: any) {
      console.error('Erro ao registrar movimentações:', error);
      throw error;
    }
  };

  const updateMovement = async (id: string, movement: Partial<Omit<StockMovement, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'team_id'>>) => {
    try {
      const { error } = await supabase
        .from('stock_movements')
        .update(movement)
        .eq('id', id);

      if (error) throw error;
      
      await loadMovements();
      await loadBalances();
      toast.success('Movimentação atualizada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar movimentação');
      throw error;
    }
  };

  const deleteMovement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stock_movements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadMovements();
      await loadBalances();
      toast.success('Movimentação removida com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover movimentação');
      throw error;
    }
  };

  const updateMinQuantity = async (balanceId: string, minQuantity: number) => {
    try {
      const { error } = await supabase
        .from('stock_balances')
        .update({ min_quantity: minQuantity })
        .eq('id', balanceId);

      if (error) throw error;
      
      await loadBalances();
      toast.success('Estoque mínimo atualizado!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar estoque mínimo');
      throw error;
    }
  };

  const getBalanceByProductAndProperty = (productId: string, propertyId: string) => {
    return balances.find(b => b.product_id === productId && b.property_id === propertyId);
  };

  return {
    movements,
    balances,
    isLoading,
    createMovement,
    createBulkMovements,
    updateMovement,
    deleteMovement,
    updateMinQuantity,
    getBalanceByProductAndProperty,
    refetch: () => {
      loadMovements();
      loadBalances();
    },
  };
};
