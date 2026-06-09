-- Etapa 2: Multi-tenant + Revendedores + Precios personalizados

-- 1. REVENDEDORES (cada cuenta Pro/Pro Plus)
CREATE TABLE revendedores (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. PRECIOS REVENDEDOR (precio personalizado por producto)
CREATE TABLE precios_revendedor (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revendedor_id bigint NOT NULL REFERENCES revendedores(id) ON DELETE CASCADE,
  producto_id bigint NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  precio numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(revendedor_id, producto_id)
);

-- Índices
CREATE INDEX idx_revendedores_user ON revendedores(user_id);
CREATE INDEX idx_revendedores_codigo ON revendedores(codigo_unico);
CREATE INDEX idx_precios_rev ON precios_revendedor(revendedor_id);
CREATE INDEX idx_precios_rev_prod ON precios_revendedor(producto_id);

-- RLS
ALTER TABLE revendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios_revendedor ENABLE ROW LEVEL SECURITY;

-- Admin puede todo
CREATE POLICY "admin_all_revendedores" ON revendedores
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "admin_all_precios_rev" ON precios_revendedor
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Revendedor ve/edita su propio registro
CREATE POLICY "revendedor_self" ON revendedores
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Revendedor ve/edita sus propios precios
CREATE POLICY "revendedor_self_precios" ON precios_revendedor
  FOR ALL USING (
    EXISTS (SELECT 1 FROM revendedores WHERE id = precios_revendedor.revendedor_id AND user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM revendedores WHERE id = precios_revendedor.revendedor_id AND user_id = auth.uid())
  );

-- Público: lectura de datos del revendedor por código único (para compradores)
CREATE POLICY "public_read_revendedor" ON revendedores
  FOR SELECT USING (activo = true);

-- Público: lectura de precios del revendedor
CREATE POLICY "public_read_precios_rev" ON precios_revendedor
  FOR SELECT USING (true);

-- Trigger updated_at
CREATE TRIGGER revendedores_updated_at
  BEFORE UPDATE ON revendedores
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

CREATE TRIGGER precios_rev_updated_at
  BEFORE UPDATE ON precios_revendedor
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
