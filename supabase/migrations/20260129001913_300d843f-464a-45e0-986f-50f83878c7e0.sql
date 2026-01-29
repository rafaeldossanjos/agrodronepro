-- Fix profile email enumeration vulnerability
-- Drop the overly permissive policy that allows any authenticated user to query profiles
DROP POLICY IF EXISTS "Usuários autenticados podem buscar perfis por email" ON public.profiles;

-- Create a more restrictive policy that only allows:
-- 1. Users to see their own profile
-- 2. Users to see profiles of other members in the same team
CREATE POLICY "Usuários podem ver perfis de membros do time"
ON public.profiles FOR SELECT
USING (
  id = auth.uid() -- Own profile
  OR EXISTS (
    SELECT 1 FROM public.team_members tm1
    INNER JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = auth.uid() 
    AND tm2.user_id = profiles.id
  )
);

-- Drop the redundant "own profile" policy since it's now covered by the new policy
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;