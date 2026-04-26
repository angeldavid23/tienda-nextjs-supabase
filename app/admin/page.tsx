'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ... (Interfaces Producto y Compra se mantienen igual)

export default function AdminPage() {
  // ... (Toda la lógica de estados y funciones se mantiene igual)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [productos, setProductos] = useState<any[]>([])
  const [compras, setCompras] = useState<any[]>([])
  const [view, setView] = useState<'inventario' | 'pedidos'>('inventario')
  const router = useRouter()

  const [editId, setEditId] = useState<number | null>(null)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [stock, setStock] = useState('0')
  const [imagenes, setImagenes] = useState<FileList | null>(null)

  // 1. Definimos las funciones de carga (fuera del useEffect)
  const fetchProductos = useCallback(async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false })
    if (data) setProductos(data)
  }, [])

 const fetchCompras = useCallback(async () => {
    const { data } = await supabase.from('compras').select('*').order('created_at', { ascending: false })
    if (data) setCompras(data)
  }, [])
  // 2. useEffect CORREGIDO: Arreglo de dependencias consistente
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setLoading(false)
        // Solo cargamos datos si el usuario está autenticado
        fetchProductos()
        fetchCompras()
      }
    }
    
    checkUser()
    // Al dejar esto vacío [], React garantiza que el tamaño nunca cambie
  }, []);

  const statsMensuales = useMemo(() => {
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const ventasMes = compras.filter(c => new Date(c.created_at) >= inicioMes)
    const totalDinero = ventasMes.reduce((acc, curr) => acc + curr.total, 0)
    return { total: totalDinero, cantidad: ventasMes.length, mesNombre: ahora.toLocaleString('es-GT', { month: 'long' }) }
  }, [compras])

  const deletePedido = async (id: number) => {
    if (!confirm("¿Deseas eliminar este registro?")) return
    await supabase.from('compras').delete().eq('id', id)
    fetchCompras()
  }

  const resetForm = () => {
    setEditId(null); setNombre(''); setPrecio(''); setCategoria(''); setDescripcion(''); setStock('0'); setImagenes(null)
    const input = document.getElementById('fileInput') as HTMLInputElement
    if (input) input.value = ""
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
      fetchProductos()
    } catch (error: any) { alert(error.message) }
    finally { setUploading(false) }
  }

  if (loading) return <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center font-serif italic">Aura Élégance...</div>

  return (
    <div className="min-h-screen bg-[#fdfaf5] p-6 md:p-12 text-black">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header - Más espaciado */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm mb-12 border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-3xl font-serif italic tracking-[0.25em]">PANEL ADMINISTRATIVO</h1>
              <div className="flex gap-10 mt-6">
                <button onClick={() => setView('inventario')} className={`text-xs uppercase tracking-[0.2em] font-bold pb-3 border-b-2 transition-all ${view === 'inventario' ? 'border-black' : 'border-transparent text-gray-400'}`}>Inventario</button>
                <button onClick={() => setView('pedidos')} className={`text-xs uppercase tracking-[0.2em] font-bold pb-3 border-b-2 transition-all ${view === 'pedidos' ? 'border-black' : 'border-transparent text-gray-400'}`}>Historial de Pedidos</button>
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-xs uppercase tracking-widest font-black text-gray-400 border border-gray-100 px-10 py-4 rounded-full hover:bg-gray-50 transition-all">Cerrar Sesión</button>
          </div>
        </div>

        {view === 'inventario' ? (
          /* Ajuste de columnas: 2/5 para formulario, 3/5 para tabla */
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-12">
            
            {/* Formulario más grande */}
            <div className="xl:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-gray-100 sticky top-12">
                <h2 className="font-serif italic text-3xl mb-10 border-b pb-4">{editId ? '📝 Editar Prenda' : '✨ Nueva Prenda'}</h2>
                <div className="space-y-8">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Nombre del Producto</label>
                    <input type="text" className="w-full p-5 bg-gray-50 rounded-2xl border-none text-lg outline-none focus:ring-2 ring-black/5" value={nombre} onChange={(e)=>setNombre(e.target.value)} required />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Precio Q.</label>
                      <input type="number" className="w-full p-5 bg-gray-50 rounded-2xl text-lg font-serif outline-none" value={precio} onChange={(e)=>setPrecio(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Stock Actual</label>
                      <input type="number" className="w-full p-5 bg-blue-50/50 rounded-2xl text-lg font-bold text-blue-600 outline-none" value={stock} onChange={(e)=>setStock(e.target.value)} required />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-2">Categoría</label>
                    <select className="w-full p-5 bg-gray-50 rounded-2xl text-lg outline-none appearance-none" value={categoria} onChange={(e)=>setCategoria(e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      <option value="Caballeros">Caballeros</option>
                      <option value="Damas">Damas</option>
                      <option value="Accesorios">Accesorios</option>
                    </select>
                  </div>

                  <button type="submit" disabled={uploading} className="w-full bg-black text-white p-7 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl active:scale-95">
                    {uploading ? 'PROCESANDO...' : editId ? 'GUARDAR CAMBIOS' : 'PUBLICAR PRODUCTO'}
                  </button>
                  {editId && <button type="button" onClick={resetForm} className="w-full text-xs text-gray-400 font-bold uppercase tracking-widest pt-2">Cancelar</button>}
                </div>
              </form>
            </div>

            {/* Tabla con elementos más grandes */}
            <div className="xl:col-span-3 bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs uppercase tracking-widest text-gray-400">
                    <th className="p-10 text-left font-black">Producto</th>
                    <th className="p-10 text-center font-black">Stock</th>
                    <th className="p-10 text-right font-black">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {productos.map((p) => (
                    <tr key={p.id} className="group hover:bg-gray-50/30 transition-colors">
                      <td className="p-10">
                        <div className="flex items-center gap-8">
                          {/* Imagen más grande */}
                          <img src={p.imagenes[0]} className="w-20 h-28 object-cover rounded-2xl shadow-md group-hover:scale-105 transition-transform" alt="" />
                          <div>
                            <span className="font-serif text-2xl block mb-1">{p.nombre}</span>
                            <span className="text-lg font-light italic text-gray-500">Q{p.precio.toFixed(2)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-10 text-center">
                        <span className={`px-6 py-2 rounded-full text-xs font-black tracking-tighter ${p.stock < 5 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                          {p.stock} UNIDADES
                        </span>
                      </td>
                      <td className="p-10 text-right">
                        <div className="flex justify-end gap-6">
                          <button onClick={() => { 
                            setEditId(p.id); setNombre(p.nombre); setPrecio(p.precio.toString()); 
                            setCategoria(p.categoria); setDescripcion(p.descripcion || ''); setStock(p.stock.toString());
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }} className="text-xs font-black uppercase text-blue-500 hover:tracking-widest transition-all">Editar</button>
                          <button onClick={() => {
                            if(confirm("¿Borrar?")) supabase.from('productos').delete().eq('id', p.id).then(() => fetchProductos());
                          }} className="text-xs font-black uppercase text-red-300 hover:text-red-500 transition-colors">Borrar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VISTA DE PEDIDOS - También escalada */
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-black p-12 rounded-[3.5rem] text-white shadow-2xl">
                <p className="text-xs uppercase tracking-[0.4em] font-bold opacity-50 mb-4 text-center md:text-left">Ingresos {statsMensuales.mesNombre}</p>
                <h3 className="text-6xl font-serif text-center md:text-left tracking-tighter">Q{statsMensuales.total.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
                <p className="text-xs uppercase tracking-[0.4em] font-bold text-gray-400 mb-4 text-center md:text-left">Órdenes Confirmadas</p>
                <h3 className="text-6xl font-serif text-center md:text-left tracking-tighter">{statsMensuales.cantidad}</h3>
              </div>
            </div>

            <div className="bg-white rounded-[3.5rem] shadow-sm border border-gray-100 overflow-hidden">
               <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-xs uppercase tracking-widest text-gray-400">
                      <th className="p-10 text-left">Referencia</th>
                      <th className="p-10 text-left">Cliente</th>
                      <th className="p-10 text-left">Pedido</th>
                      <th className="p-10 text-right">Total</th>
                      <th className="p-10 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {compras.map((c) => (
                      <tr key={c.id} className="text-lg">
                        <td className="p-10 font-mono text-sm font-bold text-blue-500">#{c.numero_gestion}</td>
                        <td className="p-10 font-bold uppercase text-sm">{c.nombre_cliente}</td>
                        <td className="p-10 text-base">{c.nombre_producto}</td>
                        <td className="p-10 text-right font-black">Q{c.total.toFixed(2)}</td>
                        <td className="p-10 text-right">
                          <button onClick={() => deletePedido(c.id)} className="text-red-300 hover:text-red-500 p-2"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}