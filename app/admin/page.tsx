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
  // Ahora manejamos una lista de archivos (FileList)
  const [imagenes, setImagenes] = useState<FileList | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { 
        router.push('/login') 
      } else { 
        setLoading(false) 
      }
    }
    checkUser()
  }, [router])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validamos que existan archivos y que no sean más de 3
    if (!imagenes || imagenes.length === 0) return alert("Selecciona al menos una imagen")
    if (imagenes.length > 3) return alert("Solo puedes subir un máximo de 3 imágenes")

    try {
      setUploading(true)
      const urlsPublicas: string[] = []

      // Procesamos cada imagen seleccionada
      for (let i = 0; i < imagenes.length; i++) {
        const file = imagenes[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        // 1. Subir imagen al Storage
        const { error: uploadError } = await supabase.storage
          .from('imagenes-ropa')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // 2. Obtener la URL pública y guardarla en nuestro array local
        const { data: { publicUrl } } = supabase.storage
          .from('imagenes-ropa')
          .getPublicUrl(filePath)
        
        urlsPublicas.push(publicUrl)
      }

      // 3. Guardar datos en la tabla 'productos' 
      // IMPORTANTE: Asegúrate que la columna en Supabase se llame 'imagenes' y sea tipo text[]
      const { error: dbError } = await supabase
        .from('productos')
        .insert([
          { 
            nombre, 
            precio: parseFloat(precio), 
            categoria, 
            imagenes: urlsPublicas, // Enviamos el array completo
            stock: true 
          }
        ])

      if (dbError) throw dbError

      alert("¡Producto con múltiples imágenes guardado con éxito!")
      
      // Limpiar formulario
      setNombre(''); 
      setPrecio(''); 
      setCategoria(''); 
      setImagenes(null);
      // Resetear el input de archivos manualmente
      (document.getElementById('fileInput') as HTMLInputElement).value = "";
      
    } catch (error: any) {
      alert(`Error: ${error.message}`)
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
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>

      <form onSubmit={handleUpload} className="bg-white p-6 rounded-xl shadow-lg flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-2">Nueva Prenda (Máx. 3 fotos)</h2>
        
        <input type="text" placeholder="Nombre de la prenda" className="p-2 border rounded focus:outline-blue-500"
          value={nombre} onChange={(e) => setNombre(e.target.value)} required />

        <input type="number" placeholder="Precio (Ej: 150)" className="p-2 border rounded focus:outline-blue-500"
          value={precio} onChange={(e) => setPrecio(e.target.value)} required />

        <select className="p-2 border rounded focus:outline-blue-500" value={categoria} onChange={(e) => setCategoria(e.target.value)} required>
          <option value="">Selecciona Categoría</option>
          <option value="Caballeros">Caballeros</option>
          <option value="Damas">Damas</option>
          <option value="Accesorios">Accesorios</option>
        </select>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold italic text-gray-600">
            Puedes seleccionar hasta 3 fotos a la vez:
          </label>
          <input 
            id="fileInput"
            type="file" 
            accept="image/*" 
            multiple // PERMITE SELECCIONAR VARIOS
            className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            onChange={(e) => setImagenes(e.target.files)} 
            required 
          />
          {imagenes && (
            <p className="text-xs text-blue-600 font-medium">
              {imagenes.length} archivos seleccionados.
            </p>
          )}
        </div>

        <button 
          type="submit" 
          disabled={uploading}
          className="bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-md"
        >
          {uploading ? 'Procesando imágenes...' : 'Guardar Producto'}
        </button>
      </form>
    </div>
  )
}