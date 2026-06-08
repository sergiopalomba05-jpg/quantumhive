import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

type Producto = {
  id: number; nombre: string; precio_base: number; fotos: string[]
}
type Revendedor = {
  id: number; codigo_unico: string; nombre_negocio: string
  logo_url: string | null; colores: any; whatsapp: string | null
  plan_id: number
}

const PLANES = [
  { id: 1, nombre: 'Basico', desc: 'Compra mayorista sin tienda propia', precio: 'Gratis' },
  { id: 2, nombre: 'Pro', desc: 'Fija tus precios + link de tienda', precio: 'Proximamente' },
  { id: 3, nombre: 'Premium', desc: 'Tienda personalizada con colores y marca', precio: 'Proximamente' },
]

export default function MiTienda({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [rev, setRev] = useState<Revendedor | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [precios, setPrecios] = useState<Record<number, number>>({})
  const [editando, setEditando] = useState<'precios' | 'personalizar' | null>(null)
  const [nombreNeg, setNombreNeg] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('revendedores').select('*').eq('user_id', userId).single(),
      supabase.from('productos').select('id, nombre, precio_base, fotos').eq('activo', true).eq('estado_stock', true).order('nombre'),
    ]).then(([{ data: r }, { data: prods }]) => {
      setRev(r)
      setProductos(prods ?? [])
      setNombreNeg(r?.nombre_negocio || '')
      setWhatsapp(r?.whatsapp || '')
      if (r && r.plan_id >= 2) {
        supabase.from('precios_revendedor').select('*').eq('revendedor_id', r.id).then(({ data: pre }) => {
          const preMap: Record<number, number> = {}
          ;(pre ?? []).forEach((p: any) => { preMap[p.producto_id] = p.precio })
          setPrecios(preMap)
        })
      }
    })
  }, [userId])

  const cambiarPlan = async (planId: number) => {
    setGuardando(true)
    const { error } = await supabase.from('revendedores').update({ plan_id: planId }).eq('user_id', userId)
    setGuardando(false)
    if (error) { setMsg('Error: ' + error.message) } else {
      setMsg('Plan actualizado a ' + PLANES[planId - 1].nombre)
      setRev(prev => prev ? { ...prev, plan_id: planId } : prev)
      setTimeout(() => setMsg(''), 2000)
    }
  }

  const guardarPrecios = async () => {
    setGuardando(true)
    const inserts = Object.entries(precios).map(([prodId, precio]) => ({
      revendedor_id: rev!.id,
      producto_id: parseInt(prodId),
      precio,
    }))
    const { error } = await supabase.from('precios_revendedor').upsert(inserts, { onConflict: 'revendedor_id,producto_id' })
    setGuardando(false)
    if (error) { setMsg('Error: ' + error.message) } else { setMsg('Precios guardados'); setEditando(null); setTimeout(() => setMsg(''), 2000) }
  }

  const guardarPersonalizar = async () => {
    setGuardando(true)
    const { error } = await supabase.from('revendedores').update({ nombre_negocio: nombreNeg, whatsapp }).eq('user_id', userId)
    setGuardando(false)
    if (error) { setMsg('Error: ' + error.message) } else { setMsg('Guardado'); setEditando(null); setTimeout(() => setMsg(''), 2000) }
  }

  const actualizarColor = async (campo: string, valor: string) => {
    const c = { ...(typeof rev?.colores === 'object' ? rev.colores : {}), [campo]: valor }
    await supabase.from('revendedores').update({ colores: c }).eq('user_id', userId)
    setRev(prev => prev ? { ...prev, colores: c } : prev)
    setMsg('Color actualizado')
    setTimeout(() => setMsg(''), 2000)
  }

  if (!rev) return <div className="loading">Cargando...</div>

  const linkTienda = `${window.location.origin}?r=${rev.codigo_unico}`

  return (
    <div className="app">
      <div className="header-between">
        <button className="btn-back" onClick={onBack}>Atras</button>
        <h1 className="logo">Mi Tienda</h1>
        <div />
      </div>

      {msg && <div className="toast">{msg}</div>}

      <div className="tienda-info">
        <p className="tienda-nombre">{rev.nombre_negocio}</p>
        <p style={{ fontSize: 12, color: '#888' }}>
          Plan actual: {PLANES[(rev.plan_id || 1) - 1].nombre} &mdash; {PLANES[(rev.plan_id || 1) - 1].desc}
        </p>
      </div>

      <div className="planes-list">
        {PLANES.map(p => {
          const activo = rev.plan_id === p.id
          const bloqueado = p.id > rev.plan_id
          return (
            <div key={p.id} className={`plan-card ${activo ? 'plan-activo' : ''}`}>
              <div className="plan-header">
                <strong>{p.nombre}</strong>
                <span className="plan-precio">{p.precio}</span>
              </div>
              <p className="plan-desc">{p.desc}</p>
              <ul className="plan-features">
                <li>{p.id >= 1 ? 'Catalogo mayorista' : ''}</li>
                {p.id >= 2 && <li>Link de tienda propio</li>}
                {p.id >= 2 && <li>Precios personalizados</li>}
                {p.id >= 3 && <li>Colores y personalizacion</li>}
              </ul>
              {!activo && (
                <button className="btn-small plan-upgrade-btn" onClick={() => cambiarPlan(p.id)} disabled={guardando}>
                  {bloqueado ? 'Activar' : 'Degradar'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {rev.plan_id >= 2 && (
        <div className="tienda-link">
          <span>Link de tu tienda:</span>
          <input type="text" readOnly value={linkTienda} onClick={e => (e.target as HTMLInputElement).select()} />
          <button className="btn-small" onClick={() => { navigator.clipboard.writeText(linkTienda); setMsg('Link copiado!'); setTimeout(() => setMsg(''), 2000) }}>Copiar</button>
        </div>
      )}

      {rev.plan_id >= 2 && (
        <div className="tienda-actions">
          <button className="tienda-btn" onClick={() => setEditando(editando === 'precios' ? null : 'precios')}>
            {editando === 'precios' ? 'Cerrar precios' : 'Fijar mis precios'}
          </button>
          <button className="tienda-btn" onClick={() => setEditando(editando === 'personalizar' ? null : 'personalizar')}>
            {editando === 'personalizar' ? 'Cerrar' : rev.plan_id >= 3 ? 'Personalizar colores y datos' : 'Editar nombre y WhatsApp'}
          </button>
        </div>
      )}

      {editando === 'precios' && rev.plan_id >= 2 && (
        <div className="precios-editor">
          <h3>Precios por producto</h3>
          {productos.map(p => (
            <div key={p.id} className="precio-row">
              <span className="precio-nombre">{p.nombre}</span>
              <span className="precio-base">Base: ${p.precio_base}</span>
              <input
                type="number" className="precio-input"
                value={precios[p.id] ?? p.precio_base}
                onChange={e => setPrecios({ ...precios, [p.id]: parseFloat(e.target.value) || 0 })}
              />
            </div>
          ))}
          <button className="btn-primary" onClick={guardarPrecios} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar precios'}
          </button>
        </div>
      )}

      {editando === 'personalizar' && (
        <div className="personalizar-editor">
          <h3>Personalizar tienda</h3>
          <label>Nombre del negocio</label>
          <input type="text" value={nombreNeg} onChange={e => setNombreNeg(e.target.value)} />
          <label>WhatsApp</label>
          <input type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
          {rev.plan_id >= 3 && (
            <>
              <label>Color primario (acento)</label>
              <input type="color" value={typeof rev.colores?.primario === 'string' ? rev.colores.primario : '#d4a843'} onChange={e => actualizarColor('primario', e.target.value)} />
              <label>Color de fondo</label>
              <input type="color" value={typeof rev.colores?.fondo === 'string' ? rev.colores.fondo : '#0a0a0a'} onChange={e => actualizarColor('fondo', e.target.value)} />
              <label>Color de texto</label>
              <input type="color" value={typeof rev.colores?.texto === 'string' ? rev.colores.texto : '#ffffff'} onChange={e => actualizarColor('texto', e.target.value)} />
            </>
          )}
          <button className="btn-primary" onClick={guardarPersonalizar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  )
}
