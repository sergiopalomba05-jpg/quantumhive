-- BASELINE 01 · Catálogo madre. Idempotente.

CREATE TABLE IF NOT EXISTS rubros (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  orden integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sub_filtros (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rubro_id bigint NOT NULL REFERENCES rubros(id) ON DELETE CASCADE,
  parent_id bigint REFERENCES sub_filtros(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proveedores (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  contacto text,
  condiciones text,
  plazos text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plantillas_atributos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rubro_id bigint NOT NULL REFERENCES rubros(id) ON DELETE CASCADE,
  nombre_atributo text NOT NULL,
  tipo text DEFAULT 'text' CHECK (tipo IN ('text','number','color','select')),
  opciones jsonb,
  orden integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS productos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rubro_id bigint NOT NULL REFERENCES rubros(id),
  sub_filtro_id bigint REFERENCES sub_filtros(id) ON DELETE SET NULL,
  proveedor_id bigint REFERENCES proveedores(id),
  nombre text NOT NULL,
  descripcion text,
  descripcion_detallada text,
  precio_base numeric(12,2) NOT NULL,
  metrica_valor integer DEFAULT 50 CHECK (metrica_valor BETWEEN 0 AND 100),
  metricas jsonb DEFAULT '[]',
  estado_stock boolean DEFAULT true,
  fotos jsonb DEFAULT '[]',
  video text,
  activo boolean DEFAULT true,
  destacado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS atributos_producto (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id bigint NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  plantilla_id bigint REFERENCES plantillas_atributos(id),
  nombre text NOT NULL,
  valor text NOT NULL
);

CREATE TABLE IF NOT EXISTS planes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  permiso_editar_precios boolean DEFAULT false,
  permiso_personalizar boolean DEFAULT false,
  permiso_white_label boolean DEFAULT false,
  permiso_ultra boolean DEFAULT false,
  precio numeric(10,2) DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed de planes solo una vez (la tabla no tiene unique en nombre)
INSERT INTO planes (nombre, permiso_editar_precios, permiso_personalizar, permiso_white_label, permiso_ultra, precio)
SELECT * FROM (VALUES
  ('Básico', false, false, false, false, 20),
  ('Pro', true, true, false, false, 50),
  ('Pro Plus', true, true, true, false, 100),
  ('Ultra', true, true, true, true, 200)
) AS v(nombre, p1, p2, p3, p4, precio)
WHERE NOT EXISTS (SELECT 1 FROM planes);

CREATE TABLE IF NOT EXISTS tiras (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  tipo text DEFAULT 'viral' CHECK (tipo IN ('viral','ofertas','mas_vendido')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tiras_productos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tira_id bigint NOT NULL REFERENCES tiras(id) ON DELETE CASCADE,
  producto_id bigint NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  orden integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_productos_rubro ON productos(rubro_id);
CREATE INDEX IF NOT EXISTS idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_productos_stock ON productos(estado_stock) WHERE estado_stock = true;
CREATE INDEX IF NOT EXISTS idx_sub_filtros_rubro ON sub_filtros(rubro_id);
CREATE INDEX IF NOT EXISTS idx_sub_filtros_parent ON sub_filtros(parent_id);
CREATE INDEX IF NOT EXISTS idx_productos_sub_filtro ON productos(sub_filtro_id);
CREATE INDEX IF NOT EXISTS idx_atributos_producto ON atributos_producto(producto_id);

-- Función updated_at (la usan varios triggers de acá en adelante)
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS productos_updated_at ON productos;
CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- RLS
ALTER TABLE rubros ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_filtros ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atributos_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_atributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiras_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;

-- Admin = es_admin (NO más auth.role()='authenticated')
DROP POLICY IF EXISTS "admin_all_rubros" ON rubros;
CREATE POLICY "admin_all_rubros" ON rubros FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_sub_filtros" ON sub_filtros;
CREATE POLICY "admin_all_sub_filtros" ON sub_filtros FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_proveedores" ON proveedores;
CREATE POLICY "admin_all_proveedores" ON proveedores FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_productos" ON productos;
CREATE POLICY "admin_all_productos" ON productos FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_atributos_producto" ON atributos_producto;
CREATE POLICY "admin_all_atributos_producto" ON atributos_producto FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_plantillas" ON plantillas_atributos;
CREATE POLICY "admin_all_plantillas" ON plantillas_atributos FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_tiras" ON tiras;
CREATE POLICY "admin_all_tiras" ON tiras FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_tiras_productos" ON tiras_productos;
CREATE POLICY "admin_all_tiras_productos" ON tiras_productos FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));

-- Público: solo lectura del catálogo madre activo (revendedor_id IS NULL se filtra en Task 4 vía buscar_productos)
DROP POLICY IF EXISTS "public_read_rubros" ON rubros;
CREATE POLICY "public_read_rubros" ON rubros FOR SELECT USING (activo = true);
DROP POLICY IF EXISTS "public_read_sub_filtros" ON sub_filtros;
CREATE POLICY "public_read_sub_filtros" ON sub_filtros FOR SELECT USING (activo = true);
DROP POLICY IF EXISTS "public_read_productos" ON productos;
CREATE POLICY "public_read_productos" ON productos FOR SELECT USING (activo = true AND estado_stock = true);
DROP POLICY IF EXISTS "public_read_atributos" ON atributos_producto;
CREATE POLICY "public_read_atributos" ON atributos_producto FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_plantillas" ON plantillas_atributos;
CREATE POLICY "public_read_plantillas" ON plantillas_atributos FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_tiras" ON tiras;
CREATE POLICY "public_read_tiras" ON tiras FOR SELECT USING (activo = true);
DROP POLICY IF EXISTS "public_read_tiras_productos" ON tiras_productos;
CREATE POLICY "public_read_tiras_productos" ON tiras_productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_planes" ON planes;
CREATE POLICY "public_read_planes" ON planes FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_read_proveedores" ON proveedores;
CREATE POLICY "public_read_proveedores" ON proveedores FOR SELECT USING (activo = true);
