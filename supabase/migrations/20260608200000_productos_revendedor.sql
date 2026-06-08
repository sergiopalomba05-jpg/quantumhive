-- Reemplaza precios_revendedor por productos_revendedor
-- El revendedor selecciona qué productos entran a su tienda y les pone precio

-- Limpiar policies viejas antes de dropear
DROP POLICY IF EXISTS "admin_all_precios_rev" ON precios_revendedor;
DROP POLICY IF EXISTS "revendedor_self_precios" ON precios_revendedor;
DROP POLICY IF EXISTS "public_read_precios_rev" ON precios_revendedor;

CREATE TABLE productos_revendedor (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revendedor_id bigint NOT NULL REFERENCES revendedores(id) ON DELETE CASCADE,
  producto_id bigint NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  precio_unitario numeric(12,2) NOT NULL,
  precio_pack_6 numeric(12,2),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(revendedor_id, producto_id)
);

CREATE INDEX idx_productos_rev ON productos_revendedor(revendedor_id);
CREATE INDEX idx_productos_rev_prod ON productos_revendedor(producto_id);

ALTER TABLE productos_revendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_productos_rev" ON productos_revendedor
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "revendedor_self_productos" ON productos_revendedor
  FOR ALL USING (
    EXISTS (SELECT 1 FROM revendedores WHERE id = productos_revendedor.revendedor_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM revendedores WHERE id = productos_revendedor.revendedor_id AND user_id = auth.uid())
  );

CREATE POLICY "public_read_productos_rev" ON productos_revendedor
  FOR SELECT USING (activo = true);

CREATE TRIGGER productos_rev_updated_at
  BEFORE UPDATE ON productos_revendedor
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Migrar datos existentes de precios_revendedor
INSERT INTO productos_revendedor (revendedor_id, producto_id, precio_unitario, activo)
SELECT revendedor_id, producto_id, precio, true
FROM precios_revendedor
ON CONFLICT DO NOTHING;

-- Drop vieja tabla
DROP TABLE precios_revendedor;
