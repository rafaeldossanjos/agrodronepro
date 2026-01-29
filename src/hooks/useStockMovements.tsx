import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '@/integrations/supabase/client';
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
        setMovements((data || []).map(d => ({
          ...d,
          movement_type: d.movement_type as MovementType
        })));
      } else {
        // Offline: manter dados existentes ou vazio
        setMovements([]);
      }
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
      setMovements([]);
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
        setBalances(data || []);
      } else {
        // Offline: manter dados existentes ou vazio
        setBalances([]);
      }
    } catch (error) {
      console.error('Erro ao carregar saldos:', error);
      setBalances([]);
    }
  }, [user?.id, isOnline]);

  useEffect(() => {
    loadMovements();
    loadBalances();
  }, [loadMovements, loadBalances]);

  const createMovement = async (movement: Omit<StockMovement, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'team_id'>) => {
    if (!user?.id) throw new Error('Usuário não autenticado');

    try {
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
