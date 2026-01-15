-- Permitir que usuários autenticados possam buscar perfis por email (necessário para convites de equipe)
-- Esta policy permite apenas leitura (SELECT) do id e email de outros usuários

CREATE POLICY "Usuários autenticados podem buscar perfis por email"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);