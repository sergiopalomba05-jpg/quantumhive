-- QuantumHive - Directimport - Esquema completo (Etapa 1)
-- Ejecutar en Supabase SQL Editor

-- 1. RUBROS (Categorías Nivel 1)
CREATE TABLE rubros (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  orden integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. SUB_FILTROS (Subcategorías Nivel 2)
CREATE TABLE sub_filtros (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rubro_id bigint NOT NULL REFERENCES rubros(id) ON DELETE CASCADE,
  parent_id bigint REFERENCES sub_filtros(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  orden integer DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. PROVEEDORES (Mayoristas)
CREATE TABLE proveedores (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  contacto text,
  condiciones text,
  plazos text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. PLANTILLAS_ATRIBUTOS (Atributos configurables por rubro)
CREATE TABLE plantillas_atributos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rubro_id bigint NOT NULL REFERENCES rubros(id) ON DELETE CASCADE,
  nombre_atributo text NOT NULL,
  tipo text DEFAULT 'text' CHECK (tipo IN ('text','number','color','select')),
  opciones jsonb,
  orden integer DEFAULT 0
);

-- 5. PRODUCTOS
CREATE TABLE productos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rubro_id bigint NOT NULL REFERENCES rubros(id),
  sub_filtro_id bigint REFERENCES sub_filtros(id) ON DELETE SET NULL,
  proveedor_id bigint REFERENCES proveedores(id),
  nombre text NOT NULL,
  descripcion text,
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

-- 6. ATRIBUTOS_PRODUCTO (Valores de atributos por producto)
CREATE TABLE atributos_producto (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id bigint NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  plantilla_id bigint REFERENCES plantillas_atributos(id),
  nombre text NOT NULL,
  valor text NOT NULL
);

-- 7. PLANES (Niveles de suscripción)
CREATE TABLE planes (
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

INSERT INTO planes (nombre, permiso_editar_precios, permiso_personalizar, permiso_white_label, permiso_ultra, precio) VALUES
  ('Básico', false, false, false, false, 20),
  ('Pro', true, true, false, false, 50),
  ('Pro Plus', true, true, true, false, 100),
  ('Ultra', true, true, true, true, 200);

-- 8. TIRAS (Virales / Ofertas)
CREATE TABLE tiras (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  tipo text DEFAULT 'viral' CHECK (tipo IN ('viral','ofertas','mas_vendido')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tiras_productos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tira_id bigint NOT NULL REFERENCES tiras(id) ON DELETE CASCADE,
  producto_id bigint NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  orden integer DEFAULT 0
);

-- Índices
CREATE INDEX idx_productos_rubro ON productos(rubro_id);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX idx_productos_stock ON productos(estado_stock) WHERE estado_stock = true;
CREATE INDEX idx_sub_filtros_rubro ON sub_filtros(rubro_id);
CREATE INDEX idx_sub_filtros_parent ON sub_filtros(parent_id);
CREATE INDEX idx_productos_sub_filtro ON productos(sub_filtro_id);
CREATE INDEX idx_atributos_producto ON atributos_producto(producto_id);

-- RLS - Habilitar row level security
ALTER TABLE rubros ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_filtros ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE atributos_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_atributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiras_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;

-- RLS - Admin autenticado puede todo
CREATE POLICY "admin_all_rubros" ON rubros FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_sub_filtros" ON sub_filtros FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_proveedores" ON proveedores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_productos" ON productos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_atributos_producto" ON atributos_producto FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_plantillas" ON plantillas_atributos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_tiras" ON tiras FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "admin_all_tiras_productos" ON tiras_productos FOR ALL USING (auth.role() = 'authenticated');

-- RLS - Público solo lectura para catálogo activo
CREATE POLICY "public_read_rubros" ON rubros FOR SELECT USING (activo = true);
CREATE POLICY "public_read_sub_filtros" ON sub_filtros FOR SELECT USING (activo = true);
CREATE POLICY "public_read_productos" ON productos FOR SELECT USING (activo = true AND estado_stock = true);
CREATE POLICY "public_read_atributos" ON atributos_producto FOR SELECT USING (true);
CREATE POLICY "public_read_plantillas" ON plantillas_atributos FOR SELECT USING (true);
CREATE POLICY "public_read_tiras" ON tiras FOR SELECT USING (activo = true);
CREATE POLICY "public_read_tiras_productos" ON tiras_productos FOR SELECT USING (true);
CREATE POLICY "public_read_planes" ON planes FOR SELECT USING (true);
CREATE POLICY "public_read_proveedores" ON proveedores FOR SELECT USING (activo = true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Función para búsqueda básica de productos
CREATE OR REPLACE FUNCTION buscar_productos(termino text)
RETURNS SETOF productos AS $$
  SELECT * FROM productos
  WHERE activo = true AND estado_stock = true
    AND (nombre ILIKE '%' || termino || '%' OR descripcion ILIKE '%' || termino || '%')
  ORDER BY created_at DESC;
$$ LANGUAGE sql STABLE;
