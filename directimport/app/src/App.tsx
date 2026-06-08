import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

type Rubro = { id: number; nombre: string; metrica_configurable: string }
type Producto = {
  id: number; nombre: string; precio_base: number; metrica_valor: number
  estado_stock: boolean; fotos: string[]; descripcion: string
  rubro_id: number; sub_filtro_id: number | null
}

function App() {
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [rubroActivo, setRubroActivo] = useState<number | null>(null)
  const [subFiltroActivo, setSubFiltroActivo] = useState<string>('todo')
  const [subFiltros, setSubFiltros] = useState<any[]>([])

  useEffect(() => {
    supabase.from('rubros').select('*').eq('activo', true).order('orden').then(({ data }) => {
      setRubros(data ?? [])
      if (data && data.length > 0) setRubroActivo(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!rubroActivo) return
    supabase.from('productos').select('*').eq('rubro_id', rubroActivo).eq('activo', true).eq('estado_stock', true).then(({ data }) => setProductos(data ?? []))
    supabase.from('sub_filtros').select('*').eq('rubro_id', rubroActivo).eq('activo', true).order('orden').then(({ data }) => setSubFiltros(data ?? []))
    setSubFiltroActivo('todo')
  }, [rubroActivo])

  const rubroActual = rubros.find((r) => r.id === rubroActivo)
  const productosFiltrados = subFiltroActivo === 'todo'
    ? productos
    : productos.filter((p) => p.sub_filtro_id === parseInt(subFiltroActivo))

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">Directimport</h1>
      </header>

      <section className="rubros-nav">
        {rubros.map((r) => (
          <button
            key={r.id}
            onClick={() => setRubroActivo(r.id)}
            className={`rubro-btn ${rubroActivo === r.id ? 'active' : ''}`}
          >
            {r.nombre}
          </button>
        ))}
      </section>

      {subFiltros.length > 0 && (
        <section className="subfiltros-nav">
          <button
            onClick={() => setSubFiltroActivo('todo')}
            className={`subfiltro-btn ${subFiltroActivo === 'todo' ? 'active' : ''}`}
          >
            Todo
          </button>
          {subFiltros.map((sf) => (
            <button
              key={sf.id}
              onClick={() => setSubFiltroActivo(String(sf.id))}
              className={`subfiltro-btn ${subFiltroActivo === String(sf.id) ? 'active' : ''}`}
            >
              {sf.nombre}
            </button>
          ))}
        </section>
      )}

      <main className="catalogo">
        {rubroActual && (
          <div className="metrica-header">
            <span className="metrica-label">{rubroActual.metrica_configurable}</span>
            <div className="metrica-bar-bg">
              <div className="metrica-bar" style={{ width: '70%' }} />
            </div>
          </div>
        )}

        <div className="productos-grid">
          {productosFiltrados.map((p) => (
            <div key={p.id} className="producto-card">
              <div className="producto-img">
                {p.fotos && p.fotos.length > 0 ? (
                  <img src={p.fotos[0]} alt={p.nombre} />
                ) : (
                  <div className="producto-placeholder">📦</div>
                )}
              </div>
              <div className="producto-info">
                <h3 className="producto-nombre">{p.nombre}</h3>
                <p className="producto-precio">${Number(p.precio_base).toLocaleString('es-AR')}</p>
                <div className="producto-metrica">
                  <div className="metrica-bar-bg small">
                    <div className="metrica-bar" style={{ width: `${p.metrica_valor}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {productosFiltrados.length === 0 && (
            <p className="empty">No hay productos en esta categoría</p>
          )}
        </div>
      </main>

      <nav className="bottom-nav">
        <button className="nav-item active">Catálogo</button>
        <button className="nav-item">Ofertas</button>
        <button className="nav-item">Mis pedidos</button>
        <button className="nav-item">Perfil</button>
      </nav>
    </div>
  )
}

export default App
