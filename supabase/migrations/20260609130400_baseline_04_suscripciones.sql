-- BASELINE 04 · Suscripciones + Pagos. Idempotente.

CREATE TABLE IF NOT EXISTS suscripciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revendedor_id bigint NOT NULL REFERENCES revendedores(id) ON DELETE CASCADE,
  plan_id bigint REFERENCES planes(id),
  estado text NOT NULL DEFAULT 'trial'
    CHECK (estado IN ('trial','activa','vencida','cancelada')),
  periodo_inicio timestamptz,
  periodo_fin timestamptz,
  monto numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suscripciones_rev ON suscripciones(revendedor_id);

CREATE TABLE IF NOT EXISTS pagos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revendedor_id bigint NOT NULL REFERENCES revendedores(id) ON DELETE CASCADE,
  suscripcion_id bigint REFERENCES suscripciones(id) ON DELETE SET NULL,
  concepto text NOT NULL DEFAULT 'suscripcion'
    CHECK (concepto IN ('alta','suscripcion','pedido')),
  monto numeric(12,2) NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','confirmado','rechazado')),
  metodo text,
  referencia text,
  confirmado_por uuid REFERENCES auth.users(id),
  confirmado_en timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pagos_rev ON pagos(revendedor_id);

DROP TRIGGER IF EXISTS suscripciones_updated_at ON suscripciones;
CREATE TRIGGER suscripciones_updated_at
  BEFORE UPDATE ON suscripciones FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_suscripciones" ON suscripciones;
CREATE POLICY "admin_all_suscripciones" ON suscripciones
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_pagos" ON pagos;
CREATE POLICY "admin_all_pagos" ON pagos
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));

-- Revendedor: solo lectura de lo suyo (no se auto-confirma pagos)
DROP POLICY IF EXISTS "revendedor_read_suscripciones" ON suscripciones;
CREATE POLICY "revendedor_read_suscripciones" ON suscripciones
  FOR SELECT USING (revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "revendedor_read_pagos" ON pagos;
CREATE POLICY "revendedor_read_pagos" ON pagos
  FOR SELECT USING (revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid()));
