import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import HeroSection from '@/components/home/HeroSection'
import CategoriesSection from '@/components/home/CategoriesSection'
import FlashSale from '@/components/home/FlashSale'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import PromoSection from '@/components/home/PromoSection'
import type { Category, Product } from '@/types/database'

interface Props {
  searchParams?: { sale?: string | string[] }
}

export default async function HomePage({ searchParams }: Props) {
  const supabase = createClient()
  const focusSale = searchParams?.sale === '1'

  // Database kosong / error tidak boleh membuat halaman home crash.
  const [featuredResult, categoriesResult, saleResult] = await Promise.allSettled([
    supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .order('sold_count', { ascending: false })
      .limit(12),
    supabase.from('categories').select('*').order('name'),
    supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .not('original_price', 'is', null)
      .order('sold_count', { ascending: false })
      .limit(10),
  ])

  const featured = featuredResult.status === 'fulfilled' && !featuredResult.value.error
    ? (featuredResult.value.data ?? []) as Product[]
    : []
  const categories = categoriesResult.status === 'fulfilled' && !categoriesResult.value.error
    ? (categoriesResult.value.data ?? []) as Category[]
    : []
  const saleProducts = saleResult.status === 'fulfilled' && !saleResult.value.error
    ? (saleResult.value.data ?? []) as Product[]
    : []

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 bg-white px-3 py-2 rounded-sm border border-gray-100">
        <Link href="/" className="flex items-center gap-1 hover:text-brand">
          <Home className="w-3.5 h-3.5" /> Beranda
        </Link>
        {focusSale && (
          <>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="text-brand font-medium">Flash Sale</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-3">
        <aside className="hidden lg:block">
          <div className="bg-white rounded-sm py-2 sticky top-28 border border-gray-100">
            <p className="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-wide border-b border-gray-100">
              Kategori
            </p>
            <Link href="/products" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:text-brand hover:bg-orange-50 transition-colors">
              Semua Produk
            </Link>
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:text-brand hover:bg-orange-50 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
            <Link href="/?sale=1" className="flex items-center px-4 py-2.5 text-sm text-brand font-medium hover:bg-orange-50 transition-colors border-t border-gray-100 mt-1">
              Flash Sale
            </Link>
          </div>
        </aside>

        <main className="min-w-0">
          <HeroSection />
          <div className="mt-3">
            <CategoriesSection categories={categories} focusSale={focusSale} />
          </div>
          <FlashSale products={saleProducts} focusSale={focusSale} />
          <FeaturedProducts products={featured} highlightSale={focusSale} />
          <PromoSection />
        </main>
      </div>
    </div>
  )
}
