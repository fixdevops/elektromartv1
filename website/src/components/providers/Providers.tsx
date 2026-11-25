'use client'

import { Toaster } from 'react-hot-toast'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'

export default function Providers({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, fetchProfile } = useAuthStore()
  const loadCart = useCartStore(s => s.loadCart)
  const resetLocal = useCartStore(s => s.resetLocal)
  const pathname = usePathname()
  const previousPath = useRef(pathname)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Kembali dari checkout tanpa menyelesaikan pesanan → pulihkan keranjang
  // asli (dipakai saat masuk lewat "Beli Sekarang").
  useEffect(() => {
    if (previousPath.current === '/checkout' && pathname !== '/checkout') {
      useCartStore.getState().cancelBuyNow()
    }
    previousPath.current = pathname
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile()
        loadCart(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        setUser(session.user)
        fetchProfile()
        loadCart(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        resetLocal()
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, fetchProfile, loadCart, resetLocal])

  return (
    <>
      {children}
      <Toaster
        position={isMobile ? 'top-center' : 'top-right'}
        containerStyle={isMobile ? { paddingTop: 80, paddingLeft: 16, paddingRight: 16 } : undefined}
        toastOptions={{
          style: {
            background: '#fff',
            color: '#222',
            border: '1px solid #eee',
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#ee4d2d', secondary: '#fff' } },
        }}
      />
    </>
  )
}
