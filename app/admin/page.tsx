'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  // Estados para el formulario
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoria, setCategoria] = useState('')
  const [imagen, setImagen] = useState<File | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login') } 
      else { setLoading(false) }
    }
    checkUser()
  }, [router])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imagen) return alert("Selecciona una imagen")

    try {
      setUploading(true)

      // 1. Subir imagen al Storage
      const fileExt = imagen.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('imagenes-ropa')
        .upload(filePath, imagen)

      if (uploadError) throw uploadError

      // 2. Obtener la URL pública de la imagen
      const { data: { publicUrl } } = supabase.storage
        .from('imagenes-ropa')
        .getPublicUrl(filePath)

      // 3. Guardar datos en la tabla 'productos'
      const { error: dbError } = await supabase
        .from('productos')
        .insert([
          { 
            nombre, 
            precio: parseFloat(precio), 
            categoria, 
            imagen_url: publicUrl,
            stock: true 
          }
        ])

      if (dbError) throw dbError

      alert("¡Producto guardado con éxito!")
      // Limpiar formulario
      setNombre(''); setPrecio(''); setCategoria(''); setImagen(null);
      
    } catch (error: any) {
      alert(error.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <p className="p-10 text-center text-white">Cargando panel...</p>

  return (
    <div className="p-8 max-w-xl mx-auto text-black">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
        <button 
          onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Cerrar Sesión
        </button>
      </div>

      <form onSubmit={handleUpload} className="bg-white p-6 rounded-xl shadow-lg flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-2">Nueva Prenda</h2>
        
        <input type="text" placeholder="Nombre de la prenda" className="p-2 border rounded"
          value={nombre} onChange={(e) => setNombre(e.target.value)} required />

        <input type="number" placeholder="Precio (Ej: 150)" className="p-2 border rounded"
          value={precio} onChange={(e) => setPrecio(e.target.value)} required />

        <select className="p-2 border rounded" value={categoria} onChange={(e) => setCategoria(e.target.value)} required>
          <option value="">Selecciona Categoría</option>
          <option value="Caballeros">Caballeros</option>
          <option value="Damas">Damas</option>
          <option value="Accesorios">Accesorios</option>
        </select>

        <label className="text-sm font-semibold">Foto de la prenda:</label>
        <input type="file" accept="image/*" className="text-sm"
          onChange={(e) => setImagen(e.target.files ? e.target.files[0] : null)} required />

        <button 
          type="submit" 
          disabled={uploading}
          className="bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {uploading ? 'Subiendo...' : 'Guardar Producto'}
        </button>
      </form>
    </div>
  )
}