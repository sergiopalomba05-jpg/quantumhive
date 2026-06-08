-- Agrega revendedor_id a pedidos para saber qué pedidos vienen por cada link
ALTER TABLE pedidos ADD COLUMN revendedor_id bigint REFERENCES revendedores(id) ON DELETE SET NULL;

CREATE INDEX idx_pedidos_revendedor ON pedidos(revendedor_id);
