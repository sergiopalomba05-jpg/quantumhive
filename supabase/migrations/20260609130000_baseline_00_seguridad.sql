-- BASELINE 00 · Seguridad: identidad de admin real (allow-list)
-- Reemplaza el patrón inseguro auth.role()='authenticated' por es_admin(auth.uid()).
-- Idempotente: se puede correr en una DB fresca o ya existente.

-- 1. Allow-list de administradores (hoy: solo Sergio)
CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- 2. ¿Este uid es admin? SECURITY DEFINER para leer admins sin recursión de RLS.
CREATE OR REPLACE FUNCTION es_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = uid);
$$;

-- 3. Solo un admin lee la lista de admins. El alta de admin se hace con
--    service_role / SQL editor (fuera del app), nunca desde un cliente público.
DROP POLICY IF EXISTS "admin_read_admins" ON admins;
CREATE POLICY "admin_read_admins" ON admins
  FOR SELECT USING (es_admin(auth.uid()));
