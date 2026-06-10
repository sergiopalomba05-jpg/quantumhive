-- Etapa 5: métrica configurable por rubro
ALTER TABLE rubros ADD COLUMN IF NOT EXISTS metrica_nombre text;
