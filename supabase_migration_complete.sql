-- ============================================
-- SQL COMPLETO PARA MIGRAÇÃO - AgroDronePro
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- ============================================
-- 1. TIPOS ENUM
-- ============================================

CREATE TYPE public.application_status AS ENUM (
  'planejada',
  'em_andamento',
  'concluída',
  'cancelada'
);

CREATE TYPE public.application_type AS ENUM (
  'pulverização',
  'adubação',
  'semeadura',
  'outro'
);

CREATE TYPE public.team_role AS ENUM (
  'owner',
  'admin',
  'member'
);

-- ============================================
-- 2. FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Função alternativa para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Função para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.email
  );
  RETURN NEW;
END;
$function$;

-- Função para verificar se usuário pertence ao time
CREATE OR REPLACE FUNCTION public.user_belongs_to_team(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$function$;

-- Função para verificar se usuário é admin do time
CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id 
      AND team_id = _team_id 
      AND role IN ('owner', 'admin')
  )
$function$;

-- Função para obter team_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id LIMIT 1
$function$;

-- Função para atualizar saldo de estoque
CREATE OR REPLACE FUNCTION public.update_stock_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.stock_balances (user_id, team_id, product_id, property_id, current_quantity, unit)
    VALUES (NEW.user_id, NEW.team_id, NEW.product_id, NEW.property_id, 
      CASE WHEN NEW.movement_type = 'entrada' THEN NEW.quantity
           WHEN NEW.movement_type = 'saida' THEN -NEW.quantity
           ELSE NEW.quantity END,
      NEW.unit)
    ON CONFLICT (product_id, property_id) 
    DO UPDATE SET 
      current_quantity = stock_balances.current_quantity + 
        CASE WHEN NEW.movement_type = 'entrada' THEN NEW.quantity
             WHEN NEW.movement_type = 'saida' THEN -NEW.quantity
             ELSE NEW.quantity END,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stock_balances 
    SET current_quantity = current_quantity - 
      CASE WHEN OLD.movement_type = 'entrada' THEN OLD.quantity
           WHEN OLD.movement_type = 'saida' THEN -OLD.quantity
           ELSE OLD.quantity END,
      updated_at = now()
    WHERE product_id = OLD.product_id AND property_id = OLD.property_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================
-- 3. TABELAS
-- ============================================

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de times/equipes
CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de membros do time
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.team_role NOT NULL DEFAULT 'member'::team_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Tabela de propriedades/fazendas
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  name text NOT NULL,
  location text NOT NULL,
  total_area numeric NOT NULL,
  plot_count integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de talhões
CREATE TABLE public.plots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  geometry jsonb NOT NULL,
  area_hectares numeric,
  color text DEFAULT '#3B82F6'::text,
  status text DEFAULT 'pending'::text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de produtos/defensivos
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  name text NOT NULL,
  manufacturer text,
  category text NOT NULL,
  unit text NOT NULL DEFAULT 'L'::text,
  unit_price numeric NOT NULL,
  stock_quantity numeric NOT NULL DEFAULT 0,
  package_size numeric DEFAULT 1,
  recommended_dose numeric,
  recommended_dose_unit varchar DEFAULT 'L/ha'::character varying,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de receitas/caldas
CREATE TABLE public.recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de produtos das receitas
CREATE TABLE public.recipe_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  dose_per_ha numeric NOT NULL,
  dose_unit text NOT NULL DEFAULT 'L/ha'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de aplicações
CREATE TABLE public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  plot_id uuid REFERENCES public.plots(id),
  plot_name text,
  name text,
  application_date date NOT NULL,
  application_type public.application_type NOT NULL,
  status public.application_status NOT NULL DEFAULT 'planejada'::application_status,
  area_applied numeric NOT NULL,
  total_cost numeric NOT NULL,
  flight_time_minutes integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de produtos das aplicações
CREATE TABLE public.application_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  dose_per_ha numeric NOT NULL,
  total_amount numeric NOT NULL,
  unit_cost numeric NOT NULL,
  total_cost numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de saldos de estoque
CREATE TABLE public.stock_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  current_quantity numeric NOT NULL DEFAULT 0,
  min_quantity numeric DEFAULT 0,
  unit text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, property_id)
);

-- Tabela de movimentações de estoque
CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  property_id uuid NOT NULL REFERENCES public.properties(id),
  application_id uuid REFERENCES public.applications(id),
  movement_type text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  reason text,
  notes text,
  movement_date timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de equipamentos/drones
CREATE TABLE public.equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  model text NOT NULL,
  status text NOT NULL DEFAULT 'operacional'::text,
  tank_capacity numeric NOT NULL DEFAULT 0,
  battery_capacity integer NOT NULL DEFAULT 0,
  flight_time_minutes integer NOT NULL DEFAULT 0,
  total_flights integer NOT NULL DEFAULT 0,
  total_flight_hours numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de planejamento de voo
CREATE TABLE public.flight_planning (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id),
  name text NOT NULL,
  area numeric NOT NULL,
  flight_speed numeric NOT NULL,
  swath_width numeric NOT NULL,
  battery_time_minutes integer NOT NULL,
  estimated_flights integer,
  estimated_time_minutes integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Trigger para criar perfil ao registrar usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar saldo de estoque
CREATE TRIGGER update_stock_balance_trigger
  AFTER INSERT OR DELETE ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_balance();

-- ============================================
-- 5. HABILITAR RLS EM TODAS AS TABELAS
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flight_planning ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. POLÍTICAS RLS - PROFILES
-- ============================================

CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários autenticados podem buscar perfis por email"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 7. POLÍTICAS RLS - TEAMS
-- ============================================

CREATE POLICY "Usuários podem criar times"
  ON public.teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners e membros podem ver seu time"
  ON public.teams FOR SELECT
  USING ((owner_id = auth.uid()) OR user_belongs_to_team(auth.uid(), id));

CREATE POLICY "Apenas owners podem atualizar time"
  ON public.teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Apenas owners podem deletar times"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- 8. POLÍTICAS RLS - TEAM_MEMBERS
-- ============================================

CREATE POLICY "Membros podem ver colegas de time"
  ON public.team_members FOR SELECT
  USING (user_belongs_to_team(auth.uid(), team_id));

CREATE POLICY "Owners e admins podem adicionar membros"
  ON public.team_members FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid()))
    OR is_team_admin(auth.uid(), team_id)
  );

CREATE POLICY "Admins podem atualizar membros"
  ON public.team_members FOR UPDATE
  USING (is_team_admin(auth.uid(), team_id));

CREATE POLICY "Admins podem remover membros"
  ON public.team_members FOR DELETE
  USING (is_team_admin(auth.uid(), team_id));

-- ============================================
-- 9. POLÍTICAS RLS - PROPERTIES
-- ============================================

CREATE POLICY "Usuários podem ver propriedades do time ou próprias"
  ON public.properties FOR SELECT
  USING ((user_id = auth.uid()) OR ((team_id IS NOT NULL) AND user_belongs_to_team(auth.uid(), team_id)));

CREATE POLICY "Usuários podem criar suas próprias propriedades"
  ON public.properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias propriedades"
  ON public.properties FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias propriedades"
  ON public.properties FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 10. POLÍTICAS RLS - PLOTS
-- ============================================

CREATE POLICY "Usuários podem ver seus próprios talhões"
  ON public.plots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar seus próprios talhões"
  ON public.plots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios talhões"
  ON public.plots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios talhões"
  ON public.plots FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 11. POLÍTICAS RLS - PRODUCTS
-- ============================================

CREATE POLICY "Usuários podem ver produtos do time ou próprios"
  ON public.products FOR SELECT
  USING ((user_id = auth.uid()) OR ((team_id IS NOT NULL) AND user_belongs_to_team(auth.uid(), team_id)));

CREATE POLICY "Usuários podem criar seus próprios produtos"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios produtos"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios produtos"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 12. POLÍTICAS RLS - RECIPES
-- ============================================

CREATE POLICY "Usuários podem ver receituários do time ou próprios"
  ON public.recipes FOR SELECT
  USING ((user_id = auth.uid()) OR ((team_id IS NOT NULL) AND user_belongs_to_team(auth.uid(), team_id)));

CREATE POLICY "Usuários podem criar seus próprios receituários"
  ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios receituários"
  ON public.recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios receituários"
  ON public.recipes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 13. POLÍTICAS RLS - RECIPE_PRODUCTS
-- ============================================

CREATE POLICY "Usuários podem ver produtos de receituários do time ou próprios"
  ON public.recipe_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_products.recipe_id
    AND ((recipes.user_id = auth.uid()) OR ((recipes.team_id IS NOT NULL) AND user_belongs_to_team(auth.uid(), recipes.team_id)))
  ));

CREATE POLICY "Usuários podem inserir produtos em seus receituários"
  ON public.recipe_products FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_products.recipe_id AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar produtos de seus receituários"
  ON public.recipe_products FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_products.recipe_id AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar produtos de seus receituários"
  ON public.recipe_products FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_products.recipe_id AND recipes.user_id = auth.uid()
  ));

-- ============================================
-- 14. POLÍTICAS RLS - APPLICATIONS
-- ============================================

CREATE POLICY "Usuários podem ver suas próprias aplicações"
  ON public.applications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar suas próprias aplicações"
  ON public.applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias aplicações"
  ON public.applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias aplicações"
  ON public.applications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 15. POLÍTICAS RLS - APPLICATION_PRODUCTS
-- ============================================

CREATE POLICY "Usuários podem ver produtos de suas aplicações"
  ON public.application_products FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_products.application_id AND applications.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem inserir produtos em suas aplicações"
  ON public.application_products FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_products.application_id AND applications.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem atualizar produtos de suas aplicações"
  ON public.application_products FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_products.application_id AND applications.user_id = auth.uid()
  ));

CREATE POLICY "Usuários podem deletar produtos de suas aplicações"
  ON public.application_products FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_products.application_id AND applications.user_id = auth.uid()
  ));

-- ============================================
-- 16. POLÍTICAS RLS - STOCK_BALANCES
-- ============================================

CREATE POLICY "Usuários podem ver próprios saldos"
  ON public.stock_balances FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar saldos"
  ON public.stock_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprios saldos"
  ON public.stock_balances FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar próprios saldos"
  ON public.stock_balances FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 17. POLÍTICAS RLS - STOCK_MOVEMENTS
-- ============================================

CREATE POLICY "Usuários podem ver próprias movimentações"
  ON public.stock_movements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem criar movimentações"
  ON public.stock_movements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar próprias movimentações"
  ON public.stock_movements FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar próprias movimentações"
  ON public.stock_movements FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 18. POLÍTICAS RLS - EQUIPMENT
-- ============================================

CREATE POLICY "Usuários podem ver seus próprios equipamentos"
  ON public.equipment FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios equipamentos"
  ON public.equipment FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios equipamentos"
  ON public.equipment FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios equipamentos"
  ON public.equipment FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 19. POLÍTICAS RLS - FLIGHT_PLANNING
-- ============================================

CREATE POLICY "Usuários podem ver seus próprios planejamentos"
  ON public.flight_planning FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios planejamentos"
  ON public.flight_planning FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios planejamentos"
  ON public.flight_planning FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios planejamentos"
  ON public.flight_planning FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FIM DO SCRIPT
-- ============================================
