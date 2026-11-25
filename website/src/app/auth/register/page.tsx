'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, isLoading } = useAuthStore()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) return toast.error('Password minimal 6 karakter')
    try {
      await signUp(email, password, fullName)
      toast.success('Akun berhasil dibuat! Cek email untuk verifikasi.', { duration: 5000 })
      router.push('/auth/login')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat akun')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 shopee-gradient">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 text-white font-bold text-2xl mb-6">
          <span className="bg-white rounded-sm p-1.5"><Zap className="w-6 h-6 text-brand" /></span>
          ElektroMart
        </Link>
        <div className="bg-white rounded-sm p-7 shadow-lg">
          <h1 className="text-xl font-bold text-gray-800 mb-1">Daftar Akun</h1>
          <p className="text-xs text-gray-500 mb-6">Gratis, tanpa biaya pendaftaran</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Lengkap</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required className="input" placeholder="Nama kamu" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="nama@email.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="input pr-12" placeholder="Minimal 6 karakter" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand" aria-label="Tampilkan password">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? 'Memproses...' : 'Daftar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Sudah punya akun? <Link href="/auth/login" className="text-brand font-semibold hover:underline">Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
