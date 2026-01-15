-- Função para atualizar updated_at (se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela de movimentações de estoque
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'ajuste')),
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  movement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de saldo de estoque por propriedade
CREATE TABLE public.stock_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  min_quantity NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, property_id)
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_movements
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

-- RLS policies for stock_balances
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

-- Triggers para updated_at
CREATE TRIGGER update_stock_movements_updated_at
BEFORE UPDATE ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_balances_updated_at
BEFORE UPDATE ON public.stock_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para atualizar saldo de estoque automaticamente
CREATE OR REPLACE FUNCTION public.update_stock_balance()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para manter saldo atualizado
CREATE TRIGGER trigger_update_stock_balance
AFTER INSERT OR DELETE ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_balance();