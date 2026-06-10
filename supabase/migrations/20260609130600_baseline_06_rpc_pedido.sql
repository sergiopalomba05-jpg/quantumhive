-- BASELINE 06 · RPC crear_pedido: alta atómica de pedido + líneas para el comprador anónimo.
-- Idempotente (CREATE OR REPLACE).
--
-- Por qué un RPC: anon NO puede LEER `pedidos` (RLS: protege la PII de otros
-- compradores), así que un INSERT...RETURNING desde el cliente falla al pedir el id.
-- Esta función SECURITY DEFINER inserta el pedido y explota los items a `pedido_items`
-- (resolviendo `proveedor_id` desde cada producto, para la cabina de logística del panel)
-- y devuelve SOLO el id del pedido recién creado. No expone ninguna otra fila.

CREATE OR REPLACE FUNCTION crear_pedido(
  p_nombre text,
  p_whatsapp text,
  p_total numeric,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_revendedor_id bigint DEFAULT NULL,
  p_direccion text DEFAULT NULL,
  p_notas text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id bigint;
  v_item jsonb;
BEGIN
  IF p_nombre IS NULL OR btrim(p_nombre) = '' OR p_whatsapp IS NULL OR btrim(p_whatsapp) = '' THEN
    RAISE EXCEPTION 'nombre y whatsapp son obligatorios';
  END IF;

  INSERT INTO pedidos (nombre, whatsapp, total, items, revendedor_id, direccion, notas)
  VALUES (
    btrim(p_nombre), btrim(p_whatsapp), COALESCE(p_total, 0), COALESCE(p_items, '[]'::jsonb),
    p_revendedor_id,
    NULLIF(btrim(COALESCE(p_direccion, '')), ''),
    NULLIF(btrim(COALESCE(p_notas, '')), '')
  )
  RETURNING id INTO v_pedido_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    INSERT INTO pedido_items (pedido_id, producto_id, proveedor_id, revendedor_id, nombre_snapshot, precio_snapshot, cantidad, subtotal)
    SELECT
      v_pedido_id,
      (v_item->>'id')::bigint,
      pr.proveedor_id,
      p_revendedor_id,
      COALESCE(v_item->>'nombre', ''),
      COALESCE((v_item->>'precio')::numeric, 0),
      GREATEST(COALESCE((v_item->>'cantidad')::int, 1), 1),
      COALESCE((v_item->>'precio')::numeric, 0) * GREATEST(COALESCE((v_item->>'cantidad')::int, 1), 1)
    FROM (SELECT 1) d
    LEFT JOIN productos pr ON pr.id = (v_item->>'id')::bigint;
  END LOOP;

  RETURN v_pedido_id;
END;
$$;

-- Solo comprador (anon) y revendedor logueado pueden crear pedidos; nadie más vía RPC.
REVOKE ALL ON FUNCTION crear_pedido(text, text, numeric, jsonb, bigint, text, text) FROM public;
GRANT EXECUTE ON FUNCTION crear_pedido(text, text, numeric, jsonb, bigint, text, text) TO anon, authenticated;
