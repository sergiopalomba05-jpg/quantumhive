# Plan de Reconciliación — Directimport · Fase 1: Cimiento de Datos + Seguridad

> **Para ejecutores agénticos:** SUB-SKILL REQUERIDA: usar `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para ejecutar tarea por tarea. Los pasos usan checkbox (`- [ ]`) para tracking.

**Goal:** Dejar el esquema de datos de Directimport reproducible desde cero, seguro (un revendedor nunca puede tocar el catálogo madre ni auto-aprobarse) y completo (todo lo del brief modelado día 1), sin romper lo que ya funciona.

**Architecture:** Una sola fuente de verdad SQL = un *baseline* idempotente en `supabase/migrations/` (los fragmentos viejos se archivan, no se borran). La identidad de admin deja de ser "cualquier autenticado" y pasa a una allow-list real (`admins` + función `es_admin()`); todas las policies admin se reescriben sobre eso. El alta de revendedor nace `pendiente_aprobacion` y un trigger impide la auto-escalación. Se prueba todo contra un proyecto Supabase de *staging* con `supabase db reset` + un harness de RLS multi-sesión. Producción se reconcilia al final, en una tarea aparte y con OK explícito de Sergio.

**Tech Stack:** Supabase (Postgres + Auth + Storage + RLS), Supabase CLI (migraciones), `@supabase/supabase-js`, Node `node:test` (harness de seguridad). Sin Postgres local pesado: todo contra Supabase cloud (staging).

---

## 0. Por qué este plan (hallazgos del audit que cambian la prioridad)

Leyendo el SQL real (no los docs) aparecieron **dos cosas más graves que el botón de "Crear cuenta admin"**. Estas mandan el orden del plan:

### 🔴 Hallazgo A — Cualquier usuario logueado es "admin" para la base
Todas las policies de admin están escritas como:
```sql
CREATE POLICY "admin_all_productos" ON productos FOR ALL USING (auth.role() = 'authenticated');
```
`auth.role() = 'authenticated'` es **verdadero para CUALQUIER usuario logueado**, incluido un revendedor que se registró en el app. Con su sesión normal (anon key), un revendedor podría **insertar, editar o borrar productos del catálogo madre**, y **leer/editar la fila de otros revendedores** (la policy `admin_all_revendedores` tiene el mismo patrón). Es el agujero de aislamiento multi-tenant #1. El botón de signup del admin es secundario al lado de esto.

**Fix:** allow-list real (`admins`) + función `es_admin(uid)` + reescribir TODAS las policies `admin_all_*` sobre `es_admin(auth.uid())`. Esto, de paso, deja el rol que pediste: **admin del catálogo mayorista = solo vos**.

### 🔴 Hallazgo B — Las migraciones NO se pueden reproducir desde cero
- El esquema base (Etapa 1: `rubros`, `productos`, etc.) **no está** en `supabase/migrations/`; vive suelto en `directimport/supabase-migration.sql`.
- La migración `20260608190000_add_revendedor_id_to_pedidos.sql` hace `ALTER TABLE pedidos ...`, pero **no existe ningún `CREATE TABLE pedidos`** en el repo (la tabla se creó a mano en el dashboard). Un `supabase db reset` desde cero **crashea** ahí.
- `directimport/migracion-etapa2.sql` es un **duplicado divergente** de la migración de etapa2 (recrea `precios_revendedor`, que después se dropea). Dos fuentes de verdad que ya no coinciden.

**Fix:** consolidar todo en un *baseline* idempotente y ordenado, y archivar los fragmentos viejos (no borrarlos — regla #4).

### Modelo de roles (queda fijado acá, es la columna vertebral)
- **Admin del catálogo mayorista = SOLO Sergio.** Está en `admins`. Gestiona el catálogo madre (`productos` con `revendedor_id IS NULL`), rubros, proveedores, aprueba revendedores. Sin auto-registro.
- **Revendedor = dueño de SU tienda, nunca del catálogo madre.** Elige productos del catálogo madre y les pone su precio (`productos_revendedor`), **o carga sus productos propios** (`productos` con `revendedor_id = su id`). Personaliza colores/logo. Sus escrituras están acotadas por RLS a lo suyo. Nace `pendiente_aprobacion`.
- **Comprador = anónimo.** Solo crea pedidos (INSERT) y lee catálogo activo.

---

## 1. Roadmap completo (las 3 fases de un vistazo)

Por regla #3 (un paso a la vez) **detallo y ejecuto la Fase 1 primero** (el cimiento); las Fases 2 y 3 quedan como roadmap y se detallan cuando la 1 esté migrada y estable. Así ves *todo el plan* sin construir sobre un esquema que todavía puede ajustarse en tu revisión.

| Fase | Qué entrega | Estado en este doc |
|------|-------------|--------------------|
| **F1 · Cimiento de datos + seguridad** | Baseline reproducible, identidad de admin real, onboarding modelado + anti-escalación, `pedidos`/`pedido_items` con `proveedor_id`, productos propios del revendedor, suscripciones/pagos, legal/demanda/eventos. | **Detallada (abajo)** |
| **F2 · Alta con filtro (flujo + UI) + lockdown** | App: registro deja al revendedor `pendiente`. Admin: cola de aprobación (aprobar/rechazar/marcar pago→activar). Quitar el signup abierto del admin. | Roadmap (§5) |
| **F3 · Correcciones de app + tienda propia + hygiene** | Fix bug de hooks en `App.tsx`, cableado de `proveedor_id` en el alta de pedido, UI de productos propios en `MiTienda`, parqueo de scraper/meta_api, fix etiqueta de plan ('Premium'→'Pro Plus'). | Roadmap (§6) |

---

## 2. Prerrequisitos / decisiones de entorno (confirmar con Sergio antes de ejecutar)

> Estos son los únicos puntos que necesito de vos antes de tocar nada. No son código, son setup.

- [ ] **Proyecto Supabase de STAGING** (separado de producción) o una *branch* de Supabase. Todo el plan se prueba ahí. **Nunca se toca prod sin tu OK** (es una tarea aparte y gateada: Task 9).
- [ ] **Supabase CLI instalado y linkeado al staging** (`supabase --version`, `supabase link`). Las migraciones ya viven en `supabase/migrations/`, así que el CLI ya es el flujo.
- [ ] **`service_role` key del staging en un `.env` LOCAL** (en `directimport/db/.env`, gitignored). Se usa solo para el harness de tests (crear usuarios de prueba, sembrar datos, verificar). **Jamás al repo** (regla de keys).
- [ ] **Node disponible** (ya lo está: el app usa Vite). El harness corre con `node --test`.
- [ ] **git configurado** (`git config user.name` / `user.email` están vacíos hoy). Necesario para los commits del plan.

Verificación de prerrequisitos (Task 1) chequea todo esto antes de avanzar.

---

## 3. Estructura de archivos (mapa de la Fase 1)

**Fuente de verdad nueva (baseline idempotente, ordenado por nombre):**
```
supabase/migrations/
  20260609130000_baseline_00_seguridad.sql        ← admins + es_admin() + policy de admins
  20260609130100_baseline_01_catalogo.sql         ← rubros..tiras, planes(seed), triggers, RLS público + admin(es_admin)
  20260609130200_baseline_02_revendedores.sql     ← revendedores(final+onboarding+jerarquía+score) + productos_revendedor + productos.revendedor_id + trigger anti-escalación + buscar_productos
  20260609130300_baseline_03_pedidos.sql          ← pedidos + pedido_items(proveedor_id) + backfill + RLS
  20260609130400_baseline_04_suscripciones.sql    ← suscripciones + pagos + RLS
  20260609130500_baseline_05_legal_eventos.sql    ← aceptaciones_legales + demanda_no_satisfecha + eventos_sistema(Timón seed) + RLS
```

**Harness de pruebas (cloud, sin Postgres local):**
```
directimport/db/
  package.json                 ← declara @supabase/supabase-js (type: module)
  .env.example                 ← plantilla (keys vacías) → SÍ va al repo
  .env                         ← keys reales del staging → gitignored, NUNCA al repo
  tests/helpers.mjs            ← clientes admin/anon, crear usuario, abrir sesión
  tests/rls.test.mjs           ← pruebas de seguridad RLS multi-sesión (el corazón)
  tests/esquema.test.mjs       ← smoke de tablas dormidas (existen + anon no las lee)
```

**Archivo (mover, NO borrar — regla #4):**
```
supabase/migrations_archivo/   ← los fragmentos viejos no reproducibles (con README)
directimport/_archivo_sql/     ← supabase-migration.sql + migracion-etapa2.sql (con README)
directimport/_parqueado/       ← scraper_proveedores.py + meta_api.py (con README, fuera del v1)
```

**`.gitignore` (añadir):** `directimport/db/.env`

---

## 4. Fase 1 — Tareas (TDD: rojo → verde → commit)

### Task 1: Prerrequisitos y captura del estado real

**Files:**
- Create: `directimport/db/package.json`
- Create: `directimport/db/.env.example`
- Create: `directimport/db/.env` (local, gitignored)
- Modify: `.gitignore` (raíz del repo)

- [ ] **Step 1: Verificar herramientas**

Run:
```bash
supabase --version
node --version
git config user.name && git config user.email
```
Expected: las tres devuelven valor. Si `git config` está vacío, setearlo:
```bash
git config user.name "Sergio"
git config user.email "sergiopalomba05-jpg@users.noreply.github.com"
```

- [ ] **Step 2: Confirmar el link al proyecto de STAGING**

Run: `supabase projects list` y `supabase link --project-ref <REF_DEL_STAGING>`
Expected: queda linkeado al staging (NO a prod).

- [ ] **Step 3: Capturar el esquema real de `pedidos` vivo** (para reconciliar prod después)

Run en el SQL editor del proyecto vivo (o `supabase db dump`):
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pedidos'
ORDER BY ordinal_position;
```
Pegar el resultado en `directimport/db/_pedidos_vivo.txt` (gitignored). Sirve para la Task 9 (reconciliar prod sin romper). Si la consulta no devuelve filas, la tabla no existe en ese proyecto y se crea limpia desde el baseline.

- [ ] **Step 4: Crear el paquete del harness**

Crear `directimport/db/package.json`:
```json
{
  "name": "directimport-db-tests",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test --env-file=.env tests/"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.107.0"
  }
}
```

Crear `directimport/db/.env.example` (va al repo, claves vacías):
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Crear `directimport/db/.env` (LOCAL, gitignored) con las claves reales del **staging**.

- [ ] **Step 5: Ignorar el `.env` del harness**

Añadir a `.gitignore` de la raíz:
```
directimport/db/.env
directimport/db/_pedidos_vivo.txt
```

- [ ] **Step 6: Instalar y commitear el andamiaje**

Run: `cd directimport/db && npm install`
```bash
git add directimport/db/package.json directimport/db/.env.example .gitignore
git commit -m "chore(db): andamiaje de pruebas RLS contra Supabase staging"
```
Verificar que `.env` NO quedó staged: `git status` no debe listar `directimport/db/.env`.

---

### Task 2: Baseline 00 — Identidad de admin real (el fix de seguridad #1)

**Files:**
- Create: `supabase/migrations/20260609130000_baseline_00_seguridad.sql`
- Create: `directimport/db/tests/helpers.mjs`
- Create: `directimport/db/tests/rls.test.mjs`

> Esta tarea sola cierra el Hallazgo A. Por eso va primero y con prueba real de seguridad.

- [ ] **Step 1: Escribir el helper del harness**

Crear `directimport/db/tests/helpers.mjs`:
```js
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  throw new Error('Faltan SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY')
}

// Cliente con service_role: bypassa RLS, para sembrar y verificar.
export const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export function anonClient() {
  return createClient(URL, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Crea (o recupera) un usuario de auth con email confirmado.
export async function crearUsuario(email, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (data?.user) return data.user
  if (error && !String(error.message).toLowerCase().includes('already')) throw error
  const { data: list } = await admin.auth.admin.listUsers()
  return list.users.find((u) => u.email === email)
}

// Abre una sesión real (JWT de usuario) con la anon key.
export async function sesion(email, password) {
  const c = anonClient()
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw error
  return c
}
```

- [ ] **Step 2: Escribir la prueba de seguridad (que va a fallar)**

Crear `directimport/db/tests/rls.test.mjs`:
```js
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { admin, sesion, crearUsuario } from './helpers.mjs'

const ADMIN_EMAIL = 'test-admin@directimport.test'
const REV_EMAIL = 'test-revendedor@directimport.test'
const PASS = 'Test1234!seguro'

let adminUser, revUser, sesAdmin, sesRev

before(async () => {
  adminUser = await crearUsuario(ADMIN_EMAIL, PASS)
  revUser = await crearUsuario(REV_EMAIL, PASS)

  // Sergio (admin) entra en la allow-list; el revendedor NO.
  await admin.from('admins').upsert({ user_id: adminUser.id, nombre: 'Test Admin' })
  await admin.from('admins').delete().eq('user_id', revUser.id)

  sesAdmin = await sesion(ADMIN_EMAIL, PASS)
  sesRev = await sesion(REV_EMAIL, PASS)
})

test('un revendedor NO puede insertar en el catálogo madre', async () => {
  const { error } = await sesRev.from('productos').insert({
    rubro_id: 1, nombre: 'HACK', precio_base: 1,
  })
  assert.ok(error, 'se esperaba error de RLS al insertar producto madre')
})

test('un revendedor NO puede borrar del catálogo madre', async () => {
  const { data: prod } = await admin.from('productos')
    .insert({ rubro_id: 1, nombre: 'PROD-MADRE-TEST', precio_base: 100 })
    .select().single()
  await sesRev.from('productos').delete().eq('id', prod.id) // RLS: 0 filas, sin error
  const { data: sigue } = await admin.from('productos')
    .select('id').eq('id', prod.id).maybeSingle()
  assert.ok(sigue, 'el revendedor NO debe haber podido borrar el producto madre')
  await admin.from('productos').delete().eq('id', prod.id)
})

test('un admin SÍ puede insertar en el catálogo madre', async () => {
  const { data, error } = await sesAdmin.from('productos')
    .insert({ rubro_id: 1, nombre: 'PROD-ADMIN-TEST', precio_base: 200 })
    .select().single()
  assert.equal(error, null)
  assert.ok(data?.id)
  await admin.from('productos').delete().eq('id', data.id)
})
```
> Nota PostgREST: un DELETE/UPDATE bloqueado por RLS **no devuelve error**, afecta 0 filas. Por eso se verifica releyendo con service_role. Un INSERT bloqueado **sí** da error.

- [ ] **Step 3: Correr la prueba — debe FALLAR**

Run: `cd directimport/db && npm test`
Expected: FAIL. Hoy las policies son `auth.role() = 'authenticated'`, así que el revendedor SÍ inserta/borra → las aserciones rompen. (Además, `admins` todavía no existe → el `before` falla. Ambas señales confirman el agujero.)

- [ ] **Step 4: Escribir el baseline de seguridad**

Crear `supabase/migrations/20260609130000_baseline_00_seguridad.sql`:
```sql
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
```
> El alta del primer admin (Sergio) es un paso manual documentado en la Task 8/Step para staging y en la Task 9 para prod:
> `INSERT INTO admins (user_id, nombre) VALUES ('<uid-de-sergio>', 'Sergio') ON CONFLICT DO NOTHING;`

- [ ] **Step 5: Aplicar a staging y reescribir las policies en los baselines siguientes**

Las policies `admin_all_*` se reescriben **en el baseline de su tabla** (Tasks 3–7), no acá, para que cada archivo sea coherente con su tabla. Acá solo se crea la maquinaria (`admins` + `es_admin`). Aplicar:
```bash
supabase db reset   # staging: replay del/los baseline(s) existentes
```
Expected: corre sin error; `admins` y `es_admin` existen.

> La prueba de la Task 2 termina de pasar a verde recién cuando el baseline de `productos` (Task 3) reescribe `admin_all_productos` sobre `es_admin`. Se cierra el ciclo rojo→verde en la Task 3, Step "correr rls.test.mjs". Esto es intencional: la maquinaria (00) y su uso (01/02...) van juntas pero en archivos separados.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260609130000_baseline_00_seguridad.sql directimport/db/tests/helpers.mjs directimport/db/tests/rls.test.mjs
git commit -m "feat(db): identidad de admin real (admins + es_admin) + harness RLS"
```

---

### Task 3: Baseline 01 — Catálogo madre (idempotente, RLS sobre `es_admin`)

**Files:**
- Create: `supabase/migrations/20260609130100_baseline_01_catalogo.sql`

Refleja el **estado final** del catálogo (Etapa 1 + `descripcion_detallada`), no replica los ALTERs históricos. `productos.revendedor_id` se agrega en la Task 4 (depende de `revendedores`).

- [ ] **Step 1: Escribir el baseline del catálogo**

Crear `supabase/migrations/20260609130100_baseline_01_catalogo.sql`:
```sql
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
```

- [ ] **Step 2: Aplicar a staging**

Run: `supabase db reset`
Expected: corre sin error. (Si `rubros` está vacío, sembrar un rubro id=1 para los tests: `INSERT INTO rubros (nombre) VALUES ('Test') ON CONFLICT DO NOTHING;` vía SQL editor o un seed.)

- [ ] **Step 3: Correr la prueba de seguridad — ahora debe PASAR (verde)**

Run: `cd directimport/db && npm test`
Expected: PASS los 3 tests de la Task 2. El revendedor ya no puede insertar/borrar en `productos`; el admin sí. **Hallazgo A cerrado.**

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260609130100_baseline_01_catalogo.sql
git commit -m "feat(db): baseline catálogo madre con RLS admin sobre es_admin"
```

---

### Task 4: Baseline 02 — Revendedores (onboarding + jerarquía/score dormidos + productos propios + anti-escalación)

**Files:**
- Create: `supabase/migrations/20260609130200_baseline_02_revendedores.sql`
- Modify: `directimport/db/tests/rls.test.mjs` (agregar pruebas de escalación y aislamiento)

- [ ] **Step 1: Agregar las pruebas de escalación (que van a fallar)**

Añadir a `directimport/db/tests/rls.test.mjs` (al final), y dentro del `before` sembrar la fila del revendedor:

En el `before`, después de crear los usuarios, agregar:
```js
  // El revendedor tiene su fila (sembrada con service_role; nace pendiente).
  await admin.from('revendedores').upsert(
    { user_id: revUser.id, codigo_unico: 'TEST01', plan_id: 1, nombre_negocio: 'Tienda Test' },
    { onConflict: 'user_id' },
  )
  // Un segundo revendedor, para probar aislamiento entre tiendas.
  const otro = await crearUsuario('test-otro@directimport.test', PASS)
  await admin.from('revendedores').upsert(
    { user_id: otro.id, codigo_unico: 'OTRO01', plan_id: 1, nombre_negocio: 'Otra Tienda' },
    { onConflict: 'user_id' },
  )
```

Nuevos tests al final del archivo:
```js
test('un revendedor NO puede auto-aprobarse ni subirse de plan', async () => {
  await sesRev.from('revendedores')
    .update({ estado: 'activo', plan_id: 4, score: 999 })
    .eq('user_id', revUser.id)
  const { data } = await admin.from('revendedores')
    .select('estado, plan_id, score').eq('user_id', revUser.id).single()
  assert.equal(data.estado, 'pendiente_aprobacion', 'no debe poder activarse solo')
  assert.equal(Number(data.plan_id), 1, 'no debe poder cambiar su plan')
  assert.equal(Number(data.score), 0, 'no debe poder tocar su score')
})

test('un revendedor NO ve la fila de otro revendedor', async () => {
  const { data } = await sesRev.from('revendedores').select('codigo_unico')
  const codigos = (data || []).map((r) => r.codigo_unico)
  assert.ok(!codigos.includes('OTRO01'), 'no debe ver la tienda de otro')
})

test('un revendedor SÍ puede editar lo cosmético de su tienda', async () => {
  const { error } = await sesRev.from('revendedores')
    .update({ nombre_negocio: 'Mi Tienda Editada', whatsapp: '+5491100000000' })
    .eq('user_id', revUser.id)
  assert.equal(error, null)
  const { data } = await admin.from('revendedores')
    .select('nombre_negocio').eq('user_id', revUser.id).single()
  assert.equal(data.nombre_negocio, 'Mi Tienda Editada')
})

test('un revendedor NO puede crear productos madre (revendedor_id NULL)', async () => {
  const { error } = await sesRev.from('productos')
    .insert({ rubro_id: 1, nombre: 'INTRUSO-MADRE', precio_base: 1, revendedor_id: null })
  assert.ok(error, 'un producto con revendedor_id NULL es del catálogo madre; debe rechazarse')
})
```

- [ ] **Step 2: Correr — debe FALLAR**

Run: `cd directimport/db && npm test`
Expected: FAIL (las columnas `estado`/`score` y el trigger no existen aún; el revendedor hoy puede cambiar lo que sea).

- [ ] **Step 3: Escribir el baseline de revendedores**

Crear `supabase/migrations/20260609130200_baseline_02_revendedores.sql`:
```sql
-- BASELINE 02 · Revendedores: estado final + onboarding + jerarquía/score dormidos
--   + productos_revendedor + productos propios + anti-escalación. Idempotente.

CREATE TABLE IF NOT EXISTS revendedores (
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
  -- onboarding con filtro
  estado text NOT NULL DEFAULT 'pendiente_aprobacion'
    CHECK (estado IN ('pendiente_aprobacion','aprobado','pago_pendiente','activo','rechazado','suspendido')),
  aprobado_por uuid REFERENCES auth.users(id),
  aprobado_en timestamptz,
  motivo_rechazo text,
  -- jerarquía dormida (modelada, sin lógica todavía)
  padre_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  nivel integer NOT NULL DEFAULT 1,
  zona text,
  -- scoring dormido
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Convergencia para DBs que ya tienen la tabla vieja (sin estas columnas)
ALTER TABLE revendedores
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente_aprobacion',
  ADD COLUMN IF NOT EXISTS aprobado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS aprobado_en timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_rechazo text,
  ADD COLUMN IF NOT EXISTS padre_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nivel integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS zona text,
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revendedores_estado_check') THEN
    ALTER TABLE revendedores ADD CONSTRAINT revendedores_estado_check
      CHECK (estado IN ('pendiente_aprobacion','aprobado','pago_pendiente','activo','rechazado','suspendido'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_revendedores_user ON revendedores(user_id);
CREATE INDEX IF NOT EXISTS idx_revendedores_codigo ON revendedores(codigo_unico);
CREATE INDEX IF NOT EXISTS idx_revendedores_estado ON revendedores(estado);
CREATE INDEX IF NOT EXISTS idx_revendedores_padre ON revendedores(padre_id);

-- Productos del catálogo madre que el revendedor mete en su tienda + su precio
CREATE TABLE IF NOT EXISTS productos_revendedor (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revendedor_id bigint NOT NULL REFERENCES revendedores(id) ON DELETE CASCADE,
  producto_id bigint NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  precio_unitario numeric(12,2) NOT NULL,
  precio_pack_6 numeric(12,2),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(revendedor_id, producto_id)
);
CREATE INDEX IF NOT EXISTS idx_productos_rev ON productos_revendedor(revendedor_id);
CREATE INDEX IF NOT EXISTS idx_productos_rev_prod ON productos_revendedor(producto_id);

-- Productos PROPIOS del revendedor: misma tabla productos, dueño en revendedor_id.
-- revendedor_id IS NULL  => catálogo madre (de Sergio).
-- revendedor_id = X      => producto propio del revendedor X.
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS revendedor_id bigint REFERENCES revendedores(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_productos_revendedor ON productos(revendedor_id);

-- Búsqueda del catálogo madre: solo productos sin dueño revendedor
CREATE OR REPLACE FUNCTION buscar_productos(termino text)
RETURNS SETOF productos AS $$
  SELECT * FROM productos
  WHERE activo = true AND estado_stock = true AND revendedor_id IS NULL
    AND (nombre ILIKE '%' || termino || '%' OR descripcion ILIKE '%' || termino || '%')
  ORDER BY created_at DESC;
$$ LANGUAGE sql STABLE;

-- Trigger updated_at
DROP TRIGGER IF EXISTS revendedores_updated_at ON revendedores;
CREATE TRIGGER revendedores_updated_at
  BEFORE UPDATE ON revendedores FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
DROP TRIGGER IF EXISTS productos_rev_updated_at ON productos_revendedor;
CREATE TRIGGER productos_rev_updated_at
  BEFORE UPDATE ON productos_revendedor FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- ===== Anti-escalación: el revendedor no puede tocar columnas sensibles =====
CREATE OR REPLACE FUNCTION proteger_revendedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins y procesos backend (service_role) pueden todo.
  IF es_admin(auth.uid()) OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.estado := 'pendiente_aprobacion';
    NEW.aprobado_por := NULL;
    NEW.aprobado_en := NULL;
    NEW.plan_id := 1;
    NEW.score := 0;
    NEW.nivel := 1;
    NEW.padre_id := NULL;
    NEW.trial_hasta := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.estado := OLD.estado;
    NEW.plan_id := OLD.plan_id;
    NEW.aprobado_por := OLD.aprobado_por;
    NEW.aprobado_en := OLD.aprobado_en;
    NEW.score := OLD.score;
    NEW.nivel := OLD.nivel;
    NEW.padre_id := OLD.padre_id;
    NEW.zona := OLD.zona;
    NEW.codigo_unico := OLD.codigo_unico;
    NEW.trial_hasta := OLD.trial_hasta;
    NEW.user_id := OLD.user_id;
    NEW.activo := OLD.activo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_revendedor_biu ON revendedores;
CREATE TRIGGER proteger_revendedor_biu
  BEFORE INSERT OR UPDATE ON revendedores
  FOR EACH ROW EXECUTE FUNCTION proteger_revendedor();

-- ===== RLS =====
ALTER TABLE revendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_revendedor ENABLE ROW LEVEL SECURITY;

-- Admin: todo
DROP POLICY IF EXISTS "admin_all_revendedores" ON revendedores;
CREATE POLICY "admin_all_revendedores" ON revendedores
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_productos_rev" ON productos_revendedor;
CREATE POLICY "admin_all_productos_rev" ON productos_revendedor
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));

-- Revendedor: ve/inserta/edita SU fila (el trigger acota qué columnas valen)
DROP POLICY IF EXISTS "revendedor_self" ON revendedores;            -- vieja FOR ALL, se reemplaza
DROP POLICY IF EXISTS "revendedor_self_select" ON revendedores;
CREATE POLICY "revendedor_self_select" ON revendedores
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "revendedor_self_insert" ON revendedores;
CREATE POLICY "revendedor_self_insert" ON revendedores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "revendedor_self_update" ON revendedores;
CREATE POLICY "revendedor_self_update" ON revendedores
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Público: la tienda del revendedor solo si está ACTIVO
DROP POLICY IF EXISTS "public_read_revendedor" ON revendedores;
CREATE POLICY "public_read_revendedor" ON revendedores
  FOR SELECT USING (activo = true AND estado = 'activo');

-- productos_revendedor: revendedor gestiona lo suyo; público lee lo activo
DROP POLICY IF EXISTS "revendedor_self_productos" ON productos_revendedor;
CREATE POLICY "revendedor_self_productos" ON productos_revendedor
  FOR ALL USING (
    EXISTS (SELECT 1 FROM revendedores r WHERE r.id = productos_revendedor.revendedor_id AND r.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM revendedores r WHERE r.id = productos_revendedor.revendedor_id AND r.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "public_read_productos_rev" ON productos_revendedor;
CREATE POLICY "public_read_productos_rev" ON productos_revendedor
  FOR SELECT USING (activo = true);

-- productos propios del revendedor: puede gestionar SOLO los suyos (revendedor_id = su id).
-- El WITH CHECK con subquery a su propio id impide poner revendedor_id NULL (=> escalar a madre).
DROP POLICY IF EXISTS "revendedor_own_productos" ON productos;
CREATE POLICY "revendedor_own_productos" ON productos
  FOR ALL USING (
    revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid())
  ) WITH CHECK (
    revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid())
  );
```

- [ ] **Step 4: Aplicar y correr — debe PASAR (verde)**

Run: `supabase db reset && cd directimport/db && npm test`
Expected: PASS todos (los 3 de seguridad + los 4 nuevos de escalación/aislamiento/cosmético/madre).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260609130200_baseline_02_revendedores.sql directimport/db/tests/rls.test.mjs
git commit -m "feat(db): revendedores con onboarding, productos propios y anti-escalacion"
```

---

### Task 5: Baseline 03 — `pedidos` recuperado + `pedido_items` con `proveedor_id`

**Files:**
- Create: `supabase/migrations/20260609130300_baseline_03_pedidos.sql`
- Modify: `directimport/db/tests/rls.test.mjs` (prueba de pedido + aislamiento)

Recupera la tabla `pedidos` (hoy creada a mano, fuera del repo) y normaliza las líneas a `pedido_items`, cada línea con su `proveedor_id` (resuelto desde el producto). El `items` jsonb legado se conserva hasta migrar el app (F3), y se backfillea a `pedido_items`.

- [ ] **Step 1: Agregar la prueba de pedidos (debe fallar)**

Añadir a `directimport/db/tests/rls.test.mjs`:
```js
test('un comprador anónimo puede crear un pedido con sus líneas', async () => {
  const { anonClient } = await import('./helpers.mjs')
  const buyer = anonClient()
  const { data: pedido, error } = await buyer.from('pedidos')
    .insert({ nombre: 'Comprador', whatsapp: '+5491100000001', total: 500 })
    .select().single()
  assert.equal(error, null, 'el público debe poder crear pedido')
  const { error: e2 } = await buyer.from('pedido_items').insert({
    pedido_id: pedido.id, producto_id: null, proveedor_id: null,
    nombre_snapshot: 'Item', precio_snapshot: 250, cantidad: 2, subtotal: 500,
  })
  assert.equal(e2, null, 'el público debe poder agregar líneas')
  await admin.from('pedidos').delete().eq('id', pedido.id)
})

test('un revendedor NO ve pedidos de otra tienda', async () => {
  // pedido de OTRO01 (id se resuelve por código)
  const { data: otro } = await admin.from('revendedores').select('id').eq('codigo_unico', 'OTRO01').single()
  const { data: ped } = await admin.from('pedidos')
    .insert({ nombre: 'X', whatsapp: '+540', total: 1, revendedor_id: otro.id }).select().single()
  const { data: visibles } = await sesRev.from('pedidos').select('id').eq('id', ped.id)
  assert.equal((visibles || []).length, 0, 'no debe ver pedidos de otra tienda')
  await admin.from('pedidos').delete().eq('id', ped.id)
})
```

- [ ] **Step 2: Correr — debe FALLAR** (las tablas no existen / sin policies)

Run: `cd directimport/db && npm test` → FAIL.

- [ ] **Step 3: Escribir el baseline de pedidos**

Crear `supabase/migrations/20260609130300_baseline_03_pedidos.sql`:
```sql
-- BASELINE 03 · pedidos + pedido_items (normalizado con proveedor_id). Idempotente.

CREATE TABLE IF NOT EXISTS pedidos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  revendedor_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  nombre text NOT NULL,
  whatsapp text NOT NULL,
  direccion text,
  notas text,
  items jsonb DEFAULT '[]',            -- legado: se mantiene hasta migrar el app (F3)
  total numeric(12,2) NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','confirmado','enviado','entregado','cancelado')),
  estado_pago text NOT NULL DEFAULT 'pendiente'
    CHECK (estado_pago IN ('pendiente','senado','pagado','reembolsado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Convergencia para la tabla viva creada a mano (columnas que pudieran faltar)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS revendedor_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS notas text,
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS estado_pago text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS total numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_estado_check') THEN
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check
      CHECK (estado IN ('pendiente','confirmado','enviado','entregado','cancelado'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pedidos_estado_pago_check') THEN
    ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_pago_check
      CHECK (estado_pago IN ('pendiente','senado','pagado','reembolsado'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pedidos_revendedor ON pedidos(revendedor_id);

DROP TRIGGER IF EXISTS pedidos_updated_at ON pedidos;
CREATE TRIGGER pedidos_updated_at
  BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Líneas normalizadas, cada una con su proveedor (ruteo de orden multi-proveedor)
CREATE TABLE IF NOT EXISTS pedido_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id bigint NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id bigint REFERENCES productos(id) ON DELETE SET NULL,
  proveedor_id bigint REFERENCES proveedores(id) ON DELETE SET NULL,
  revendedor_id bigint REFERENCES revendedores(id) ON DELETE SET NULL,
  nombre_snapshot text NOT NULL,
  precio_snapshot numeric(12,2) NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  subtotal numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido ON pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_proveedor ON pedido_items(proveedor_id);

-- Backfill: explotar pedidos.items (jsonb) a pedido_items, resolviendo proveedor_id
INSERT INTO pedido_items (pedido_id, producto_id, proveedor_id, revendedor_id, nombre_snapshot, precio_snapshot, cantidad, subtotal)
SELECT
  p.id,
  (it->>'id')::bigint,
  pr.proveedor_id,
  p.revendedor_id,
  COALESCE(it->>'nombre', ''),
  COALESCE((it->>'precio')::numeric, 0),
  COALESCE((it->>'cantidad')::int, 1),
  COALESCE((it->>'precio')::numeric, 0) * COALESCE((it->>'cantidad')::int, 1)
FROM pedidos p
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.items, '[]'::jsonb)) AS it
LEFT JOIN productos pr ON pr.id = (it->>'id')::bigint
WHERE NOT EXISTS (SELECT 1 FROM pedido_items pi WHERE pi.pedido_id = p.id);

-- RLS
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

-- Comprador anónimo crea pedido + líneas
DROP POLICY IF EXISTS "public_insert_pedidos" ON pedidos;
CREATE POLICY "public_insert_pedidos" ON pedidos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_insert_pedido_items" ON pedido_items;
CREATE POLICY "public_insert_pedido_items" ON pedido_items FOR INSERT WITH CHECK (true);

-- Admin gestiona todo
DROP POLICY IF EXISTS "admin_all_pedidos" ON pedidos;
CREATE POLICY "admin_all_pedidos" ON pedidos
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_all_pedido_items" ON pedido_items;
CREATE POLICY "admin_all_pedido_items" ON pedido_items
  FOR ALL USING (es_admin(auth.uid())) WITH CHECK (es_admin(auth.uid()));

-- Revendedor ve los pedidos/líneas de SU tienda
DROP POLICY IF EXISTS "revendedor_read_pedidos" ON pedidos;
CREATE POLICY "revendedor_read_pedidos" ON pedidos
  FOR SELECT USING (revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "revendedor_read_pedido_items" ON pedido_items;
CREATE POLICY "revendedor_read_pedido_items" ON pedido_items
  FOR SELECT USING (revendedor_id IN (SELECT id FROM revendedores WHERE user_id = auth.uid()));
```

- [ ] **Step 4: Aplicar y correr — verde**

Run: `supabase db reset && cd directimport/db && npm test`
Expected: PASS todos.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260609130300_baseline_03_pedidos.sql directimport/db/tests/rls.test.mjs
git commit -m "feat(db): pedidos recuperado + pedido_items con proveedor_id + backfill"
```

---

### Task 6: Baseline 04 — Suscripciones + Pagos (cobro y estado de pago modelados)

**Files:**
- Create: `supabase/migrations/20260609130400_baseline_04_suscripciones.sql`

Modela el cobro de la suscripción del revendedor y el pago del alta (punto 7: el alta requiere pago). Tablas listas día 1; la lógica de cobro se conecta en su fase. El admin confirma pagos a mano (transferencia primero, como el resto del flujo).

- [ ] **Step 1: Escribir el baseline**

Crear `supabase/migrations/20260609130400_baseline_04_suscripciones.sql`:
```sql
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
```

- [ ] **Step 2: Aplicar a staging**

Run: `supabase db reset`
Expected: corre sin error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260609130400_baseline_04_suscripciones.sql
git commit -m "feat(db): suscripciones y pagos (cobro de alta y de plan)"
```

---

### Task 7: Baseline 05 — Legal + Demanda no satisfecha + Eventos (semilla de Timón)

**Files:**
- Create: `supabase/migrations/20260609130500_baseline_05_legal_eventos.sql`
- Create: `directimport/db/tests/esquema.test.mjs`

Tres semillas dormidas del brief: aceptación legal (clickwrap en el alta), demanda no satisfecha (búsquedas sin resultado → inteligencia de qué traer), y un log de eventos append-only (cimiento de la memoria "Timón").

- [ ] **Step 1: Escribir el smoke test (debe fallar)**

Crear `directimport/db/tests/esquema.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { admin, anonClient } from './helpers.mjs'

const DORMIDAS = ['suscripciones', 'pagos', 'aceptaciones_legales', 'demanda_no_satisfecha', 'eventos_sistema']

test('las tablas dormidas existen y son consultables por admin', async () => {
  for (const t of DORMIDAS) {
    const { error } = await admin.from(t).select('*').limit(1)
    assert.equal(error, null, `la tabla ${t} debe existir`)
  }
})

test('el público NO puede leer pagos ni eventos del sistema', async () => {
  const anon = anonClient()
  const { data: pagos } = await anon.from('pagos').select('*')
  assert.equal((pagos || []).length, 0, 'pagos no debe ser legible por anon')
  const { data: ev } = await anon.from('eventos_sistema').select('*')
  assert.equal((ev || []).length, 0, 'eventos_sistema no debe ser legible por anon')
})
```

- [ ] **Step 2: Correr — debe FALLAR** (tablas no existen). Run: `cd directimport/db && npm test`.

- [ ] **Step 3: Escribir el baseline**

Crear `supabase/migrations/20260609130500_baseline_05_legal_eventos.sql`:
```sql
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
```

- [ ] **Step 4: Aplicar y correr — verde**

Run: `supabase db reset && cd directimport/db && npm test`
Expected: PASS (incluye rls.test.mjs + esquema.test.mjs).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260609130500_baseline_05_legal_eventos.sql directimport/db/tests/esquema.test.mjs
git commit -m "feat(db): legal, demanda no satisfecha y eventos (semilla Timon)"
```

---

### Task 8: Reproducibilidad end-to-end + archivar fragmentos viejos + parquear scraper

**Files:**
- Move: `supabase/migrations/20260608*.sql` → `supabase/migrations_archivo/`
- Move: `directimport/supabase-migration.sql`, `directimport/migracion-etapa2.sql` → `directimport/_archivo_sql/`
- Move: `directimport/scraper_proveedores.py`, `directimport/meta_api.py` → `directimport/_parqueado/`
- Create: 3 README en cada carpeta de archivo/parqueo

> Cierra el Hallazgo B (una sola fuente de verdad reproducible) y el punto 6 (parquear scraper).

- [ ] **Step 1: Archivar los 7 fragmentos viejos no reproducibles**

Los baseline 00–05 ya representan TODO el esquema. Los fragmentos `20260608*` quedan obsoletos (incluido el `add_revendedor_id_to_pedidos` que crashea desde cero). Moverlos fuera del set activo:
```bash
mkdir -p supabase/migrations_archivo
git mv supabase/migrations/20260608164113_etapa2_revendedores.sql supabase/migrations_archivo/
git mv supabase/migrations/20260608180000_fix_rls_revendedores.sql supabase/migrations_archivo/
git mv supabase/migrations/20260608190000_add_revendedor_id_to_pedidos.sql supabase/migrations_archivo/
git mv supabase/migrations/20260608200000_productos_revendedor.sql supabase/migrations_archivo/
git mv supabase/migrations/20260608210000_storage_productos_bucket.sql supabase/migrations_archivo/
git mv supabase/migrations/20260608220000_add_descripcion_detallada.sql supabase/migrations_archivo/
```
> El bucket de storage (`20260608210000`) se reintroduce como baseline 06 si hace falta para staging; en prod el bucket ya existe. Por ahora se archiva con los demás y se nota en el README (ver Step 4). Si el harness o el admin necesitan el bucket en staging, crear `20260609130600_baseline_06_storage.sql` copiando ese contenido (es independiente y seguro).

- [ ] **Step 2: Archivar los dos SQL sueltos duplicados**

```bash
mkdir -p directimport/_archivo_sql
git mv directimport/supabase-migration.sql directimport/_archivo_sql/
git mv directimport/migracion-etapa2.sql directimport/_archivo_sql/
```

- [ ] **Step 3: Parquear scraper + meta_api (punto 6 — fuera del v1, NO se borran)**

```bash
mkdir -p directimport/_parqueado
git mv directimport/scraper_proveedores.py directimport/_parqueado/
git mv directimport/meta_api.py directimport/_parqueado/
```

- [ ] **Step 4: Escribir los README de archivo/parqueo**

Crear `supabase/migrations_archivo/README.md`:
```markdown
# Migraciones archivadas (NO reproducibles)
Fragmentos de la construcción inicial (DeepSeek/OpenCode). Reemplazados por el
baseline idempotente `20260609130*_baseline_*`. Se conservan como referencia
histórica. NO ejecutar: `20260608190000` referencia `pedidos` antes de crearla.
Si se necesita el bucket de storage en staging, copiar `20260608210000` a un
nuevo `20260609130600_baseline_06_storage.sql`.
```
Crear `directimport/_archivo_sql/README.md`:
```markdown
# SQL suelto archivado
`supabase-migration.sql` (Etapa 1) y `migracion-etapa2.sql` (duplicado divergente).
Superados por `supabase/migrations/` (baseline). Solo referencia histórica.
```
Crear `directimport/_parqueado/README.md`:
```markdown
# Parqueado — fuera del v1
`scraper_proveedores.py` y `meta_api.py`: descubrimiento de proveedores/precios.
No tocan la app ni la base. Fuera del alcance del v1 (decisión de Sergio).
No se borran; se retoman si/ cuando hagan falta.
```

- [ ] **Step 5: LA PRUEBA DE FUEGO — reproducibilidad desde cero**

Run: `supabase db reset` (replay limpio de SOLO los baseline 00–05) y luego:
```bash
cd directimport/db && npm test
```
Expected: el reset corre **sin un solo error** y los tests pasan. Esto prueba que el repo, solo, reconstruye toda la base. Hallazgo B cerrado.

- [ ] **Step 6: Sembrar el primer admin en staging (paso manual documentado)**

En el SQL editor del staging, con el `user_id` del usuario admin de prueba:
```sql
INSERT INTO admins (user_id, nombre) VALUES ('<uid-admin-staging>', 'Sergio') ON CONFLICT DO NOTHING;
```

- [ ] **Step 7: Commit + push (cierre de Fase 1 en el repo)**

```bash
git add -A
git commit -m "chore(db): baseline unico reproducible; archivar fragmentos y parquear scraper"
git push
```
> Regla #2: hasta acá no existe si no está en GitHub. Este push cierra la Fase 1 a nivel repo (sin tocar prod).

---

### Task 9: Reconciliar PRODUCCIÓN con el baseline — GATEADA (requiere OK explícito de Sergio)

**Files:** ninguno nuevo. Operación sobre el proyecto Supabase de producción.

> ⚠️ Esta tarea toca prod. NO se ejecuta sin aprobación de Sergio (flujo §9 de CLAUDE.md). Se hace después de que staging esté 100% verde y revisado.

- [ ] **Step 1: Backup de prod**

En el dashboard de Supabase prod: crear un backup/snapshot manual antes de nada.

- [ ] **Step 2: Diff contra prod (sin aplicar)**

Run: `supabase db diff --linked` (linkeado a prod) para ver exactamente qué cambiaría. Revisar con Sergio. Como el baseline es idempotente, lo esperado es: crea `admins`, `es_admin`, columnas de onboarding, `pedido_items`, `suscripciones`, `pagos`, legal/eventos, y **reescribe las policies** (el cambio de seguridad real).

- [ ] **Step 3: Aplicar baseline a prod (idempotente)**

Run: `supabase db push` contra prod. El baseline no recrea lo existente (IF NOT EXISTS) y converge columnas/policies. Si el CLI se queja del historial (porque los `20260608*` fueron archivados), usar `supabase migration repair --status reverted <timestamps_viejos>` y `--status applied <baselines>` según indique el CLI, validado contra el diff del Step 2.

- [ ] **Step 4: Sembrar el admin real (Sergio) en prod**

```sql
INSERT INTO admins (user_id, nombre)
VALUES ('<uid-de-sergio-en-prod>', 'Sergio') ON CONFLICT DO NOTHING;
```
> Sin esto, tras el cambio de policies, el admin de Vercel deja de poder gestionar (correcto: ya nadie es admin "por estar logueado"). Sergio debe quedar en `admins`.

- [ ] **Step 5: Smoke en prod**

- El admin (Sergio) entra a Vercel y ve/edita catálogo. ✅
- Una cuenta de revendedor de prueba NO puede tocar el catálogo madre. ✅
- Verificar que los pedidos existentes tienen sus `pedido_items` backfilleados:
  `SELECT count(*) FROM pedido_items;` > 0 si había pedidos con items.

- [ ] **Step 6: Commit del estado (si hubo ajustes) + push**

```bash
git add -A && git commit -m "chore(db): reconciliacion de produccion con baseline" && git push
```

---

## 5. Roadmap Fase 2 — Alta con filtro (flujo + UI) + lockdown del admin

> Se detalla con código completo cuando la Fase 1 esté migrada y estable (regla #3). Depende del esquema de la F1 (estados de onboarding, `admins`, `pagos`).

- **Tarea F2.1 — App: el registro deja al revendedor `pendiente`.** Modificar `directimport/app/src/Auth.tsx`: el `signUp` + insert en `revendedores` ya nace `pendiente_aprobacion` por el trigger; ajustar el copy ("Tu solicitud quedó pendiente de aprobación") y registrar la aceptación legal (`aceptaciones_legales`) en el alta. Mover la generación de `codigo_unico` fuera del random colisionable (default en DB o retry).
- **Tarea F2.2 — App: gating por estado.** En `App.tsx`/`MiTienda.tsx`, un revendedor no-`activo` ve "cuenta pendiente / pago pendiente", no el panel de tienda. La tienda pública por `?r=CODIGO` ya está protegida por la policy (`estado='activo'`).
- **Tarea F2.3 — Admin: cola de aprobación.** Nueva página `directimport/admin/src/app/dashboard/revendedores/page.tsx`: lista de `pendiente_aprobacion`, botones aprobar (set `estado='aprobado'`, `aprobado_por`, `aprobado_en`, asignar `plan_id`) / rechazar (`estado='rechazado'` + `motivo_rechazo`). Al confirmar pago (`pagos.estado='confirmado'`) → `estado='activo'`. Esto SOLO funciona para usuarios en `admins` (RLS F1).
- **Tarea F2.4 — Admin: lockdown del signup.** Quitar el botón "Crear cuenta admin" de `directimport/admin/src/app/(auth)/login/page.tsx` y la rama `signUp`. Alta de admin = manual vía `admins` (service_role/SQL). El admin de Vercel queda solo-login.
- **Verificación F2:** test e2e del circuito registro→pendiente→aprobación→pago→activo, y que un admin recién creado por signup ya NO puede existir.

## 6. Roadmap Fase 3 — Correcciones de app + tienda propia + hygiene

> Se detalla al cerrar F2.

- **Tarea F3.1 — Fix bug de hooks (`App.tsx:245`).** Mover `const [pedidoExpandido, setPedidoExpandido] = useState(...)` y el `useEffect` de la línea 247 ARRIBA de todos los `return` condicionales (líneas 237–243). Test: render del catálogo sin warning de Rules of Hooks; `eslint-plugin-react-hooks` (ya instalado) en verde.
- **Tarea F3.2 — Cablear `proveedor_id` en el alta de pedido.** Modificar `enviarPedido()` en `App.tsx` (línea 212): además de (o en vez de) el `items` jsonb, insertar filas en `pedido_items` con `producto_id`, `proveedor_id` (traído del producto), `revendedor_id`, snapshots y `cantidad`. Migrar el render de "Mis pedidos" para leer `pedido_items`.
- **Tarea F3.3 — UI de productos propios del revendedor.** En `MiTienda.tsx`: además de elegir del catálogo madre, alta de producto propio (`productos` con su `revendedor_id`), reusando el patrón de `ProductoForm`. Storage: endurecer policies del bucket `productos` a dueño/`es_admin` (hoy son `auth.role()='authenticated'`).
- **Tarea F3.4 — Fix etiqueta de plan.** En el perfil del `App.tsx`, `['Basico','Pro','Premium','Ultra']` → `['Básico','Pro','Pro Plus','Ultra']` (coincide con la DB).
- **Tarea F3.5 — `.env.ejemplo` y QRs.** Verificar que `.env.ejemplo` cubre las nuevas vars; revisar `qr-install.html`.

---

## 7. Auto-revisión del plan (writing-plans · checklist)

**1. Cobertura del alcance aprobado (8 puntos):**
- (1) Recuperar `CREATE TABLE pedidos` → Task 5 ✅
- (2) Normalizar líneas con `proveedor_id` → Task 5 (`pedido_items`) ✅ (cableado app en F3.2)
- (3) Modelar todo lo dormido → Tasks 4 (jerarquía/score/onboarding), 6 (suscripciones/pagos), 7 (legal/demanda/eventos) ✅
- (4) Alta con filtro + cerrar signup admin → esquema en Task 4 (estados+trigger) y seguridad en Tasks 2–3; UI/flujo en F2 ✅
- (5) Productos propios del revendedor → Task 4 (`productos.revendedor_id` + RLS) ✅ (UI en F3.3)
- (6) Fix bug hooks → F3.1 (roadmap) ✅
- (7) Unificar SQL a una fuente → Tasks 3–8 (baseline) + Task 8 (archivar) ✅
- (8) Parquear scraper+meta_api → Task 8 Step 3 ✅
- **Extra crítico no pedido pero encontrado:** RLS admin hole → Tasks 2–3 ✅ (es el cambio de mayor impacto).

**2. Scan de placeholders:** sin "TBD/TODO/etc." en las tareas de F1; todo paso con SQL/código real. F2/F3 están marcadas explícitamente como roadmap a detallar (no son pasos ejecutables disfrazados).

**3. Consistencia de tipos/nombres entre tareas:**
- `es_admin(auth.uid())` idéntico en 00/01/02/03/04/05 ✅
- `auth.role() = 'service_role'` (bypass del trigger) ✅
- Estados de revendedor: `pendiente_aprobacion / aprobado / pago_pendiente / activo / rechazado / suspendido` consistentes en CHECK, trigger y F2 ✅
- Estados pedido: `pendiente/confirmado/enviado/entregado/cancelado` (coincide con `App.tsx` y dashboard) ✅
- `pedido_items` columnas (`proveedor_id`, `revendedor_id`, `*_snapshot`, `cantidad`, `subtotal`) usadas igual en backfill y tests ✅
- `revendedor_id IS NULL` = catálogo madre, usado en `buscar_productos` y en el test "INTRUSO-MADRE" ✅

**Gaps conocidos (intencionales, fuera de F1):** generación robusta de `codigo_unico` (F2.1); endurecer storage bucket (F3.3); el `items` jsonb legado convive con `pedido_items` hasta F3.2. Ninguno bloquea F1.

---

## Notas de ejecución
- **Un paso a la vez (regla #3):** no avanzar de Task N a N+1 si los tests de N no están verdes.
- **`git push` cierra cada cierre de fase (regla #2).**
- **Prod es sagrado (Task 9 gateada):** ningún `db push` a producción sin OK de Sergio y backup previo.
- **Keys:** el `service_role` solo en `directimport/db/.env` local. Verificar `git status` antes de cada commit.

