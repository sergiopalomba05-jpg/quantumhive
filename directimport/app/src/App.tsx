import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

type Rubro = { id: number; nombre: string }
type SubFiltro = { id: number; rubro_id: number; parent_id: number | null; nombre: string }
type Producto = {
  id: number; nombre: string; precio_base: number
  metricas: { nombre: string; valor: number }[]
  estado_stock: boolean; fotos: string[]; descripcion: string
  rubro_id: number; sub_filtro_id: number | null
}

function App() {
  const [rubros, setRubros] = useState<Rubro[]>([])
  const [todosSf, setTodosSf] = useState<SubFiltro[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [rubroActivo, setRubroActivo] = useState<number | null>(null)
  const [ruta, setRuta] = useState<{ id: number | null; nombre: string }[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('rubros').select('*').eq('activo', true).order('orden'),
      supabase.from('productos').select('*').eq('activo', true).eq('estado_stock', true),
    ]).then(([{ data: r }, { data: p }]) => {
      setRubros(r ?? [])
      setProductos(p ?? [])
      if (r && r.length > 0) {
        setRubroActivo(r[0].id)
        setRuta([{ id: r[0].id, nombre: r[0].nombre }])
      }
    })
  }, [])

  useEffect(() => {
    if (!rubroActivo) return
    supabase.from('sub_filtros').select('*').eq('rubro_id', rubroActivo).eq('activo', true).order('orden').then(({ data }) => {
      setTodosSf(data ?? [])
    })
  }, [rubroActivo])

  const hijosDe = (parentId: number | null) =>
    todosSf.filter((sf) => sf.parent_id == parentId)

  const ultimoNivel = ruta.length > 0 ? ruta[ruta.length - 1] : null
  const esNodoRaiz = ruta.length === 1
  const opciones = esNodoRaiz
    ? hijosDe(null)
    : ultimoNivel ? hijosDe(ultimoNivel.id) : []

  const obtenerIdsHijos = (id: number): number[] => {
    const hijos = todosSf.filter((sf) => sf.parent_id === id)
    return [id, ...hijos.flatMap((h) => obtenerIdsHijos(h.id))]
  }

  const seleccionar = (id: number | null, nombre: string) => {
    const nuevoIdx = ruta.findIndex((r) => r.id === id)
    if (nuevoIdx >= 0) {
      setRuta(ruta.slice(0, nuevoIdx + 1))
    } else {
      setRuta([...ruta, { id, nombre }])
    }
  }

  const navegarRubro = (id: number) => {
    setRubroActivo(id)
    setRuta([{ id, nombre: rubros.find((r) => r.id === id)?.nombre ?? '' }])
  }

  const subFiltroFiltro = ruta.length > 1 ? ruta[ruta.length - 1].id : null

  const idsFiltro = subFiltroFiltro ? obtenerIdsHijos(subFiltroFiltro) : null
  const productosFiltrados = rubroActivo
    ? productos.filter((p) => p.rubro_id === rubroActivo)
        .filter((p) => !idsFiltro || (p.sub_filtro_id && idsFiltro.includes(p.sub_filtro_id)))
    : []

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">Directimport</h1>
      </header>

      <section className="rubros-nav">
        {rubros.map((r) => (
          <button
            key={r.id}
            onClick={() => navegarRubro(r.id)}
            className={`rubro-btn ${rubroActivo === r.id ? 'active' : ''}`}
          >
            {r.nombre}
          </button>
        ))}
      </section>

      {ruta.length > 1 && (
        <section className="breadcrumb">
          {ruta.map((n, i) => (
            <span key={i}>
              {i > 0 && <span className="breadcrumb-sep"> &gt; </span>}
              <button className="breadcrumb-link" onClick={() => seleccionar(n.id, n.nombre)}>
                {n.nombre}
              </button>
            </span>
          ))}
        </section>
      )}

      {opciones.length > 0 && (
        <section className="subfiltros-nav">
          {ruta.length > 1 && (
            <button
              onClick={() => seleccionar(ruta[ruta.length - 2].id, ruta[ruta.length - 2].nombre)}
              className="subfiltro-btn"
            >
              ← Volver
            </button>
          )}
          {opciones.map((sf) => (
            <button
              key={sf.id}
              onClick={() => seleccionar(sf.id, sf.nombre)}
              className={`subfiltro-btn ${ruta[ruta.length - 1]?.id === sf.id ? 'active' : ''}`}
            >
              {sf.nombre}
            </button>
          ))}
        </section>
      )}

      <main className="catalogo">
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
                {p.metricas && p.metricas.length > 0 && (
                  <div className="producto-metricas">
                    {p.metricas.map((m, i) => (
                      <div key={i} className="metrica-row">
                        <span className="metrica-label">{m.nombre}</span>
                        <div className="metrica-bar-bg small">
                          <div className="metrica-bar" style={{ width: `${m.valor}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
