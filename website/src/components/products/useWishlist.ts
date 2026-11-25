'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

/** Toggle wishlist dengan optimisme lokal dan sinkronisasi ke tabel `wishlists`. */
export function useWishlist(productId: string) {
  const user = useAuthStore(s => s.user)
  const [isWished, setIsWished] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    if (!user) {
      setIsWished(false)
      return
    }

    const supabase = createClient()
    supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsWished(Boolean(data))
      })

    return () => { active = false }
  }, [user?.id, productId])

  const toggleWishlist = useCallback(async () => {
    if (!user) {
      toast.error('Silakan masuk untuk menyimpan produk ke wishlist')
      return false
    }
    if (busy) return false

    const supabase = createClient()
    const next = !isWished
    setIsWished(next)
    setBusy(true)

    const { error } = next
      ? await supabase.from('wishlists').insert({ user_id: user.id, product_id: productId })
      : await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', productId)

    setBusy(false)

    if (error) {
      setIsWished(!next)
      toast.error('Gagal memperbarui wishlist, silakan coba lagi')
      return false
    }

    toast.success(next ? 'Produk ditambahkan ke wishlist' : 'Produk dihapus dari wishlist')
    return true
  }, [user, isWished, busy, productId])

  return { isWished, toggleWishlist, busy }
}
