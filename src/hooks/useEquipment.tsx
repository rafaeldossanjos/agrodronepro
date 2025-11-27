import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Equipment {
  id: string;
  user_id: string;
  name: string;
  model: string;
  battery_capacity: number;
  flight_time_minutes: number;
  tank_capacity: number;
  status: string;
  total_flights: number;
  total_flight_hours: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useEquipment = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ["equipment", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Equipment[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (newEquipment: Omit<Equipment, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("equipment")
        .insert([{ ...newEquipment, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipamento cadastrado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar equipamento");
      console.error(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Equipment> & { id: string }) => {
      const { data, error } = await supabase
        .from("equipment")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipamento atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar equipamento");
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipamento excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir equipamento");
      console.error(error);
    },
  });

  return {
    equipment,
    isLoading,
    createEquipment: createMutation.mutateAsync,
    updateEquipment: updateMutation.mutateAsync,
    deleteEquipment: deleteMutation.mutateAsync,
  };
};
