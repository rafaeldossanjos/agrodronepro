-- Corrigir policies de SELECT para compartilhamento por time (ordem correta dos parâmetros)

-- PRODUCTS
DROP POLICY IF EXISTS "Usuários podem ver produtos do time ou próprios" ON public.products;
CREATE POLICY "Usuários podem ver produtos do time ou próprios"
ON public.products
FOR SELECT
USING (
  user_id = auth.uid()
  OR (team_id IS NOT NULL AND user_belongs_to_team(auth.uid(), team_id))
);

-- PROPERTIES
DROP POLICY IF EXISTS "Usuários podem ver propriedades do time ou próprias" ON public.properties;
CREATE POLICY "Usuários podem ver propriedades do time ou próprias"
ON public.properties
FOR SELECT
USING (
  user_id = auth.uid()
  OR (team_id IS NOT NULL AND user_belongs_to_team(auth.uid(), team_id))
);