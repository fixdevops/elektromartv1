import Link from 'next/link'
import { Flame, ArrowRight } from 'lucide-react'
import ProductCard from '@/components/products/ProductCard'
import type { Product } from '@/types/database'

interface Props {
  products: Product[]
  highlightSale?: boolean
}

export default function FeaturedProducts({ products, highlightSale = false }: Props) {
  return (
    <section className="bg-white rounded-sm p-4 mb-3">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-base sm:text-lg font-bold text-brand uppercase tracking-wide">
            <Flame className="w-5 h-5" />
            {highlightSale ? 'Produk Terlaris' : 'Produk Pilihan'}
          </h2>
          <span className="text-xs text-gray-500">
            {highlightSale ? 'Paling banyak dibeli' : 'Rekomendasi untukmu'}
          </span>
        </div>
        <Link href="/products" className="flex items-center gap-1 text-brand text-xs font-medium hover:underline">
          Lihat Semua <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-sm">
          <p className="text-sm font-medium text-gray-700">Belum ada produk untuk ditampilkan</p>
          <p className="text-xs text-gray-500 mt-1">Silakan lihat seluruh katalog produk kami.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 border border-gray-100 rounded-sm overflow-hidden">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  )
}
