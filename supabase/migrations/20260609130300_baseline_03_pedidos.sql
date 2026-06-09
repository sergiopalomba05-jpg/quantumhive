-- BASELINE 03 · pedidos + pedido_items (normalizado con proveedor_id). Idempotente.

CREATE TABLE IF NOT EXISTS pedidos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revendedor_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  whatsapp text NOT NULL,
  direccion text,
  notas text,
  items jsonb DEFAULT '[]',            -- legado: se mantiene hasta migrar el app (F3)
  total numeric(12,2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','confirmado','enviado','entregado','cancelado')),
  estado_pago text NOT NULL DEFAULT 'pendiente'
    CHECK (estado_pago IN ('pendiente','senado','pagado','reembolsado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Convergencia para la tabla viva creada a mano (columnas que pudieran faltar)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS revendedor_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS estado_pago text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS total numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_estado_check') THEN
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check
      CHECK (estado IN ('pendiente','confirmado','enviado','entregado','cancelado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_estado_pago_check') THEN
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_pago_check
      CHECK (estado_pago IN ('pendiente','senado','pagado','reembolsado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_revendedor ON pedidos(revendedor_id);

DROP TRIGGER IF EXISTS pedidos_updated_at ON pedidos;
CREATE TRIGGER pedidos_updated_at
  BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Líneas normalizadas, cada una con su proveedor (ruteo de orden multi-proveedor)
CREATE TABLE IF NOT EXISTS pedido_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id bigint NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id bigint REFERENCES productos(id) ON DELETE SET NULL,
  proveedor_id bigint REFERENCES proveedores(id) ON DELETE SET NULL,
  revendedor_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  nombre_snapshot text NOT NULL,
  precio_snapshot numeric(12,2) NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  subtotal numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_proveedor ON pedido_items(proveedor_id);

-- Backfill: explotar pedidos.items (jsonb) a pedido_items, resolviendo proveedor_id
INSERT INTO pedido_items (pedido_id, producto_id, proveedor_id, revendedor_id, nombre_snapshot, precio_snapshot, cantidad, subtotal)
SELECT
  p.id,
  (it->>'id')::bigint,
  pr.proveedor_id,
  p.revendedor_id,
  COALESCE(it->>'nombre', ''),
  COALESCE((it->>'precio')::numeric, 0),
  COALESCE((it->>'cantidad')::int, 1),
  COALESCE((it->>'precio')::numeric, 0) * COALESCE((it->>'cantidad')::int, 1)
FROM pedidos p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.items, '[]'::jsonb)) AS it
LEFT JOIN productos pr ON pr.id = (it->>'id')::bigint
WHERE NOT EXISTS (SELECT 1 FROM pedido_items pi WHERE pi.pedido_id = p.id);

-- RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

-- Comprador anónimo crea pedido + líneas
DROP POLICY IF EXISTS "public_insert_pedidos" ON pedidos;
CREATE POLICY "public_insert_pedidos" ON pedidos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_insert_pedido_items" ON pedido_items;
CREATE POLICY "public_insert_pedido_items" ON pedido_items FOR INSERT WITH CHECK (true);

-- Admin gestiona todo
DROP POLICY IF EXISTS "admin_all_pedidos" ON pedidos;
CREATE POLICY "admin_all_pedidos" ON pedidos
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_pedido_items" ON pedido_items;
CREATE POLICY "admin_all_pedido_items" ON pedido_items
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));

-- Revendedor ve los pedidos/líneas de SU tienda
DROP POLICY IF EXISTS "revendedor_read_pedidos" ON pedidos;
CREATE POLICY "revendedor_read_pedidos" ON pedidos
  FOR SELECT USING (revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "revendedor_read_pedido_items" ON pedido_items;
CREATE POLICY "revendedor_read_pedido_items" ON pedido_items
  FOR SELECT USING (revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid()));
