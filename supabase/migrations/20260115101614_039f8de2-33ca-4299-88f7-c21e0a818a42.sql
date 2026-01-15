-- Corrigir a policy de recipes que já existe (dropar a que existe e recriar)
DROP POLICY IF EXISTS "Usuários podem ver receituários do time ou próprios" ON recipes;
CREATE POLICY "Usuários podem ver receituários do time ou próprios"
ON recipes FOR SELECT
USING (
  user_id = auth.uid() 
  OR (team_id IS NOT NULL AND user_belongs_to_team(auth.uid(), team_id))
);

-- Aplicações devem ser INDIVIDUAIS (cada um vê só as suas)
DROP POLICY IF EXISTS "Usuários podem ver aplicações do time ou próprias" ON applications;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias aplicações" ON applications;
CREATE POLICY "Usuários podem ver suas próprias aplicações"
ON applications FOR SELECT
USING (user_id = auth.uid());

-- Talhões/Plots devem ser INDIVIDUAIS (cada um vê só os seus)
DROP POLICY IF EXISTS "Usuários podem ver talhões do time ou próprios" ON plots;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios talhões" ON plots;
CREATE POLICY "Usuários podem ver seus próprios talhões"
ON plots FOR SELECT
USING (user_id = auth.uid());

-- Corrigir recipe_products para funcionar com receitas do time
DROP POLICY IF EXISTS "Usuários podem ver produtos de seus receituários" ON recipe_products;
DROP POLICY IF EXISTS "Usuários podem ver produtos de receituários do time ou próprios" ON recipe_products;
CREATE POLICY "Usuários podem ver produtos de receituários do time ou próprios"
ON recipe_products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes 
    WHERE recipes.id = recipe_products.recipe_id 
    AND (recipes.user_id = auth.uid() OR (recipes.team_id IS NOT NULL AND user_belongs_to_team(auth.uid(), recipes.team_id)))
  )
);