-- Fix RLS: add WITH CHECK for INSERT operations
-- Las policies existentes solo tienen USING (SELECT/UPDATE/DELETE),
-- faltaba WITH CHECK para permitir INSERT.

DROP POLICY IF EXISTS "admin_all_revendedores" ON revendedores;
CREATE POLICY "admin_all_revendedores" ON revendedores
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "revendedor_self" ON revendedores;
CREATE POLICY "revendedor_self" ON revendedores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_precios_rev" ON precios_revendedor;
CREATE POLICY "admin_all_precios_rev" ON precios_revendedor
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "revendedor_self_precios" ON precios_revendedor;
CREATE POLICY "revendedor_self_precios" ON precios_revendedor
  FOR ALL USING (
    EXISTS (SELECT 1 FROM revendedores WHERE id = precios_revendedor.revendedor_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM revendedores WHERE id = precios_revendedor.revendedor_id AND user_id = auth.uid())
  );
