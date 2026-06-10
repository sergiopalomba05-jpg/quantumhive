import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Producto = {
  id: number; nombre: string; precio_base: number; fotos: string[]; rubro_id: number; sub_filtro_id: number | null
}
type Rubro = { id: number; nombre: string }
type SubFiltro = { id: number; rubro_id: number; parent_id: number | null; nombre: string }
type ProductoRev = { producto_id: number; precio_unitario: number; precio_pack_6: number | null }

export default function MiTienda({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [rev, setRev] = useState<any>(null)
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [todosSf, setTodosSf] = useState<SubFiltro[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [misProds, setMisProds] = useState<Record<number, ProductoRev>>({})
  const [rubroActivo, setRubroActivo] = useState<number | null>(null)
  const [ruta, setRuta] = useState<{ id: number | null; nombre: string }[]>([])
  const [editando, setEditando] = useState(false)
  const [soloMios, setSoloMios] = useState(false)
  const [msg, setMsg] = useState('')
  const [personalizando, setPersonalizando] = useState(false)
  const [pNombre, setPNombre] = useState('')
  const [pColores, setPColores] = useState({ primario: '#d4a843', fondo: '#0a0a0a', texto: '#ffffff' })
  const [pLogo, setPLogo] = useState('')
  const [guardandoP, setGuardandoP] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('revendedores').select('*').eq('user_id', userId).single(),
      supabase.from('rubros').select('*').eq('activo', true).order('orden'),
      supabase.from('productos').select('*').eq('activo', true).eq('estado_stock', true),
    ]).then(([{ data: r }, { data: rub }, { data: prods }]) => {
      setRev(r)
      if (r) {
        setPNombre(r.nombre_negocio ?? '')
        const c = r.colores
          ? (typeof r.colores === 'string' ? JSON.parse(r.colores) : r.colores)
          : { primario: '#d4a843', fondo: '#0a0a0a', texto: '#ffffff' }
        setPColores(c)
        setPLogo(r.logo_url ?? '')
      }
      setRubros(rub ?? [])
      setProductos(prods ?? [])
      if (r) {
        supabase.from('productos_revendedor').select('*').eq('revendedor_id', r.id).then(({ data }) => {
          const m: Record<number, ProductoRev> = {}
          ;(data ?? []).forEach((p: any) => { m[p.producto_id] = p })
          setMisProds(m)
        })
      }
      if (rub && rub.length > 0) {
        setRubroActivo(rub[0].id)
        setRuta([{ id: rub[0].id, nombre: rub[0].nombre }])
      }
    })
  }, [userId])

  useEffect(() => {
    if (!rubroActivo) return
    supabase.from('sub_filtros').select('*').eq('rubro_id', rubroActivo).eq('activo', true).order('orden').then(({ data }) => {
      setTodosSf(data ?? [])
    })
  }, [rubroActivo])

  const agregarProducto = async (p: Producto) => {
    if (!rev) return
    const { error } = await supabase.from('productos_revendedor').insert({
      revendedor_id: rev.id, producto_id: p.id, precio_unitario: p.precio_base, activo: true,
    })
    if (!error) {
      setMisProds(prev => ({ ...prev, [p.id]: { producto_id: p.id, precio_unitario: p.precio_base, precio_pack_6: null } }))
      setMsg('Agregado a tu tienda')
    } else { setMsg('Error: ' + error.message) }
    setTimeout(() => setMsg(''), 2000)
  }

  const quitarProducto = async (prodId: number) => {
    if (!rev) return
    await supabase.from('productos_revendedor').delete().eq('revendedor_id', rev.id).eq('producto_id', prodId)
    setMisProds(prev => { const n = { ...prev }; delete n[prodId]; return n })
    setMsg('Quitado de tu tienda')
    setTimeout(() => setMsg(''), 2000)
  }

  const actualizarPrecio = async (prodId: number, campo: 'precio_unitario' | 'precio_pack_6', valor: number) => {
    if (!rev) return
    const act = { [campo]: valor }
    await supabase.from('productos_revendedor').update(act).eq('revendedor_id', rev.id).eq('producto_id', prodId)
    setMisProds(prev => ({
      ...prev,
      [prodId]: { ...prev[prodId], [campo]: valor }
    }))
  }

  const aplicarColores = (c: { primario: string; fondo: string; texto: string }) => {
    document.documentElement.style.setProperty('--color-accent', c.primario)
    document.documentElement.style.setProperty('--color-bg', c.fondo)
    document.documentElement.style.setProperty('--color-text', c.texto)
  }

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

  if (!rev) return <div className="loading">Cargando...</div>

  const hijosDe = (parentId: number | null) => todosSf.filter((sf) => sf.parent_id == parentId)
  const ultimoNivel = ruta.length > 0 ? ruta[ruta.length - 1] : null
  const esNodoRaiz = ruta.length === 1
  const opciones = esNodoRaiz ? hijosDe(null) : ultimoNivel ? hijosDe(ultimoNivel.id) : []

  const obtenerIdsHijos = (id: number): number[] => {
    const hijos = todosSf.filter((sf) => sf.parent_id === id)
    return [id, ...hijos.flatMap((h) => obtenerIdsHijos(h.id))]
  }

  const seleccionar = (id: number | null, nombre: string) => {
    const nuevoIdx = ruta.findIndex((r) => r.id === id)
    if (nuevoIdx >= 0) { setRuta(ruta.slice(0, nuevoIdx + 1)) }
    else { setRuta([...ruta, { id, nombre }]) }
  }

  const navegarRubro = (id: number) => {
    setRubroActivo(id)
    setRuta([{ id, nombre: rubros.find((r) => r.id === id)?.nombre ?? '' }])
  }

  const subFiltroFiltro = ruta.length > 1 ? ruta[ruta.length - 1].id : null
  const idsFiltro = subFiltroFiltro ? obtenerIdsHijos(subFiltroFiltro) : null

  let productosFiltrados = rubroActivo
    ? productos.filter((p) => p.rubro_id === rubroActivo)
        .filter((p) => !idsFiltro || (p.sub_filtro_id && idsFiltro.includes(p.sub_filtro_id)))
    : []

  if (soloMios) {
    productosFiltrados = productosFiltrados.filter(p => misProds[p.id])
  }

  const linkTienda = `${window.location.origin}?r=${rev.codigo_unico}`

  return (
    <div className="app">
      <div className="header-between">
        <button className="btn-back" onClick={onBack}>← Volver</button>
        <h1 className="logo">Mi Tienda</h1>
        <div />
      </div>

      {msg && <div className="toast">{msg}</div>}

      <div className="tienda-bar">
        <div className="tienda-bar-top">
          <span className="tienda-nombre-sm">{rev.nombre_negocio}</span>
          <div className="tienda-bar-actions">
            {rev.plan_id >= 2 && (
              <>
                <button className={`btn-sm ${editando ? 'btn-sm-active' : ''}`} onClick={() => setEditando(!editando)}>
                  {editando ? 'Listo' : 'Editar precios'}
                </button>
                <button className={`btn-sm ${soloMios ? 'btn-sm-active' : ''}`} onClick={() => setSoloMios(!soloMios)}>
                  {soloMios ? 'Todo el catálogo' : 'Solo mi tienda'}
                </button>
                <button
                  className={`btn-sm ${personalizando ? 'btn-sm-active' : ''}`}
                  onClick={() => setPersonalizando(!personalizando)}
                >
                  {personalizando ? 'Cerrar' : 'Personalizar'}
                </button>
              </>
            )}
          </div>
        </div>
        {rev.plan_id >= 2 && (
          <div className="tienda-link-bar">
            <span className="link-label">Link:</span>
            <input type="text" readOnly value={linkTienda} onClick={e => (e.target as HTMLInputElement).select()} />
            <button className="btn-sm" onClick={() => { navigator.clipboard.writeText(linkTienda); setMsg('Link copiado!'); setTimeout(() => setMsg(''), 2000) }}>Copiar</button>
          </div>
        )}
      </div>

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

      <section className="rubros-nav">
        {rubros.map((r) => (
          <button key={r.id} onClick={() => navegarRubro(r.id)} className={`rubro-btn ${rubroActivo === r.id ? 'active' : ''}`}>
            {r.nombre}
          </button>
        ))}
      </section>

      {ruta.length > 1 && (
        <section className="breadcrumb">
          {ruta.map((n, i) => (
            <span key={i}>
              {i > 0 && <span className="breadcrumb-sep"> &gt; </span>}
              <button className="breadcrumb-link" onClick={() => seleccionar(n.id, n.nombre)}>{n.nombre}</button>
            </span>
          ))}
        </section>
      )}

      {opciones.length > 0 && (
        <section className="subfiltros-nav">
          {ruta.length > 1 && (
            <button onClick={() => seleccionar(ruta[ruta.length - 2].id, ruta[ruta.length - 2].nombre)} className="subfiltro-btn">← Volver</button>
          )}
          {opciones.map((sf) => (
            <button key={sf.id} onClick={() => seleccionar(sf.id, sf.nombre)}
              className={`subfiltro-btn ${ruta[ruta.length - 1]?.id === sf.id ? 'active' : ''}`}>
              {sf.nombre}
            </button>
          ))}
        </section>
      )}

      <main className="catalogo">
        <div className="productos-grid">
          {productosFiltrados.map(p => {
            const enMiTienda = misProds[p.id]
            return (
              <div key={p.id} className={`producto-card ${enMiTienda ? 'producto-en-tienda' : ''}`}>
                <div className="producto-img">
                  {p.fotos?.[0] ? <img src={p.fotos[0]} alt={p.nombre} /> : <div className="producto-placeholder">📦</div>}
                </div>
                <div className="producto-info">
                  <h3 className="producto-nombre">{p.nombre}</h3>
                  <p className="producto-precio">Mayorista: ${Number(p.precio_base).toLocaleString('es-AR')}</p>
                  {editando && (
                    <div className="precios-edit">
                      {enMiTienda ? (
                        <>
                          <label>Precio unitario <input type="number" className="precio-input-sm"
                            value={enMiTienda.precio_unitario} onChange={e => actualizarPrecio(p.id, 'precio_unitario', parseFloat(e.target.value) || 0)} /></label>
                          <label>Pack x6 <input type="number" className="precio-input-sm"
                            value={enMiTienda.precio_pack_6 ?? ''} placeholder="-"
                            onChange={e => actualizarPrecio(p.id, 'precio_pack_6', e.target.value ? parseFloat(e.target.value) || 0 : null as any)} /></label>
                          <button className="btn-remove-prod" onClick={() => quitarProducto(p.id)}>Quitar</button>
                        </>
                      ) : (
                        <button className="btn-add-prod" onClick={() => agregarProducto(p)}>Agregar a mi tienda</button>
                      )}
                    </div>
                  )}
                  {!editando && enMiTienda && (
                    <p className="producto-tu-precio">Tu precio: ${Number(enMiTienda.precio_unitario).toLocaleString('es-AR')}</p>
                  )}
                </div>
              </div>
            )
          })}
          {productosFiltrados.length === 0 && <p className="empty">No hay productos</p>}
        </div>
      </main>
    </div>
  )
}
