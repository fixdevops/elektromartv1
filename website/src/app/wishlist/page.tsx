'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Heart, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { formatRupiah } from '@/lib/utils'
import type { WishlistItem } from '@/types/database'
import toast from 'react-hot-toast'

export default function WishlistPage() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    createClient()
      .from('wishlists')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Gagal memuat wishlist')
        setItems((data as WishlistItem[] | null) ?? [])
        setLoading(false)
      })
  }, [user])

  const remove = async (id: string) => {
    const { error } = await createClient().from('wishlists').delete().eq('id', id)
    if (error) return toast.error(error.message)
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Dihapus dari wishlist')
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4">
      <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-brand fill-brand" /> Wishlist Saya</h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="card h-64 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card py-20 text-center">
          <Heart className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">Belum ada produk di wishlist</p>
          <Link href="/products" className="btn-primary inline-block">Jelajahi Produk</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {items.map(item => item.product && (
            <div key={item.id} className="card relative group">
              <Link href={`/products/${item.product.slug}`}>
                <div className="relative aspect-square bg-gray-50">
                  <Image src={item.product.images?.[0] ?? '/placeholder.png'} alt={item.product.name} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-700 line-clamp-2 mb-1">{item.product.name}</p>
                  <p className="text-sm text-brand font-bold">{formatRupiah(item.product.price)}</p>
                </div>
              </Link>
              <button onClick={() => remove(item.id)} className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5 text-gray-400 hover:text-red-500 shadow" aria-label="Hapus dari wishlist">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
