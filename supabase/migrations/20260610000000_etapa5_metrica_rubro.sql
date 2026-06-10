-- ETAPA 5 · Métrica configurable por rubro. Idempotente.

ALTER TABLE rubros ADD COLUMN IF NOT EXISTS metrica_nombre text;
