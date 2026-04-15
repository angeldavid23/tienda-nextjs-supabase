'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase' // Asegúrate de haber creado este archivo antes
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("Credenciales incorrectas")
    } else {
      router.push('/admin') // Si entra bien, lo mandamos al panel
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <form onSubmit={handleLogin} className="p-8 bg-white shadow-md rounded-lg border flex flex-col gap-4 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center">Admin Login</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input 
          type="email" 
          placeholder="Correo" 
          className="p-2 border rounded text-black"
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          className="p-2 border rounded text-black"
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          Entrar
        </button>
      </form>
    </div>
  )
}