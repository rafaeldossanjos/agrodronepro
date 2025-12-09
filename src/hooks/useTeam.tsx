import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

export const useTeam = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Buscar time do usuário
  const { data: team, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Primeiro tenta buscar o time onde o usuário é membro
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) throw memberError;

      if (memberData?.team_id) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', memberData.team_id)
          .single();

        if (teamError) throw teamError;
        return teamData as Team;
      }

      return null;
    },
    enabled: !!user,
  });

  // Buscar role do usuário no time
  const { data: userRole } = useQuery({
    queryKey: ['userRole', user?.id, team?.id],
    queryFn: async () => {
      if (!user || !team) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', team.id)
        .single();

      if (error) throw error;
      return data?.role as TeamRole;
    },
    enabled: !!user && !!team,
  });

  // Buscar membros do time
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ['teamMembers', team?.id],
    queryFn: async () => {
      if (!team) return [];

      // Buscar membros
      const { data: membersOnly, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;

      // Buscar profiles separadamente
      const userIds = membersOnly?.map(m => m.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      
      return (membersOnly || []).map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || { full_name: 'Usuário', email: '' }
      })) as TeamMember[];
    },
    enabled: !!team,
  });

  // Criar time
  const createTeam = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Criar o time
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({ name, owner_id: user.id })
        .select()
        .single();

      if (teamError) throw teamError;

      // Adicionar o criador como owner
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamData.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      return teamData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['userRole'] });
      toast.success('Equipe criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar equipe');
    },
  });

  // Atualizar nome do time
  const updateTeam = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Equipe atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar equipe');
    },
  });

  // Adicionar membro (por email - precisa buscar user_id)
  const addMember = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: TeamRole }) => {
      if (!team) throw new Error('Time não encontrado');

      // Buscar usuário pelo email na tabela profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('Usuário não encontrado. Verifique se o email está correto.');

      // Verificar se já é membro
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id)
        .eq('user_id', profileData.id)
        .maybeSingle();

      if (existingMember) throw new Error('Este usuário já faz parte da equipe.');

      // Adicionar como membro
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: profileData.id,
          role: role
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Membro adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao adicionar membro');
    },
  });

  // Atualizar role do membro
  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: TeamRole }) => {
      const { data, error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', memberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Função atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar função');
    },
  });

  // Remover membro
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      toast.success('Membro removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover membro');
    },
  });

  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const isOwner = userRole === 'owner';

  return {
    team,
    members,
    userRole,
    isAdmin,
    isOwner,
    isLoading: isLoadingTeam || isLoadingMembers,
    createTeam,
    updateTeam,
    addMember,
    updateMemberRole,
    removeMember,
  };
};
