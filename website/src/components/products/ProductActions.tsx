'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Zap, Minus, Plus, Heart } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { cn } from '@/lib/utils'
import type { Product, ProductVariant } from '@/types/database'
import { useWishlist } from './useWishlist'
import toast from 'react-hot-toast'

interface Props {
  product: Product
  variants?: ProductVariant[]
}

export default function ProductActions({ product, variants }: Props) {
  const variantList = useMemo(
    () => (variants ?? product.variants ?? []).filter(v => v?.options?.length),
    [variants, product.variants],
  )
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() =>
    Object.fromEntries(variantList.map(v => [v.name, v.options[0]])),
  )
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const addItem = useCartStore(s => s.addItem)
  const buyNow = useCartStore(s => s.buyNow)
  const { isWished, toggleWishlist, busy: wishlistBusy } = useWishlist(product.id)

  const stock = Math.max(0, product.stock ?? 0)
  const maxQty = Math.max(1, stock)
  const variantLabel = variantList
    .map(variant => selectedVariants[variant.name])
    .filter(Boolean)
    .join(', ')

  const handleAddToCart = async () => {
    if (stock <= 0) return
    setLoading(true)
    try {
      await addItem(product, qty)
      toast.success(`${qty} produk ditambahkan ke keranjang`)
    } catch {
      toast.error('Gagal menambahkan ke keranjang, silakan coba lagi')
    } finally {
      setLoading(false)
    }
  }

  const handleBuyNow = async () => {
    if (stock <= 0) return
    setLoading(true)
    try {
      buyNow(product, qty, variantLabel || undefined)
      toast.success('Melanjutkan ke pembayaran')
      router.push('/checkout')
    } catch {
      toast.error('Gagal melanjutkan pembelian, silakan coba lagi')
      setLoading(false)
    }
  }

  if (stock === 0) {
    return (
      <div className="space-y-3">
        <div className="py-3 px-4 bg-gray-100 text-gray-600 text-center rounded-sm font-medium">
          Stok habis — produk ini belum bisa dipesan
        </div>
        <button
          type="button"
          disabled={wishlistBusy}
          onClick={() => { void toggleWishlist() }}
          className="w-full flex items-center justify-center gap-2 border border-brand text-brand py-2.5 rounded-sm text-sm font-medium hover:bg-orange-50 transition-colors"
        >
          <Heart className={cn('w-4 h-4', isWished && 'fill-red-500 text-red-500')} />
          {isWished ? 'Tersimpan di Wishlist' : 'Simpan ke Wishlist'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Varian */}
      {variantList.map(variant => (
        <div key={variant.name} className="flex gap-3 items-start">
          <span className="text-gray-500 text-sm w-28 flex-shrink-0 pt-1.5">{variant.name}</span>
          <div className="flex flex-wrap gap-2">
            {variant.options.map(option => {
              const active = selectedVariants[variant.name] === option
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: option }))}
                  className={cn(
                    'px-3 py-1.5 rounded-sm border text-sm transition-colors',
                    active
                      ? 'border-brand bg-orange-50 text-brand font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-brand hover:text-brand bg-white',
                  )}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Jumlah */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-gray-500 text-sm w-28 flex-shrink-0">Jumlah</span>
        <div className="flex items-center border border-gray-200 rounded-sm overflow-hidden bg-white">
          <button
            type="button"
            aria-label="Kurangi jumlah"
            onClick={() => setQty(q => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-r border-gray-200 transition-colors disabled:opacity-40"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-11 text-center text-sm font-medium text-gray-800 tabular-nums">{qty}</span>
          <button
            type="button"
            aria-label="Tambah jumlah"
            onClick={() => setQty(q => Math.min(maxQty, q + 1))}
            disabled={qty >= maxQty}
            className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 border-l border-gray-200 transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-xs text-gray-500">{stock} tersedia</span>
      </div>

      {/* Tombol aksi */}
      <div className="flex gap-3 pt-1 flex-wrap">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={loading}
          className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-orange-50 hover:bg-brand hover:text-white text-brand border border-brand font-semibold py-3 rounded-sm transition-colors text-sm disabled:opacity-50"
        >
          <ShoppingCart className="w-4 h-4" />
          {loading ? 'Memproses...' : 'Tambah Keranjang'}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={loading}
          className="flex-1 min-w-[150px] flex items-center justify-center gap-2 btn-primary text-sm py-3 rounded-sm"
        >
          <Zap className="w-4 h-4" />
          Beli Sekarang
        </button>
      </div>

      <button
        type="button"
        disabled={wishlistBusy}
        onClick={() => { void toggleWishlist() }}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-brand transition-colors"
      >
        <Heart className={cn('w-4 h-4', isWished ? 'fill-red-500 text-red-500' : '')} />
        {isWished ? 'Tersimpan di Wishlist' : 'Simpan ke Wishlist'}
      </button>
    </div>
  )
}
