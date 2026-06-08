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
      supabase.from('precios_revendedor').select('*').eq('revendedor_id', userId),
    ]).then(([{ data: r }, { data: prods }, { data: pre }]) => {
      setRev(r)
      setProductos(prods ?? [])
      setNombreNeg(r?.nombre_negocio || '')
      setWhatsapp(r?.whatsapp || '')
      const preMap: Record<number, number> = {}
      ;(pre ?? []).forEach((p: any) => { preMap[p.producto_id] = p.precio })
      setPrecios(preMap)
    })
  }, [userId])

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

  if (!rev) return <div className="loading">Cargando...</div>

  const linkTienda = `${window.location.origin}?r=${rev.codigo_unico}`
  const puedeEditarPrecios = rev.plan_id >= 2

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
        <div className="tienda-link">
          <span>Link de tu tienda:</span>
          <input type="text" readOnly value={linkTienda} onClick={e => (e.target as HTMLInputElement).select()} />
          <button className="btn-small" onClick={() => { navigator.clipboard.writeText(linkTienda); setMsg('Link copiado!'); setTimeout(() => setMsg(''), 2000) }}>Copiar</button>
        </div>
      </div>

      <div className="tienda-actions">
        <button className="tienda-btn" onClick={() => setEditando('precios')}>
          {puedeEditarPrecios ? 'Fijar mis precios' : 'Plan Basico (sin edicion de precios)'}
        </button>
        <button className="tienda-btn" onClick={() => setEditando('personalizar')}>
          Personalizar tienda
        </button>
      </div>

      {editando === 'precios' && puedeEditarPrecios && (
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
          <button className="btn-primary" onClick={guardarPersonalizar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}
    </div>
  )
}
