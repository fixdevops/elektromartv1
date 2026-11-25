import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Star, ChevronRight, Store, ShieldCheck, Truck, RefreshCw, Tag, MapPin,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductGallery from '@/components/products/ProductGallery'
import ProductActions from '@/components/products/ProductActions'
import ProductCard from '@/components/products/ProductCard'
import ReviewSection from '@/components/products/ReviewSection'
import { formatRupiah, discountPercent, cn } from '@/lib/utils'
import type { Product, Review, Category } from '@/types/database'

interface Props {
  params: { slug: string }
}

type ReviewAuthor = { id: string; full_name: string | null; avatar_url: string | null }

export default async function ProductDetailPage({ params }: Props) {
  const supabase = createClient()

  const { data: productData } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!productData) notFound()

  const p = productData as Product
  const category = p.category as Category | undefined

  const [{ data: reviewRows }, { data: relatedData }] = await Promise.all([
    supabase.from('reviews').select('*').eq('product_id', p.id).order('created_at', { ascending: false }).limit(20),
    p.category_id
      ? supabase.from('products').select('*').eq('category_id', p.category_id).eq('is_active', true).neq('id', p.id).order('sold_count', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
  ])

  const reviewList = (reviewRows ?? []) as Review[]
  const authorIds = Array.from(new Set(reviewList.map(review => review.user_id)))
  let authorRows: ReviewAuthor[] = []
  if (authorIds.length) {
    const { data } = await supabase
      .from('review_authors')
      .select('id, full_name, avatar_url')
      .in('id', authorIds)
    authorRows = (data ?? []) as ReviewAuthor[]
  }
  const authorMap = new Map(authorRows.map(author => [author.id, author]))
  const reviews: Review[] = reviewList.map(review => ({
    ...review,
    profile: authorMap.get(review.user_id) ?? { full_name: 'Pengguna ElektroMart', avatar_url: null },
  }))

  const related = (relatedData ?? []) as Product[]
  const isOnSale = Boolean(p.original_price && p.original_price > p.price)
  const discount = isOnSale ? discountPercent(p.original_price!, p.price) : 0
  const sold = Math.max(0, p.sold_count ?? 0)

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 bg-white px-3 py-2 rounded-sm border border-gray-100 flex-wrap">
        <Link href="/" className="flex items-center gap-1 hover:text-brand">
          Beranda
        </Link>
        {category && (
          <>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <Link href={`/products?category=${category.slug}`} className="hover:text-brand">
              {category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-gray-700 truncate max-w-[220px] sm:max-w-md">{p.name}</span>
      </nav>

      {/* Informasi utama */}
      <div className="bg-white rounded-sm border border-gray-200 p-4 mb-3">
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
          <ProductGallery images={p.images ?? []} name={p.name} discount={discount} />

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-medium text-gray-800 mb-3 leading-snug">{p.name}</h1>

            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-brand font-bold underline">{p.rating > 0 ? p.rating.toFixed(1) : '0.0'}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={cn(
                        'w-3.5 h-3.5',
                        star <= Math.round(p.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
                      )}
                    />
                  ))}
                </div>
              </div>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600 text-sm">{p.review_count ?? 0} Penilaian</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600 text-sm">Terjual {sold}</span>
            </div>

            <div className="bg-orange-50 border border-orange-100 px-4 py-4 rounded-sm mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-bold text-brand">{formatRupiah(p.price)}</span>
                {isOnSale && (
                  <>
                    <span className="text-gray-400 text-base line-through">{formatRupiah(p.original_price!)}</span>
                    <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded">{discount}% OFF</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2.5 mb-5 text-sm">
              <div className="flex gap-3">
                <span className="text-gray-500 w-28 flex-shrink-0">Pengiriman</span>
                <div className="flex items-center gap-1.5 text-gray-700 flex-wrap">
                  <Truck className="w-4 h-4 text-brand" />
                  <span>Gratis ongkir min. Rp 500.000</span>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28 flex-shrink-0">Dikirim dari</span>
                <div className="flex items-center gap-1.5 text-gray-700">
                  <MapPin className="w-4 h-4 text-brand" />
                  <span>{p.location || 'Jakarta Pusat'}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28 flex-shrink-0">Toko</span>
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Store className="w-4 h-4 text-brand" />
                  <span className="font-medium">{p.seller_name || 'ElektroMart Official'}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28 flex-shrink-0">Stok</span>
                <span className={cn('font-medium', p.stock > 0 ? 'text-green-600' : 'text-red-500')}>
                  {p.stock > 0 ? `${p.stock} tersedia` : 'Habis'}
                </span>
              </div>
              {p.brand && (
                <div className="flex gap-3">
                  <span className="text-gray-500 w-28 flex-shrink-0">Merek</span>
                  <div className="flex items-center gap-1 text-brand">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="font-medium">{p.brand}</span>
                  </div>
                </div>
              )}
            </div>

            <ProductActions product={p} variants={p.variants ?? []} />

            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
              {[
                { icon: ShieldCheck, label: 'Garansi Resmi' },
                { icon: RefreshCw, label: '7 Hari Return' },
                { icon: Store, label: '100% Original' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 text-center">
                  <Icon className="w-5 h-5 text-brand" />
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Deskripsi & spesifikasi */}
      <div className="bg-white rounded-sm border border-gray-200 p-5 mb-3">
        <h2 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 relative">
          <span className="absolute bottom-[-1px] left-0 w-24 h-0.5 bg-brand" />
          Detail Produk
        </h2>
        {p.description ? (
          <p className="text-sm text-gray-600 mb-4 leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">{p.description}</p>
        ) : (
          <p className="text-sm text-gray-500 mb-4">Deskripsi produk belum tersedia.</p>
        )}
        {p.specifications && Object.keys(p.specifications).length > 0 && (
          <div className="grid sm:grid-cols-2 gap-x-8">
            {Object.entries(p.specifications).map(([key, value]) => (
              <div key={key} className="flex py-2 border-b border-gray-50 gap-3">
                <span className="text-gray-500 text-sm w-32 sm:w-40 flex-shrink-0 capitalize">{key}</span>
                <span className="text-gray-800 text-sm min-w-0 break-words [overflow-wrap:anywhere]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ulasan */}
      <div className="bg-white rounded-sm border border-gray-200 p-5 mb-3">
        <ReviewSection product={p} reviews={reviews} />
      </div>

      {/* Produk serupa */}
      {related.length > 0 && (
        <section className="bg-white rounded-sm border border-gray-200 p-4">
          <h2 className="text-base font-bold text-gray-800 mb-4">Produk Serupa</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-l border-gray-100">
            {related.map(item => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
