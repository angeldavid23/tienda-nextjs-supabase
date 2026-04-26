'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [productos, setProductos] = useState<any[]>([])
  const [compras, setCompras] = useState<any[]>([])
  const [view, setView] = useState<'inventario' | 'pedidos' | 'analitica'>('inventario')
  const router = useRouter()

  const [editId, setEditId] = useState<number | null>(null)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [stock, setStock] = useState('0')

  // --- CARGA DE DATOS ---
  const fetchData = useCallback(async () => {
    const { data: p } = await supabase.from('productos').select('*').order('id', { ascending: false })
    const { data: c } = await supabase.from('compras').select('*').order('created_at', { ascending: false })
    if (p) setProductos(p)
    if (c) setCompras(c)
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setLoading(false)
        fetchData()
      }
    }
    checkUser()
  }, [router, fetchData])

  // --- LÓGICA DE ANALÍTICA ---
  const stats = useMemo(() => {
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const ventasMes = compras.filter(c => new Date(c.created_at) >= inicioMes)
    
    // Producto más stalkeado (por views)
    const masStalkeado = [...productos].sort((a, b) => (b.views || 0) - (a.views || 0))[0]
    
    return { 
      totalMes: ventasMes.reduce((acc, curr) => acc + curr.total, 0), 
      cantidadMes: ventasMes.length, 
      mesNombre: ahora.toLocaleString('es-GT', { month: 'long' }),
      masStalkeado
    }
  }, [compras, productos])

  // --- ACCIONES ---
  const deletePedido = async (id: number) => {
    if (!confirm("¿Deseas eliminar este registro?")) return
    await supabase.from('compras').delete().eq('id', id)
    fetchData()
  }

  const resetForm = () => {
    setEditId(null); setNombre(''); setPrecio(''); setCategoria(''); setDescripcion(''); setStock('0')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUploading(true)
      let urlsPublicas = editId ? productos.find(p => p.id === editId)?.imagenes || [] : []
      const datosProducto = { nombre, precio: parseFloat(precio), categoria, descripcion, stock: parseInt(stock), imagenes: urlsPublicas }
      
      if (editId) await supabase.from('productos').update(datosProducto).eq('id', editId)
      else await supabase.from('productos').insert([datosProducto])
      
      resetForm()
      fetchData()
    } catch (error: any) { alert(error.message) }
    finally { setUploading(false) }
  }

  if (loading) return <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center font-serif italic text-2xl animate-pulse">Aura Élégance...</div>

  return (
    <div className="min-h-screen bg-[#fdfaf5] p-4 md:p-12 text-black">
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER RESPONSIVO */}
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-sm mb-8 md:mb-12 border border-gray-100">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h1 className="text-xl md:text-3xl font-serif italic tracking-[0.2em] text-center md:text-left uppercase">Panel Administrativo</h1>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] uppercase tracking-widest font-black text-gray-400 border border-gray-100 px-6 py-3 rounded-full hover:bg-gray-50 transition-all">Cerrar Sesión</button>
            </div>
            
            <div className="flex justify-center md:justify-start gap-4 md:gap-10 border-t pt-6">
              <button onClick={() => setView('inventario')} className={`text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold pb-2 border-b-2 transition-all ${view === 'inventario' ? 'border-black' : 'border-transparent text-gray-400'}`}>Inventario</button>
              <button onClick={() => setView('pedidos')} className={`text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold pb-2 border-b-2 transition-all ${view === 'pedidos' ? 'border-black' : 'border-transparent text-gray-400'}`}>Pedidos</button>
              <button onClick={() => setView('analitica')} className={`text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold pb-2 border-b-2 transition-all ${view === 'analitica' ? 'border-black' : 'border-transparent text-gray-400'}`}>Analítica</button>
            </div>
          </div>
        </div>

        {view === 'inventario' && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 md:gap-12">
            {/* FORMULARIO */}
            <div className="xl:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm border border-gray-100 sticky top-12">
                <h2 className="font-serif italic text-2xl md:text-3xl mb-8 border-b pb-4">{editId ? '📝 Editar' : '✨ Nueva Prenda'}</h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Nombre</label>
                    <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-1 ring-black/10" value={nombre} onChange={(e)=>setNombre(e.target.value)} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Precio Q.</label>
                      <input type="number" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" value={precio} onChange={(e)=>setPrecio(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Stock</label>
                      <input type="number" className="w-full p-4 bg-blue-50/50 rounded-2xl font-bold text-blue-600 outline-none" value={stock} onChange={(e)=>setStock(e.target.value)} required />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-2">Categoría</label>
                    <select className="w-full p-4 bg-gray-50 rounded-2xl outline-none appearance-none" value={categoria} onChange={(e)=>setCategoria(e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      <option value="Caballeros">Caballeros</option>
                      <option value="Damas">Damas</option>
                      <option value="Accesorios">Accesorios</option>
                    </select>
                  </div>

                  <button type="submit" disabled={uploading} className="w-full bg-black text-white p-5 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95">
                    {uploading ? 'PROCESANDO...' : editId ? 'GUARDAR CAMBIOS' : 'PUBLICAR PRODUCTO'}
                  </button>
                  {editId && <button type="button" onClick={resetForm} className="w-full text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-2">Cancelar</button>}
                </div>
              </form>
            </div>

            {/* LISTADO DE PRODUCTOS (MÓVIL CARDS / DESKTOP TABLE) */}
            <div className="xl:col-span-3">
              {/* VISTA MÓVIL (Cards) */}
              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {productos.map((p) => (
                  <div key={p.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex gap-5">
                    <img src={p.imagenes[0]} className="w-20 h-28 object-cover rounded-xl shadow-sm" alt="" />
                    <div className="flex flex-col justify-between py-1 flex-1">
                      <div>
                        <h3 className="font-serif text-lg leading-tight">{p.nombre}</h3>
                        <p className="text-gray-500 text-sm italic">Q{p.precio.toFixed(2)}</p>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${p.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                          {p.stock} UNIDADES
                        </span>
                        <div className="flex gap-4">
                          <button onClick={() => {
                             setEditId(p.id); setNombre(p.nombre); setPrecio(p.precio.toString()); 
                             setCategoria(p.categoria); setStock(p.stock.toString());
                             window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} className="text-[10px] font-bold text-blue-500 uppercase">Editar</button>
                          <button onClick={() => { if(confirm("¿Borrar?")) supabase.from('productos').delete().eq('id', p.id).then(() => fetchData()) }} className="text-[10px] font-bold text-red-300 uppercase">Borrar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* VISTA DESKTOP (Table) */}
              <div className="hidden xl:block bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-[10px] uppercase tracking-widest text-gray-400 text-left">
                      <th className="p-10 font-black">Producto</th>
                      <th className="p-10 text-center font-black">Stock</th>
                      <th className="p-10 text-right font-black">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productos.map((p) => (
                      <tr key={p.id} className="group hover:bg-gray-50/30 transition-colors">
                        <td className="p-10">
                          <div className="flex items-center gap-6">
                            <img src={p.imagenes[0]} className="w-16 h-20 object-cover rounded-xl shadow-md" alt="" />
                            <div>
                              <span className="font-serif text-xl block">{p.nombre}</span>
                              <span className="text-sm font-light italic text-gray-500">Q{p.precio.toFixed(2)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-10 text-center">
                          <span className={`px-5 py-2 rounded-full text-[10px] font-black ${p.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                            {p.stock} UNIDADES
                          </span>
                        </td>
                        <td className="p-10 text-right">
                          <div className="flex justify-end gap-6">
                            <button onClick={() => { 
                              setEditId(p.id); setNombre(p.nombre); setPrecio(p.precio.toString()); 
                              setCategoria(p.categoria); setStock(p.stock.toString());
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} className="text-[10px] font-black uppercase text-blue-500 hover:tracking-widest transition-all">Editar</button>
                            <button onClick={() => {
                              if(confirm("¿Borrar?")) supabase.from('productos').delete().eq('id', p.id).then(() => fetchData());
                            }} className="text-[10px] font-black uppercase text-red-300">Borrar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'pedidos' && (
          <div className="space-y-6 md:space-y-10">
            {/* STATS RÁPIDOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10">
              <div className="bg-black p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] text-white">
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 mb-2">Ingresos {stats.mesNombre}</p>
                <h3 className="text-4xl md:text-6xl font-serif tracking-tighter">Q{stats.totalMes.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Órdenes Confirmadas</p>
                <h3 className="text-4xl md:text-6xl font-serif tracking-tighter">{stats.cantidadMes}</h3>
              </div>
            </div>

            {/* TABLA DE PEDIDOS RESPONSIVA */}
            <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
               {/* MÓVIL PEDIDOS */}
               <div className="xl:hidden divide-y divide-gray-50">
                  {compras.map((c) => (
                    <div key={c.id} className="p-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-[10px] font-bold text-blue-500">#{c.numero_gestion}</span>
                        <span className="font-black text-lg font-serif">Q{c.total.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[11px]">
                        <div>
                          <p className="font-bold text-gray-400 uppercase tracking-tighter">Cliente</p>
                          <p className="font-bold uppercase truncate">{c.nombre_cliente}</p>
                        </div>
                        <div>
                          <p className="font-bold text-gray-400 uppercase tracking-tighter">Prenda</p>
                          <p className="truncate">{c.nombre_producto}</p>
                        </div>
                      </div>
                      <button onClick={() => deletePedido(c.id)} className="w-full py-2 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold uppercase">Eliminar Registro</button>
                    </div>
                  ))}
               </div>

               {/* DESKTOP PEDIDOS */}
               <table className="hidden xl:table w-full">
                  <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400">
                    <tr className="text-left">
                      <th className="p-10 font-black">Referencia</th>
                      <th className="p-10 font-black">Cliente</th>
                      <th className="p-10 font-black">Pedido</th>
                      <th className="p-10 text-right font-black">Total</th>
                      <th className="p-10 text-right font-black">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {compras.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="p-10 font-mono text-sm font-bold text-blue-500">#{c.numero_gestion}</td>
                        <td className="p-10 font-bold uppercase text-xs">{c.nombre_cliente}</td>
                        <td className="p-10 text-sm">{c.nombre_producto}</td>
                        <td className="p-10 text-right font-black">Q{c.total.toFixed(2)}</td>
                        <td className="p-10 text-right">
                          <button onClick={() => deletePedido(c.id)} className="text-red-300 hover:text-red-500 transition-colors">
                            <svg className="ml-auto" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {view === 'analitica' && (
          <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 text-center md:text-left">
              {/* Mas stalkeado */}
              <div className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col items-center md:items-start justify-center">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-6 italic">El más deseado (Clics)</p>
                {stats.masStalkeado ? (
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <img src={stats.masStalkeado.imagenes[0]} className="w-24 h-32 object-cover rounded-[1.5rem] shadow-xl" alt="" />
                    <div>
                      <h4 className="font-serif text-2xl">{stats.masStalkeado.nombre}</h4>
                      <p className="text-4xl font-black text-blue-500 mt-2">{stats.masStalkeado.views || 0} <span className="text-[10px] uppercase text-gray-300 tracking-widest">Interacciones</span></p>
                    </div>
                  </div>
                ) : <p className="text-gray-300 italic">No hay datos de telemetría aún</p>}
              </div>

              {/* Tasa de Conversión */}
              <div className="bg-black p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] text-white flex flex-col items-center md:items-start justify-center">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">Órdenes del Mes</p>
                <h4 className="text-6xl font-serif italic text-blue-400">{stats.cantidadMes}</h4>
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mt-2">Ventas concretadas satisfactoriamente</p>
              </div>

              {/* Total histórico simple */}
              <div className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col items-center md:items-start justify-center">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Ingreso Total Acumulado</p>
                <h4 className="text-4xl font-serif">Q{compras.reduce((a,b)=>a+b.total, 0).toFixed(2)}</h4>
                <p className="text-[10px] uppercase tracking-widest font-bold text-green-500 mt-2">Facturación Bruta</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}