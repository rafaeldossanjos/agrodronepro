-- Create plots table for storing field/parcel geometries
CREATE TABLE public.plots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_hectares NUMERIC,
  geometry JSONB NOT NULL, -- GeoJSON format for polygon coordinates
  color TEXT DEFAULT '#3B82F6',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuários podem ver seus próprios talhões"
ON public.plots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem ver talhões do time"
ON public.plots
FOR SELECT
USING ((team_id IS NOT NULL) AND is_team_admin(auth.uid(), team_id));

CREATE POLICY "Usuários podem criar seus próprios talhões"
ON public.plots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios talhões"
ON public.plots
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios talhões"
ON public.plots
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_plots_updated_at
BEFORE UPDATE ON public.plots
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add plot_id to applications table for linking applications to specific plots
ALTER TABLE public.applications 
ADD COLUMN plot_id UUID REFERENCES public.plots(id) ON DELETE SET NULL;