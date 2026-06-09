-- BASELINE 02 · Revendedores: estado final + onboarding + jerarquía/score dormidos
--   + productos_revendedor + productos propios + anti-escalación. Idempotente.

CREATE TABLE IF NOT EXISTS revendedores (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo_unico text UNIQUE NOT NULL,
  plan_id bigint REFERENCES planes(id),
  nombre_negocio text,
  logo_url text,
  colores jsonb DEFAULT '{"primario":"#d4a843","fondo":"#0a0a0a","texto":"#ffffff"}',
  whatsapp text,
  direccion text,
  activo boolean DEFAULT true,
  referido_por text,
  trial_hasta timestamptz,
  -- onboarding con filtro
  estado text NOT NULL DEFAULT 'pendiente_aprobacion'
    CHECK (estado IN ('pendiente_aprobacion','aprobado','pago_pendiente','activo','rechazado','suspendido')),
  aprobado_por uuid REFERENCES auth.users(id),
  aprobado_en timestamptz,
  motivo_rechazo text,
  -- jerarquía dormida (modelada, sin lógica todavía)
  padre_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  nivel integer NOT NULL DEFAULT 1,
  zona text,
  -- scoring dormido
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Convergencia para DBs que ya tienen la tabla vieja (sin estas columnas)
ALTER TABLE revendedores
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente_aprobacion',
  ADD COLUMN IF NOT EXISTS aprobado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS aprobado_en timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rechazo text,
  ADD COLUMN IF NOT EXISTS padre_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nivel integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revendedores_estado_check') THEN
    ALTER TABLE revendedores ADD CONSTRAINT revendedores_estado_check
      CHECK (estado IN ('pendiente_aprobacion','aprobado','pago_pendiente','activo','rechazado','suspendido'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_revendedores_user ON revendedores(user_id);
CREATE INDEX IF NOT EXISTS idx_revendedores_codigo ON revendedores(codigo_unico);
CREATE INDEX IF NOT EXISTS idx_revendedores_estado ON revendedores(estado);
CREATE INDEX IF NOT EXISTS idx_revendedores_padre ON revendedores(padre_id);

-- Productos del catálogo madre que el revendedor mete en su tienda + su precio
CREATE TABLE IF NOT EXISTS productos_revendedor (
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
CREATE INDEX IF NOT EXISTS idx_productos_rev ON productos_revendedor(revendedor_id);
CREATE INDEX IF NOT EXISTS idx_productos_rev_prod ON productos_revendedor(producto_id);

-- Productos PROPIOS del revendedor: misma tabla productos, dueño en revendedor_id.
-- revendedor_id IS NULL  => catálogo madre (de Sergio).
-- revendedor_id = X      => producto propio del revendedor X.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS revendedor_id bigint REFERENCES revendedores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_productos_revendedor ON productos(revendedor_id);

-- Búsqueda del catálogo madre: solo productos sin dueño revendedor
CREATE OR REPLACE FUNCTION buscar_productos(termino text)
RETURNS SETOF productos AS $$
  SELECT * FROM productos
  WHERE activo = true AND estado_stock = true AND revendedor_id IS NULL
    AND (nombre ILIKE '%' || termino || '%' OR descripcion ILIKE '%' || termino || '%')
  ORDER BY created_at DESC;
$$ LANGUAGE sql STABLE;

-- Trigger updated_at
DROP TRIGGER IF EXISTS revendedores_updated_at ON revendedores;
CREATE TRIGGER revendedores_updated_at
  BEFORE UPDATE ON revendedores FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
DROP TRIGGER IF EXISTS productos_rev_updated_at ON productos_revendedor;
CREATE TRIGGER productos_rev_updated_at
  BEFORE UPDATE ON productos_revendedor FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- ===== Anti-escalación: el revendedor no puede tocar columnas sensibles =====
CREATE OR REPLACE FUNCTION proteger_revendedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins y procesos backend (service_role) pueden todo.
  IF es_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.estado := 'pendiente_aprobacion';
    NEW.aprobado_por := NULL;
    NEW.aprobado_en := NULL;
    NEW.plan_id := 1;
    NEW.score := 0;
    NEW.nivel := 1;
    NEW.padre_id := NULL;
    NEW.trial_hasta := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.estado := OLD.estado;
    NEW.plan_id := OLD.plan_id;
    NEW.aprobado_por := OLD.aprobado_por;
    NEW.aprobado_en := OLD.aprobado_en;
    NEW.score := OLD.score;
    NEW.nivel := OLD.nivel;
    NEW.padre_id := OLD.padre_id;
    NEW.zona := OLD.zona;
    NEW.codigo_unico := OLD.codigo_unico;
    NEW.trial_hasta := OLD.trial_hasta;
    NEW.user_id := OLD.user_id;
    NEW.activo := OLD.activo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_revendedor_biu ON revendedores;
CREATE TRIGGER proteger_revendedor_biu
  BEFORE INSERT OR UPDATE ON revendedores
  FOR EACH ROW EXECUTE FUNCTION proteger_revendedor();

-- ===== RLS =====
ALTER TABLE revendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_revendedor ENABLE ROW LEVEL SECURITY;

-- Admin: todo
DROP POLICY IF EXISTS "admin_all_revendedores" ON revendedores;
CREATE POLICY "admin_all_revendedores" ON revendedores
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_productos_rev" ON productos_revendedor;
CREATE POLICY "admin_all_productos_rev" ON productos_revendedor
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));

-- Revendedor: ve/inserta/edita SU fila (el trigger acota qué columnas valen)
DROP POLICY IF EXISTS "revendedor_self" ON revendedores;            -- vieja FOR ALL, se reemplaza
DROP POLICY IF EXISTS "revendedor_self_select" ON revendedores;
CREATE POLICY "revendedor_self_select" ON revendedores
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "revendedor_self_insert" ON revendedores;
CREATE POLICY "revendedor_self_insert" ON revendedores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "revendedor_self_update" ON revendedores;
CREATE POLICY "revendedor_self_update" ON revendedores
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Público: la tienda del revendedor solo si está ACTIVO
DROP POLICY IF EXISTS "public_read_revendedor" ON revendedores;
CREATE POLICY "public_read_revendedor" ON revendedores
  FOR SELECT USING (activo = true AND estado = 'activo');

-- productos_revendedor: revendedor gestiona lo suyo; público lee lo activo
DROP POLICY IF EXISTS "revendedor_self_productos" ON productos_revendedor;
CREATE POLICY "revendedor_self_productos" ON productos_revendedor
  FOR ALL USING (
    EXISTS (SELECT 1 FROM revendedores r WHERE r.id = productos_revendedor.revendedor_id AND r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM revendedores r WHERE r.id = productos_revendedor.revendedor_id AND r.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "public_read_productos_rev" ON productos_revendedor;
CREATE POLICY "public_read_productos_rev" ON productos_revendedor
  FOR SELECT USING (activo = true);

-- productos propios del revendedor: puede gestionar SOLO los suyos (revendedor_id = su id).
-- El WITH CHECK con subquery a su propio id impide poner revendedor_id NULL (=> escalar a madre).
DROP POLICY IF EXISTS "revendedor_own_productos" ON productos;
CREATE POLICY "revendedor_own_productos" ON productos
  FOR ALL USING (
    revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid())
  ) WITH CHECK (
    revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid())
  );
