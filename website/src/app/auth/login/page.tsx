'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Zap, ShoppingBag } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const { signIn, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signIn(email, password)
      toast.success('Berhasil masuk!')
      router.push(next)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Email atau password salah')
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
          <h1 className="text-xl font-bold text-gray-800 mb-1">Masuk</h1>
          <p className="text-xs text-gray-500 mb-6">Selamat datang kembali, yuk lanjut belanja!</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="nama@email.com" autoComplete="email" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="input pr-12" placeholder="Minimal 6 karakter" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand" aria-label="Tampilkan password">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
              {isLoading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-gray-100" /><span className="text-xs text-gray-400">atau</span><span className="flex-1 h-px bg-gray-100" />
          </div>
          <Link href="/auth/register" className="btn-outline w-full py-2.5 text-sm block text-center">Daftar Akun Baru</Link>
          <p className="text-center text-xs text-gray-500 mt-5 flex items-center justify-center gap-1"><ShoppingBag className="w-3.5 h-3.5" /> Belanja elektronik aman di ElektroMart</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen shopee-gradient" />}>
      <LoginForm />
    </Suspense>
  )
}
