-- Enum para roles
CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'member');

-- Tabela de times/organizações
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de membros do time
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Adicionar team_id às tabelas existentes
ALTER TABLE public.properties ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.applications ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.recipes ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário pertence a um time
CREATE OR REPLACE FUNCTION public.user_belongs_to_team(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- Função para verificar se usuário é owner ou admin do time
CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id 
      AND team_id = _team_id 
      AND role IN ('owner', 'admin')
  )
$$;

-- Função para obter o time do usuário
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id LIMIT 1
$$;

-- Políticas para teams
CREATE POLICY "Membros podem ver seu time"
ON public.teams FOR SELECT
USING (public.user_belongs_to_team(auth.uid(), id));

CREATE POLICY "Apenas owners podem atualizar time"
ON public.teams FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Usuários podem criar times"
ON public.teams FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Apenas owners podem deletar times"
ON public.teams FOR DELETE
USING (owner_id = auth.uid());

-- Políticas para team_members
CREATE POLICY "Membros podem ver colegas de time"
ON public.team_members FOR SELECT
USING (public.user_belongs_to_team(auth.uid(), team_id));

CREATE POLICY "Admins podem adicionar membros"
ON public.team_members FOR INSERT
WITH CHECK (public.is_team_admin(auth.uid(), team_id));

CREATE POLICY "Admins podem atualizar membros"
ON public.team_members FOR UPDATE
USING (public.is_team_admin(auth.uid(), team_id));

CREATE POLICY "Admins podem remover membros"
ON public.team_members FOR DELETE
USING (public.is_team_admin(auth.uid(), team_id));

-- Atualizar políticas das tabelas existentes para suportar times
-- Properties: usuário vê próprios dados OU dados do time (se admin/owner)
DROP POLICY IF EXISTS "Usuários podem ver suas próprias propriedades " ON public.properties;
CREATE POLICY "Usuários podem ver propriedades"
ON public.properties FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND public.is_team_admin(auth.uid(), team_id))
);

-- Products
DROP POLICY IF EXISTS "Usuários podem ver seus próprios produtos " ON public.products;
CREATE POLICY "Usuários podem ver produtos"
ON public.products FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND public.is_team_admin(auth.uid(), team_id))
);

-- Applications
DROP POLICY IF EXISTS "Usuários podem ver suas próprias aplicações " ON public.applications;
CREATE POLICY "Usuários podem ver aplicações"
ON public.applications FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND public.is_team_admin(auth.uid(), team_id))
);

-- Recipes
DROP POLICY IF EXISTS "Usuários podem ver seus próprios receituários " ON public.recipes;
CREATE POLICY "Usuários podem ver receituários"
ON public.recipes FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND public.is_team_admin(auth.uid(), team_id))
);

-- Trigger para updated_at em teams
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();