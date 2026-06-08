-- CORREGIR RLS: permitir escritura a usuarios autenticados (no solo service_role)

DROP POLICY IF EXISTS "admin_all_rubros" ON rubros;
DROP POLICY IF EXISTS "admin_all_sub_filtros" ON sub_filtros;
DROP POLICY IF EXISTS "admin_all_proveedores" ON proveedores;
DROP POLICY IF EXISTS "admin_all_productos" ON productos;
DROP POLICY IF EXISTS "admin_all_atributos_producto" ON atributos_producto;
DROP POLICY IF EXISTS "admin_all_plantillas" ON plantillas_atributos;
DROP POLICY IF EXISTS "admin_all_tiras" ON tiras;
DROP POLICY IF EXISTS "admin_all_tiras_productos" ON tiras_productos;

CREATE POLICY "admin_all_rubros" ON rubros FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_sub_filtros" ON sub_filtros FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_proveedores" ON proveedores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_productos" ON productos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_atributos_producto" ON atributos_producto FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_plantillas" ON plantillas_atributos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_tiras" ON tiras FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_tiras_productos" ON tiras_productos FOR ALL USING (auth.role() = 'authenticated');

-- También permitir a autenticados ver planes (antes solo público)
DROP POLICY IF EXISTS "public_read_planes" ON planes;
CREATE POLICY "auth_read_planes" ON planes FOR SELECT USING (auth.role() = 'authenticated');

-- Verificar que existan las políticas correctas
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('rubros','sub_filtros','proveedores','productos','atributos_producto','plantillas_atributos','tiras') ORDER BY tablename;
