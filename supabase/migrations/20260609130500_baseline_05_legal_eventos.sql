-- BASELINE 05 · Legal + Demanda no satisfecha + Eventos (semilla Timón). Idempotente.

CREATE TABLE IF NOT EXISTS aceptaciones_legales (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  documento text NOT NULL,        -- p.ej. 'terminos', 'privacidad'
  version text NOT NULL,
  aceptado_en timestamptz DEFAULT now(),
  ip text
);
CREATE INDEX IF NOT EXISTS idx_aceptaciones_user ON aceptaciones_legales(user_id);

CREATE TABLE IF NOT EXISTS demanda_no_satisfecha (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  termino text NOT NULL,
  revendedor_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  contexto text,                  -- 'busqueda_sin_resultado', 'pedido_inexistente', ...
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eventos_sistema (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo text NOT NULL,             -- 'pedido_creado', 'revendedor_aprobado', ...
  entidad text,                   -- nombre de tabla afectada
  entidad_id bigint,
  payload jsonb DEFAULT '{}',
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos_sistema(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_entidad ON eventos_sistema(entidad, entidad_id);

ALTER TABLE aceptaciones_legales ENABLE ROW LEVEL SECURITY;
ALTER TABLE demanda_no_satisfecha ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_sistema ENABLE ROW LEVEL SECURITY;

-- Aceptaciones: cada quien registra la propia; admin ve todo
DROP POLICY IF EXISTS "self_insert_aceptaciones" ON aceptaciones_legales;
CREATE POLICY "self_insert_aceptaciones" ON aceptaciones_legales
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admin_all_aceptaciones" ON aceptaciones_legales;
CREATE POLICY "admin_all_aceptaciones" ON aceptaciones_legales
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));

-- Demanda no satisfecha: cualquiera (incluso anon) puede registrar; solo admin lee
DROP POLICY IF EXISTS "public_insert_demanda" ON demanda_no_satisfecha;
CREATE POLICY "public_insert_demanda" ON demanda_no_satisfecha
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "admin_read_demanda" ON demanda_no_satisfecha;
CREATE POLICY "admin_read_demanda" ON demanda_no_satisfecha
  FOR SELECT USING (es_admin(auth.uid()));

-- Eventos: solo admin (el log lo escribe backend/service_role, que bypassa RLS)
DROP POLICY IF EXISTS "admin_all_eventos" ON eventos_sistema;
CREATE POLICY "admin_all_eventos" ON eventos_sistema
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
