'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Producto {
  id: number
  nombre: string
  precio: number
  categoria: string
  imagenes: string[]
  descripcion?: string
  stock: number
}

interface Compra {
  id: number
  created_at: string
  nombre_producto: string
  cantidad: number
  total: number
  nombre_cliente: string
  telefono_cliente: string
  numero_gestion: string
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [compras, setCompras] = useState<Compra[]>([])
  const [view, setView] = useState<'inventario' | 'pedidos'>('inventario')
  const router = useRouter()

  const [editId, setEditId] = useState<number | null>(null)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [stock, setStock] = useState('0')
  const [imagenes, setImagenes] = useState<FileList | null>(null)

  useEffect(() => {
    checkUser()
    fetchProductos()
    fetchCompras()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
    else setLoading(false)
  }

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false })
    if (data) setProductos(data)
  }

  const fetchCompras = async () => {
    const { data } = await supabase.from('compras').select('*').order('created_at', { ascending: false })
    if (data) setCompras(data)
  }

  const uploadImages = async (): Promise<string[]> => {
    if (!imagenes) return []
    const urls: string[] = []
    for (let i = 0; i < imagenes.length; i++) {
      const file = imagenes[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const { error } = await supabase.storage.from('imagenes-ropa').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('imagenes-ropa').getPublicUrl(fileName)
      urls.push(publicUrl)
    }
    return urls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setUploading(true)
      let urlsPublicas = editId ? productos.find(p => p.id === editId)?.imagenes || [] : []
      
      if (imagenes && imagenes.length > 0) {
        if (imagenes.length > 3) throw new Error("Máximo 3 imágenes")
        urlsPublicas = await uploadImages()
      }

      const datosProducto = { 
        nombre, 
        precio: parseFloat(precio), 
        categoria, 
        descripcion, 
        stock: parseInt(stock),
        imagenes: urlsPublicas 
      }

      if (editId) {
        const { error } = await supabase.from('productos').update(datosProducto).eq('id', editId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('productos').insert([datosProducto])
        if (error) throw error
      }

      alert(editId ? "Producto actualizado" : "Producto creado")
      resetForm()
      fetchProductos()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (p: Producto) => {
    setEditId(p.id)
    setNombre(p.nombre)
    setPrecio(p.precio.toString())
    setCategoria(p.categoria)
    setDescripcion(p.descripcion || '')
    setStock(p.stock.toString())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchProductos()
  }

  const resetForm = () => {
    setEditId(null)
    setNombre(''); setPrecio(''); setCategoria(''); setDescripcion(''); setStock('0'); setImagenes(null)
    const input = document.getElementById('fileInput') as HTMLInputElement
    if (input) input.value = ""
  }

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white font-serif tracking-widest">AURA ÉLÉGANCE...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header con Tabs */}
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-serif italic tracking-widest text-black">PANEL ADMINISTRATIVO</h1>
              <div className="flex gap-6 mt-4">
                <button 
                  onClick={() => setView('inventario')}
                  className={`text-[10px] uppercase tracking-[0.2em] font-bold pb-2 border-b-2 transition-all ${view === 'inventario' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  Inventario
                </button>
                <button 
                  onClick={() => setView('pedidos')}
                  className={`text-[10px] uppercase tracking-[0.2em] font-bold pb-2 border-b-2 transition-all ${view === 'pedidos' ? 'border-black text-black' : 'border-transparent text-gray-400'}`}
                >
                  Pedidos WhatsApp
                </button>
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] uppercase tracking-widest font-bold text-red-500 border border-red-200 px-6 py-2 rounded-full hover:bg-red-50 transition-all">Desconectar</button>
          </div>
        </div>

        {view === 'inventario' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulario con Contraste Mejorado */}
            <div className="lg:col-span-1">
              <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 sticky top-24">
                <h2 className="font-serif italic text-xl mb-6 text-black border-b pb-2">
                  {editId ? '📝 Editar Prenda' : '✨ Nueva Adición'}
                </h2>
                
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-black uppercase block mb-1 tracking-widest">Nombre</label>
                    <input type="text" placeholder="Ej: Camisa Slim Fit" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none focus:ring-1 focus:ring-black text-sm text-black placeholder:text-gray-400" value={nombre} onChange={(e)=>setNombre(e.target.value)} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-black uppercase block mb-1 tracking-widest">Precio Q.</label>
                      <input type="number" placeholder="0.00" className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none text-sm text-black placeholder:text-gray-400" value={precio} onChange={(e)=>setPrecio(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-black uppercase block mb-1 tracking-widest">Stock</label>
                      <input type="number" placeholder="0" className="w-full p-4 bg-blue-50/50 rounded-2xl border border-blue-100 outline-none text-sm text-black font-bold" value={stock} onChange={(e)=>setStock(e.target.value)} required />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-black uppercase block mb-1 tracking-widest">Categoría</label>
                    <select className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none text-sm text-black" value={categoria} onChange={(e)=>setCategoria(e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      <option value="Caballeros">Caballeros</option>
                      <option value="Damas">Damas</option>
                      <option value="Accesorios">Accesorios</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-black uppercase block mb-1 tracking-widest">Descripción</label>
                    <textarea placeholder="Detalles de la prenda..." className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 outline-none text-sm text-black h-24" value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} />
                  </div>

                  <div className="p-4 border border-dashed border-gray-300 rounded-2xl bg-gray-50">
                    <label className="text-[10px] font-bold text-black uppercase block mb-2">Imágenes (Max 3)</label>
                    <input id="fileInput" type="file" multiple onChange={(e)=>setImagenes(e.target.files)} className="text-[10px] block w-full text-black file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-black file:text-white" />
                  </div>

                  <button type="submit" disabled={uploading} className="w-full bg-black text-white p-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-900 transition-all shadow-lg active:scale-95 disabled:bg-gray-400">
                    {uploading ? 'PROCESANDO...' : editId ? 'ACTUALIZAR PRENDA' : 'PUBLICAR EN CATÁLOGO'}
                  </button>
                  {editId && <button type="button" onClick={resetForm} className="w-full text-[10px] text-gray-500 font-bold uppercase tracking-widest pt-2">Cancelar Edición</button>}
                </div>
              </form>
            </div>

            {/* Tabla Inventario con Contraste */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-[10px] uppercase tracking-[0.15em] text-black font-black">
                    <th className="p-6 text-left">Prenda</th>
                    <th className="p-6 text-center">Disponibilidad</th>
                    <th className="p-6 text-left">Precio</th>
                    <th className="p-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productos.map((p) => (
                    <tr key={p.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <img src={p.imagenes[0]} className="w-12 h-16 object-cover rounded-lg shadow-sm border border-gray-100" alt="" />
                          <span className="font-serif text-black font-medium">{p.nombre}</span>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${p.stock < 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                          {p.stock} en stock
                        </span>
                      </td>
                      <td className="p-6 font-bold text-black italic">Q{p.precio.toFixed(2)}</td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => handleEdit(p)} className="text-[10px] font-bold uppercase text-blue-600 hover:underline">Editar</button>
                          <button onClick={() => handleDelete(p.id)} className="text-[10px] font-bold uppercase text-red-400 hover:underline">Borrar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* VISTA DE PEDIDOS WHATSAPP */
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
             <table className="w-full">
                <thead className="bg-black">
                  <tr className="text-[10px] uppercase tracking-[0.2em] text-white">
                    <th className="p-6 text-left">Referencia</th>
                    <th className="p-6 text-left">Cliente</th>
                    <th className="p-6 text-left">Detalle del Pedido</th>
                    <th className="p-6 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {compras.map((c) => (
                    <tr key={c.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 font-mono text-xs font-bold text-blue-600">#{c.numero_gestion}</td>
                      <td className="p-6">
                        <div className="font-bold text-black uppercase text-xs">{c.nombre_cliente}</div>
                        <div className="text-xs text-gray-500 mt-1">📞 {c.telefono_cliente}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-black font-medium">{c.nombre_producto}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold mt-1 tracking-widest">Unidades: {c.cantidad}</div>
                      </td>
                      <td className="p-6 text-right font-black text-black">Q{c.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
             {compras.length === 0 && (
               <div className="p-20 text-center text-gray-400 uppercase text-[10px] tracking-widest">No hay pedidos registrados aún</div>
             )}
          </div>
        )}
      </div>
    </div>
  )
}