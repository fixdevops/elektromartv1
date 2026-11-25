'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShoppingCart, Star, Heart, MapPin } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { formatRupiah, discountPercent, cn } from '@/lib/utils'
import type { Product } from '@/types/database'
import { useWishlist } from './useWishlist'
import toast from 'react-hot-toast'

const PLACEHOLDER = '/placeholder.png'

export default function ProductCard({ product }: { product: Product }) {
  const [imageSrc, setImageSrc] = useState(product.images?.[0] || PLACEHOLDER)
  const { isWished, toggleWishlist, busy } = useWishlist(product.id)
  const addItem = useCartStore(s => s.addItem)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setImageSrc(product.images?.[0] || PLACEHOLDER)
  }, [product.id, product.images])

  const isOnSale = Boolean(product.original_price && product.original_price > product.price)
  const discount = isOnSale ? discountPercent(product.original_price!, product.price) : 0
  const sold = Math.max(0, product.sold_count ?? 0)
  const location = product.location || 'Jakarta Pusat'

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.stock <= 0) return
    setAdding(true)
    try {
      await addItem(product)
      toast.success('Produk ditambahkan ke keranjang')
    } catch {
      toast.error('Gagal menambahkan produk ke keranjang')
    } finally {
      setAdding(false)
    }
  }

  return (
    <article className="group relative bg-white hover:shadow-md hover:z-10 transition-shadow border-r border-b border-gray-100">
      {/* Gambar */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <Link href={`/products/${product.slug}`} className="block w-full h-full" aria-label={`Lihat ${product.name}`}>
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 20vw, 16vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
            onError={() => { if (imageSrc !== PLACEHOLDER) setImageSrc(PLACEHOLDER) }}
          />
        </Link>

        {isOnSale && (
          <span className="absolute top-0 left-0 bg-brand text-white text-[11px] font-bold px-1.5 py-0.5 rounded-br">
            -{discount}%
          </span>
        )}

        <button
          type="button"
          aria-label={isWished ? 'Hapus dari wishlist' : 'Tambahkan ke wishlist'}
          aria-pressed={isWished}
          disabled={busy}
          onClick={async e => {
            e.preventDefault()
            e.stopPropagation()
            await toggleWishlist()
          }}
          className="absolute top-1.5 right-1.5 w-10 h-10 flex items-center justify-center rounded-full bg-white/95 shadow hover:bg-white transition-colors disabled:opacity-60"
        >
          <Heart className={cn('w-4 h-4', isWished ? 'fill-red-500 text-red-500' : 'text-gray-500')} />
        </button>
      </div>

      {/* Informasi */}
      <div className="p-2">
        <Link href={`/products/${product.slug}`}>
          <p className="text-gray-800 text-xs leading-snug line-clamp-2 min-h-[32px] hover:text-brand transition-colors">
            {product.name}
          </p>
        </Link>

        <p className="text-brand font-bold text-sm mt-1">{formatRupiah(product.price)}</p>
        {isOnSale && (
          <p className="text-gray-400 text-xs line-through">{formatRupiah(product.original_price!)}</p>
        )}

        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {product.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-600">{product.rating.toFixed(1)}</span>
            </span>
          )}
          <span className="text-gray-300 text-xs">•</span>
          <span className="text-xs text-gray-500">Terjual {sold}</span>
        </div>

        <div className="flex items-center gap-1 mt-1 text-gray-500">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="text-[11px] truncate">{location}</span>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock <= 0 || adding}
          className="mt-2 w-full min-h-[44px] flex items-center justify-center gap-1 bg-orange-50 hover:bg-brand hover:text-white text-brand border border-brand text-xs font-semibold rounded-sm transition-colors disabled:opacity-50 disabled:hover:bg-orange-50 disabled:hover:text-brand"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          {product.stock <= 0 ? 'Stok Habis' : adding ? 'Menambah...' : '+ Keranjang'}
        </button>
      </div>
    </article>
  )
}
