
-- Tabela company_settings
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  razao_social TEXT,
  registro_mapa TEXT,
  cnpj TEXT,
  endereco TEXT,
  municipio TEXT,
  uf TEXT,
  email TEXT,
  telefone TEXT,
  eng_agronomo_nome TEXT,
  eng_agronomo_crea TEXT,
  piloto_nome TEXT,
  piloto_registro TEXT,
  prefixo_aeronave TEXT,
  equipamento_padrao TEXT,
  modelo_padrao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own company settings" ON public.company_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own company settings" ON public.company_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own company settings" ON public.company_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own company settings" ON public.company_settings
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Properties: contratante
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_document TEXT,
  ADD COLUMN IF NOT EXISTS municipality TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS coordinates TEXT;

-- Applications: parâmetros operacionais
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS cultura TEXT,
  ADD COLUMN IF NOT EXISTS volume_calda_lha NUMERIC,
  ADD COLUMN IF NOT EXISTS temp_max NUMERIC,
  ADD COLUMN IF NOT EXISTS umidade_min NUMERIC,
  ADD COLUMN IF NOT EXISTS vento_max NUMERIC,
  ADD COLUMN IF NOT EXISTS equipamento TEXT,
  ADD COLUMN IF NOT EXISTS modelo_equipamento TEXT,
  ADD COLUMN IF NOT EXISTS tipo_bico TEXT,
  ADD COLUMN IF NOT EXISTS angulo TEXT,
  ADD COLUMN IF NOT EXISTS altura_voo NUMERIC,
  ADD COLUMN IF NOT EXISTS largura_faixa NUMERIC,
  ADD COLUMN IF NOT EXISTS coordenadas TEXT,
  ADD COLUMN IF NOT EXISTS receituario_numero TEXT,
  ADD COLUMN IF NOT EXISTS receituario_data DATE,
  ADD COLUMN IF NOT EXISTS hora_inicio TEXT,
  ADD COLUMN IF NOT EXISTS hora_fim TEXT,
  ADD COLUMN IF NOT EXISTS prefixo_aeronave TEXT,
  ADD COLUMN IF NOT EXISTS uso_dgps BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_mat_inicial NUMERIC,
  ADD COLUMN IF NOT EXISTS temp_mat_final NUMERIC,
  ADD COLUMN IF NOT EXISTS temp_vesp_inicial NUMERIC,
  ADD COLUMN IF NOT EXISTS temp_vesp_final NUMERIC,
  ADD COLUMN IF NOT EXISTS ur_mat_inicial NUMERIC,
  ADD COLUMN IF NOT EXISTS ur_mat_final NUMERIC,
  ADD COLUMN IF NOT EXISTS ur_vesp_inicial NUMERIC,
  ADD COLUMN IF NOT EXISTS ur_vesp_final NUMERIC,
  ADD COLUMN IF NOT EXISTS observacoes_meteo TEXT,
  ADD COLUMN IF NOT EXISTS croqui_url TEXT,
  ADD COLUMN IF NOT EXISTS tipo_servico TEXT;

-- Application products: dados regulatórios
ALTER TABLE public.application_products
  ADD COLUMN IF NOT EXISTS formulacao TEXT,
  ADD COLUMN IF NOT EXISTS classe_toxicologica TEXT,
  ADD COLUMN IF NOT EXISTS adjuvante BOOLEAN DEFAULT false;

-- Storage bucket para croquis
INSERT INTO storage.buckets (id, name, public) VALUES ('croquis', 'croquis', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view own croquis" ON storage.objects
  FOR SELECT USING (bucket_id = 'croquis' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own croquis" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'croquis' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own croquis" ON storage.objects
  FOR UPDATE USING (bucket_id = 'croquis' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own croquis" ON storage.objects
  FOR DELETE USING (bucket_id = 'croquis' AND auth.uid()::text = (storage.foldername(name))[1]);
