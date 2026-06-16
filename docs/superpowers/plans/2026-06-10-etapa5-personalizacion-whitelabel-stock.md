# Etapa 5 — Personalización + White-label + Agente de Stock + Métrica por Rubro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Darle al revendedor control visual de su tienda (colores, logo, nombre), ocultar la marca Directimport en Pro Plus (white-label), habilitar el toggle rápido de stock en el admin, y cerrar la métrica configurable por rubro.

**Architecture:** 4 features independientes sobre el stack existente. Una sola migración SQL (`rubros.metrica_nombre`). El theming usa CSS custom properties ya seteadas en `App.tsx` línea 108-113 — solo falta que `App.css` las use. Sin nuevas dependencias.

**Tech Stack:** React + Vite (app en `directimport/app`), Next.js App Router (admin en `directimport/admin`), Supabase (DB + Auth), TypeScript, CSS custom properties para theming en vivo.

---

## Mapa de archivos

| Archivo | Operación | Qué cambia |
|---|---|---|
| `directimport/_archivo_sql/migracion-etapa5.sql` | Crear | `ALTER TABLE rubros ADD COLUMN metrica_nombre` |
| `directimport/admin/src/app/dashboard/productos/page.tsx` | Modificar | Quick toggle de stock en la lista |
| `directimport/admin/src/app/dashboard/rubros/page.tsx` | Modificar | Campo `metrica_nombre` editable por rubro |
| `directimport/admin/src/components/ProductoForm.tsx` | Modificar | Hint de métrica cuando se elige rubro |
| `directimport/app/src/App.css` | Modificar | `:root` vars + replace `#d4a843` + `.powered-by` + `.header-logo` |
| `directimport/app/src/App.tsx` | Modificar | Logo del revendedor + badge "Powered by Directimport" |
| `directimport/app/src/MiTienda.tsx` | Modificar | Panel de personalización (colores/logo/nombre) |

---

## Task 1: SQL — agregar `metrica_nombre` a rubros

**Files:**
- Create: `directimport/_archivo_sql/migracion-etapa5.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- Etapa 5: métrica configurable por rubro
ALTER TABLE rubros ADD COLUMN IF NOT EXISTS metrica_nombre text;
```

- [ ] **Step 2: Ejecutar en Supabase SQL Editor**

Abrir Supabase → SQL Editor → pegar y ejecutar.
Resultado esperado: `ALTER TABLE` sin errores.

- [ ] **Step 3: Verificar**

En Supabase → Table Editor → tabla `rubros` → confirmar que existe la columna `metrica_nombre` (nullable, tipo text).

- [ ] **Step 4: Commit**

```bash
git add directimport/_archivo_sql/migracion-etapa5.sql
git commit -m "feat(db): agregar metrica_nombre a rubros (Etapa 5)"
```

---

## Task 2: Admin — quick stock toggle en lista de productos

**Files:**
- Modify: `directimport/admin/src/app/dashboard/productos/page.tsx`

El cambio es solo en la columna Stock de la tabla: convertir el `<span>` estático en un `<button>` que hace UPDATE y actualiza el estado local sin recargar la página.

- [ ] **Step 1: Verificar que NO existe el toggle**

Abrir `http://localhost:3000/dashboard/productos` y confirmar que el estado de stock (Disponible / Sin stock) es solo texto, sin botón.

- [ ] **Step 2: Agregar la función `toggleStock` y cambiar la celda**

En `directimport/admin/src/app/dashboard/productos/page.tsx`, después de la función `borrar` (línea 31), agregar:

```ts
const toggleStock = async (id: number, actual: boolean) => {
  await supabase.from('productos').update({ estado_stock: !actual }).eq('id', id)
  setProductos(prev => prev.map(p => p.id === id ? { ...p, estado_stock: !actual } : p))
}
```

Y en la celda de stock (línea 79), reemplazar el `<td>` completo:

```diff
- <td className="px-4 py-3">
-   <span className={`px-2 py-0.5 rounded text-xs ${p.estado_stock ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
-     {p.estado_stock ? 'Disponible' : 'Sin stock'}
-   </span>
- </td>
+ <td className="px-4 py-3">
+   <button
+     onClick={() => toggleStock(p.id, p.estado_stock)}
+     title="Clic para cambiar"
+     className={`px-2 py-0.5 rounded text-xs cursor-pointer hover:brightness-125 transition-all ${p.estado_stock ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}
+   >
+     {p.estado_stock ? '✓ Disponible' : '✕ Sin stock'}
+   </button>
+ </td>
```

- [ ] **Step 3: Verificar manualmente**

1. Abrir la lista de productos en el admin.
2. Hacer clic en el estado de un producto — debe cambiar de `✓ Disponible` a `✕ Sin stock` (o viceversa) sin recargar la página.
3. Recargar la página — el estado debe persistir.
4. Abrir la app del comprador — el producto sin stock no debe aparecer en el catálogo.

- [ ] **Step 4: Commit**

```bash
git add directimport/admin/src/app/dashboard/productos/page.tsx
git commit -m "feat(admin): toggle rapido de stock en lista de productos (Etapa 5)"
```

---

## Task 3: Admin — métrica configurable por rubro + hint en ProductoForm

**Files:**
- Modify: `directimport/admin/src/app/dashboard/rubros/page.tsx`
- Modify: `directimport/admin/src/components/ProductoForm.tsx`

### 3a — Editar `metrica_nombre` en la página de rubros

El componente `NodoRubro` ya tiene un `expanded` state. Cuando `nivel === 0` (es un rubro raíz, no un sub-filtro), agregar un campo para editar `metrica_nombre`.

- [ ] **Step 1: Agregar estado y lógica en `NodoRubro`**

En `directimport/admin/src/app/dashboard/rubros/page.tsx`, dentro de la función `NodoRubro`, agregar después de `const [nuevoNombre, setNuevoNombre] = useState('')`:

```ts
const [metricaNombre, setMetricaNombre] = useState<string>(rubro.metrica_nombre ?? '')

const guardarMetrica = async () => {
  await supabase.from('rubros').update({ metrica_nombre: metricaNombre.trim() || null }).eq('id', rubro.id)
  onRefresh()
}
```

- [ ] **Step 2: Agregar el campo de métrica en el panel expandido (solo para rubros raíz)**

En el bloque `{expanded && ...}` de `NodoRubro`, agregar ANTES del input de sub-filtro, con la condición `{esRubro && ...}`:

```tsx
{esRubro && (
  <div className="mb-4 pb-4 border-b border-[#2a2d33]">
    <label className="block text-xs text-[#a0a0a8] mb-1">
      Métrica del rubro (ej: Comodidad, Potencia, Durabilidad)
    </label>
    <div className="flex gap-2">
      <input
        value={metricaNombre}
        onChange={(e) => setMetricaNombre(e.target.value)}
        placeholder="Nombre de la métrica..."
        className="flex-1 bg-[#0a0a0a] border border-[#2a2d33] rounded px-2 py-1.5 text-white text-sm focus:border-[#d4a843] focus:outline-none"
      />
      <button
        onClick={guardarMetrica}
        className="bg-[#d4a843] text-black px-3 py-1.5 rounded text-sm font-semibold hover:brightness-110"
      >
        Guardar
      </button>
    </div>
    {rubro.metrica_nombre && (
      <p className="text-xs text-[#d4a843] mt-1">Actual: {rubro.metrica_nombre}</p>
    )}
  </div>
)}
```

### 3b — Hint de métrica en ProductoForm

Cuando el admin elige un rubro al crear/editar un producto, mostrar el nombre de métrica configurado como hint al agregar métricas.

- [ ] **Step 3: Agregar estado `rubroMetrica` en `ProductoForm`**

En `directimport/admin/src/components/ProductoForm.tsx`, después de `const [metricas, setMetricas] = useState<Metrica[]>([])`, agregar:

```ts
const [rubroMetrica, setRubroMetrica] = useState<string | null>(null)
```

- [ ] **Step 4: Cargar `metrica_nombre` al cambiar rubro**

En la función `handleRubroChange`, al final (después de la llamada a `supabase.from('sub_filtros')`), agregar:

```ts
supabase.from('rubros').select('metrica_nombre').eq('id', rubroId).single().then(({ data }) => {
  setRubroMetrica(data?.metrica_nombre ?? null)
})
```

Nota: `handleRubroChange` ya hace un fetch de sub_filtros. El fetch de métrica es paralelo, no encadenado.

- [ ] **Step 5: Mostrar el hint en la sección de métricas**

En el bloque de métricas de `ProductoForm.tsx` (justo antes del `{metricas.length === 0 && ...}`, línea ~345), agregar:

```tsx
{rubroMetrica && metricas.length === 0 && (
  <p className="text-xs text-[#d4a843] mb-2">
    Métrica sugerida para este rubro: <strong>{rubroMetrica}</strong>
  </p>
)}
```

- [ ] **Step 6: Verificar manualmente**

1. Ir a Admin → Rubros → expandir un rubro → configurar métrica (ej: "Zapatillas" → "Comodidad") → Guardar.
2. Ir a Admin → Productos → Nuevo producto → elegir el rubro → confirmar que aparece el hint "Métrica sugerida: Comodidad".
3. El hint no aparece si el rubro no tiene métrica configurada.

- [ ] **Step 7: Commit**

```bash
git add directimport/admin/src/app/dashboard/rubros/page.tsx directimport/admin/src/components/ProductoForm.tsx
git commit -m "feat(admin): metrica configurable por rubro + hint en form de producto (Etapa 5)"
```

---

## Task 4: App — CSS vars + logo de revendedor + badge white-label

**Files:**
- Modify: `directimport/app/src/App.css`
- Modify: `directimport/app/src/App.tsx`

`App.tsx` ya setea `--color-accent`, `--color-bg`, `--color-text` en el DOM cuando carga un `linkRev` (líneas 108-113). El problema: `App.css` usa `#d4a843` hardcodeado y no referencia esas variables. Este task lo corrige.

### 4a — CSS custom properties

- [ ] **Step 1: Agregar `:root` al inicio de `App.css`**

Insertar al inicio del archivo (antes de `* { margin: 0; ... }`):

```css
:root {
  --color-accent: #d4a843;
  --color-bg: #0a0a0a;
  --color-text: #ffffff;
}
```

- [ ] **Step 2: Reemplazar `#d4a843` con `var(--color-accent)` en todo `App.css`**

Usar `replace_all` para reemplazar cada ocurrencia de `#d4a843` por `var(--color-accent)` en todo el archivo.

Excepciones que NO reemplazar: la que acabamos de escribir en `:root { --color-accent: #d4a843; }`.

Variantes con alpha (`#d4a84320`, `#d4a84340`) se dejan hardcodeadas — son decoraciones sutiles que no afectan visualmente la personalización.

- [ ] **Step 3: Agregar estilos nuevos al final de `App.css`**

```css
/* White-label badge */
.powered-by {
  position: fixed;
  bottom: 52px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 9px;
  color: #444;
  white-space: nowrap;
  pointer-events: none;
  z-index: 10;
}

/* Logo del revendedor en header */
.logo-area {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-logo {
  height: 26px;
  width: auto;
  object-fit: contain;
  border-radius: 4px;
}
```

### 4b — Cambios en App.tsx

- [ ] **Step 4: Mostrar logo del revendedor en el header**

En `directimport/app/src/App.tsx`, línea 522, reemplazar:

```tsx
<h1 className="logo">{linkRev?.nombre_negocio || 'Directimport'}</h1>
```

por:

```tsx
<div className="logo-area">
  {linkRev?.logo_url && (
    <img src={linkRev.logo_url} alt={linkRev.nombre_negocio} className="header-logo" />
  )}
  <h1 className="logo">{linkRev?.nombre_negocio || 'Directimport'}</h1>
</div>
```

- [ ] **Step 5: Agregar el badge "Powered by Directimport"**

En `App.tsx`, en el bloque del return principal (el que renderiza el catálogo), justo DESPUÉS de `<nav className="bottom-nav">...</nav>`, agregar:

```tsx
{linkRev && linkRev.plan_id < 3 && (
  <div className="powered-by">Powered by Directimport</div>
)}
```

- [ ] **Step 6: Verificar manualmente**

**Sin linkRev:** abrir la app directamente → no debe verse el badge. Logo muestra "Directimport".

**Con linkRev Pro (plan_id=2):**
1. Abrir `?r=CODIGO_DE_UN_REVENDEDOR_PRO`
2. El header debe mostrar el nombre del negocio del revendedor.
3. Si tiene `logo_url`, debe mostrar la imagen.
4. El badge "Powered by Directimport" debe verse encima de la barra de navegación.

**Con linkRev Pro Plus (plan_id=3):**
1. Abrir `?r=CODIGO_DE_UN_REVENDEDOR_PRO_PLUS`
2. El badge NO debe verse.
3. Los colores del catálogo deben ser los del revendedor (si ya los personalizó en DB).

- [ ] **Step 7: Commit**

```bash
git add directimport/app/src/App.css directimport/app/src/App.tsx
git commit -m "feat(app): CSS vars + logo de revendedor + badge powered-by (Etapa 5)"
```

---

## Task 5: App — Panel de personalización en MiTienda

**Files:**
- Modify: `directimport/app/src/MiTienda.tsx`

El revendedor Pro (plan_id >= 2) puede editar nombre del negocio, colores y logo de su tienda. Los cambios se ven en tiempo real en la misma pantalla (live preview vía CSS vars) y se persisten con Supabase.

La lógica de tipos de `rev` usa `any` actualmente. Los campos que necesitamos (`colores`, `logo_url`, `nombre_negocio`, `plan_id`) ya existen en la tabla `revendedores`.

- [ ] **Step 1: Agregar estados de personalización**

En `MiTienda.tsx`, después de `const [msg, setMsg] = useState('')`, agregar:

```ts
const [personalizando, setPersonalizando] = useState(false)
const [pNombre, setPNombre] = useState('')
const [pColores, setPColores] = useState({ primario: '#d4a843', fondo: '#0a0a0a', texto: '#ffffff' })
const [pLogo, setPLogo] = useState('')
const [guardandoP, setGuardandoP] = useState(false)
```

- [ ] **Step 2: Sincronizar estados cuando carga `rev`**

En el `useEffect` que carga el revendedor (donde se llama a `setRev(r)`), agregar DESPUÉS de `setRev(r)`:

```ts
if (r) {
  setPNombre(r.nombre_negocio ?? '')
  const c = r.colores
    ? (typeof r.colores === 'string' ? JSON.parse(r.colores) : r.colores)
    : { primario: '#d4a843', fondo: '#0a0a0a', texto: '#ffffff' }
  setPColores(c)
  setPLogo(r.logo_url ?? '')
}
```

- [ ] **Step 3: Agregar helper `aplicarColores`**

Agregar esta función antes del `return`:

```ts
const aplicarColores = (c: { primario: string; fondo: string; texto: string }) => {
  document.documentElement.style.setProperty('--color-accent', c.primario)
  document.documentElement.style.setProperty('--color-bg', c.fondo)
  document.documentElement.style.setProperty('--color-text', c.texto)
}
```

- [ ] **Step 4: Agregar función `guardarPersonalizacion`**

```ts
const guardarPersonalizacion = async () => {
  if (!rev) return
  setGuardandoP(true)
  await supabase.from('revendedores').update({
    nombre_negocio: pNombre.trim() || rev.nombre_negocio,
    colores: pColores,
    logo_url: pLogo.trim() || null,
  }).eq('id', rev.id)
  setGuardandoP(false)
  setRev({ ...rev, nombre_negocio: pNombre.trim() || rev.nombre_negocio, colores: pColores, logo_url: pLogo.trim() || null })
  setPersonalizando(false)
  setMsg('Tienda actualizada ✓')
  setTimeout(() => setMsg(''), 2500)
}
```

- [ ] **Step 5: Agregar botón "Personalizar" en la barra de la tienda**

En el bloque `{rev.plan_id >= 2 && (...)}` de `tienda-bar-actions` (donde están "Editar precios" y "Solo mi tienda"), agregar un tercer botón:

```tsx
<button
  className={`btn-sm ${personalizando ? 'btn-sm-active' : ''}`}
  onClick={() => setPersonalizando(!personalizando)}
>
  {personalizando ? 'Cerrar' : 'Personalizar'}
</button>
```

- [ ] **Step 6: Agregar el panel de personalización**

Agregar DESPUÉS de `{msg && <div className="toast">{msg}</div>}` y ANTES de `<section className="rubros-nav">`, con la condición `{personalizando && rev?.plan_id >= 2 && ...}`:

```tsx
{personalizando && rev?.plan_id >= 2 && (
  <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, margin: '0 0 4px' }}>
    <h3 style={{ color: 'var(--color-accent)', marginTop: 0, marginBottom: 14, fontSize: 15 }}>
      Personalizar tienda
    </h3>

    <label style={{ display: 'block', fontSize: 12, color: '#a0a0a8', marginBottom: 4 }}>
      Nombre del negocio
    </label>
    <input
      value={pNombre}
      onChange={(e) => setPNombre(e.target.value)}
      style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 14, marginBottom: 12 }}
    />

    <label style={{ display: 'block', fontSize: 12, color: '#a0a0a8', marginBottom: 4 }}>
      Logo (URL de imagen)
    </label>
    <input
      value={pLogo}
      onChange={(e) => setPLogo(e.target.value)}
      placeholder="https://..."
      style={{ width: '100%', background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 14, marginBottom: 12 }}
    />

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
      {([
        { label: 'Acento', campo: 'primario' as const },
        { label: 'Fondo', campo: 'fondo' as const },
        { label: 'Texto', campo: 'texto' as const },
      ]).map(({ label, campo }) => (
        <div key={campo} style={{ textAlign: 'center' }}>
          <label style={{ display: 'block', fontSize: 11, color: '#a0a0a8', marginBottom: 4 }}>{label}</label>
          <input
            type="color"
            value={pColores[campo]}
            onChange={(e) => {
              const c = { ...pColores, [campo]: e.target.value }
              setPColores(c)
              aplicarColores(c)
            }}
            style={{ width: '100%', height: 36, borderRadius: 6, border: '1px solid #2a2a2a', cursor: 'pointer', padding: 2, background: 'none' }}
          />
          <span style={{ fontSize: 10, color: '#666' }}>{pColores[campo]}</span>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="btn-primary btn-full"
        disabled={guardandoP}
        onClick={guardarPersonalizacion}
      >
        {guardandoP ? 'Guardando...' : 'Guardar cambios'}
      </button>
      <button
        className="btn-sm"
        style={{ padding: '0 16px' }}
        onClick={() => {
          const c = rev.colores
            ? (typeof rev.colores === 'string' ? JSON.parse(rev.colores) : rev.colores)
            : { primario: '#d4a843', fondo: '#0a0a0a', texto: '#ffffff' }
          setPColores(c)
          aplicarColores(c)
          setPNombre(rev.nombre_negocio ?? '')
          setPLogo(rev.logo_url ?? '')
          setPersonalizando(false)
        }}
      >
        Cancelar
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 7: Verificar manualmente**

1. Iniciar sesión como revendedor Pro o Pro Plus.
2. Ir a "Mi Tienda" → confirmar que aparece el botón "Personalizar".
3. Abrir el panel → cambiar el color de acento → confirmar que la página cambia de color en tiempo real.
4. Cambiar el nombre del negocio, poner una URL de logo (ej. una imagen de prueba pública).
5. Hacer clic en "Guardar cambios" → mensaje "Tienda actualizada ✓".
6. Recargar la página → los valores deben persistir.
7. Cerrar sesión y abrir la tienda con el link `?r=CODIGO` → confirmar que el comprador ve los colores y el nombre actualizados.
8. "Cancelar" sin guardar → los colores vuelven a los valores guardados.
9. Revendedor Básico (plan_id=1) → el botón "Personalizar" NO debe aparecer.

- [ ] **Step 8: Commit**

```bash
git add directimport/app/src/MiTienda.tsx
git commit -m "feat(app): personalizacion de tienda (colores, logo, nombre) para Pro/Pro Plus (Etapa 5)"
```

---

## Gate 5 — Checklist de cierre

Antes de dar la etapa por terminada, verificar TODOS estos puntos:

- [ ] **Pro personaliza colores/logo/nombre:** revendedor Pro abre "Personalizar", cambia colores, guarda. El comprador que entra por su link ve esos colores.
- [ ] **Pro Plus sin marca:** revendedor Pro Plus (plan_id=3) → el badge "Powered by Directimport" NO aparece en su tienda.
- [ ] **Pro tiene badge:** revendedor Pro (plan_id=2) → el badge SÍ aparece.
- [ ] **Agente de Stock:** en el admin, toggle de stock en la lista de productos funciona. Un producto marcado como "Sin stock" desaparece del catálogo de la app.
- [ ] **Métrica por rubro:** en Admin → Rubros se puede configurar el nombre de métrica. En el form de producto, al elegir ese rubro aparece el hint.
- [ ] **git push:** `git push` ejecutado. La etapa no existe si no está en GitHub.

```bash
git push
```

---

## Notas de implementación

- **Las variantes con alpha** (`#d4a84320`, `#d4a84340`) en `App.css` quedan hardcodeadas — son bordes decorativos de bajo impacto y no afectan la impresión visual de la personalización.
- **`plan_id >= 3`** como proxy de `permiso_white_label` es correcto para v1 — los planes 3 (Pro Plus) y 4 (Ultra) tienen ese permiso.
- **El logo** usa URL externa en v1 (sin upload a Supabase Storage). Upload de imagen se incorpora en Etapa 8 (pulido visual).
- **La `MiTienda` carga `rev` de forma asíncrona** — el `useEffect` que sincroniza `pNombre/pColores/pLogo` debe estar DENTRO del `.then()` del fetch inicial para evitar race conditions con el `useState` inicial.
