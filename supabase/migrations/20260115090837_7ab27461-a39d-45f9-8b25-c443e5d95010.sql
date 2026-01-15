-- Corrigir política de INSERT na tabela team_members
-- O problema é que ao criar um time, o owner ainda não está no team_members
-- e não tem permissão para adicionar a si mesmo

-- Remover a política atual de INSERT
DROP POLICY IF EXISTS "Admins podem adicionar membros" ON public.team_members;

-- Criar nova política que permite:
-- 1. O owner do time pode adicionar membros
-- 2. Admins do time podem adicionar membros
CREATE POLICY "Owners e admins podem adicionar membros" 
ON public.team_members 
FOR INSERT 
WITH CHECK (
  -- Owner do time pode adicionar membros (incluindo a si mesmo)
  EXISTS (
    SELECT 1 FROM public.teams 
    WHERE teams.id = team_members.team_id 
    AND teams.owner_id = auth.uid()
  )
  OR
  -- Admins existentes podem adicionar membros
  is_team_admin(auth.uid(), team_id)
);