-- Permitir que o owner do time consiga ler o próprio time.
-- Necessário porque o frontend usa insert().select(), e o RETURNING precisa passar na policy de SELECT.

DROP POLICY IF EXISTS "Membros podem ver seu time" ON public.teams;

CREATE POLICY "Owners e membros podem ver seu time"
ON public.teams
FOR SELECT
USING (
  owner_id = auth.uid()
  OR user_belongs_to_team(auth.uid(), id)
);
