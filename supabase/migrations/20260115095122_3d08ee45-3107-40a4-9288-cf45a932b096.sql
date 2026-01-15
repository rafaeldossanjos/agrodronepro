-- Atualizar políticas RLS para permitir que TODOS os membros do time vejam os dados
-- (não apenas admins)

-- PROPERTIES: Atualizar política de SELECT para membros do time
DROP POLICY IF EXISTS "Usuários podem ver propriedades" ON public.properties;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias propriedades" ON public.properties;

CREATE POLICY "Usuários podem ver propriedades do time ou próprias"
ON public.properties FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND user_belongs_to_team(team_id, auth.uid()))
);

-- PRODUCTS: Atualizar política de SELECT para membros do time
DROP POLICY IF EXISTS "Usuários podem ver produtos" ON public.products;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios produtos" ON public.products;

CREATE POLICY "Usuários podem ver produtos do time ou próprios"
ON public.products FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND user_belongs_to_team(team_id, auth.uid()))
);

-- PLOTS: Atualizar política de SELECT para membros do time
DROP POLICY IF EXISTS "Usuários podem ver talhões do time" ON public.plots;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios talhões" ON public.plots;

CREATE POLICY "Usuários podem ver talhões do time ou próprios"
ON public.plots FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND user_belongs_to_team(team_id, auth.uid()))
);

-- APPLICATIONS: Atualizar política de SELECT para membros do time
DROP POLICY IF EXISTS "Usuários podem ver aplicações" ON public.applications;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias aplicações" ON public.applications;

CREATE POLICY "Usuários podem ver aplicações do time ou próprias"
ON public.applications FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND user_belongs_to_team(team_id, auth.uid()))
);

-- RECIPES: Atualizar política de SELECT para membros do time
DROP POLICY IF EXISTS "Usuários podem ver seus próprios receituários" ON public.recipes;
DROP POLICY IF EXISTS "Usuários podem ver receituários" ON public.recipes;

CREATE POLICY "Usuários podem ver receituários do time ou próprios"
ON public.recipes FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND user_belongs_to_team(team_id, auth.uid()))
);