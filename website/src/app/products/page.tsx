import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronRight, Home, Search, SlidersHorizontal, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/products/ProductCard'
import ProductFilters from '@/components/products/ProductFilters'
import type { Product, Category } from '@/types/database'
import { cn } from '@/lib/utils'

interface Props {
  searchParams?: Partial<Record<string, string | string[]>>
}

const PAGE_SIZE = 20
const EMPTY_UUID = '00000000-0000-0000-0000-000000000000'

const first = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? '' : value ?? '')

type PageItem = number | 'ellipsis'

function paginationItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: PageItem[] = [1]
  if (current > 3) items.push('ellipsis')
  const from = Math.max(2, current - 1)
  const to = Math.min(total - 1, current + 1)
  for (let p = from; p <= to; p++) items.push(p)
  if (current < total - 2) items.push('ellipsis')
  items.push(total)
  return items
}

export default async function ProductsPage({ searchParams }: Props) {
  const supabase = createClient()
  const q = first(searchParams?.q).trim()
  const categorySlug = first(searchParams?.category)
  const sort = first(searchParams?.sort) || 'sold_desc'
  const rawPage = Number.parseInt(first(searchParams?.page), 10)
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(rawPage, 1000) : 1

  const rawMin = first(searchParams?.min_price)
  const rawMax = first(searchParams?.max_price)
  const minPrice = rawMin !== '' && Number.isFinite(Number(rawMin)) && Number(rawMin) >= 0 ? Number(rawMin) : undefined
  const maxPrice = rawMax !== '' && Number.isFinite(Number(rawMax)) && Number(rawMax) >= 0 ? Number(rawMax) : undefined
  const brands = first(searchParams?.brand).split(',').map(b => b.trim()).filter(Boolean)
  const rawRating = Number(first(searchParams?.min_rating))
  const minRating = Number.isFinite(rawRating) && rawRating >= 1 && rawRating <= 5 ? rawRating : undefined

  const [{ data: categoriesData }, { data: brandsData }, { data: selectedCategory }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('products').select('brand').eq('is_active', true).not('brand', 'is', null).order('brand'),
    categorySlug
      ? supabase.from('categories').select('id, name, slug').eq('slug', categorySlug).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const categories = (categoriesData ?? []) as Category[]
  const brandNames = Array.from(new Set((brandsData ?? []).map(row => row.brand as string).filter(Boolean)))
  const categoryName = selectedCategory?.name

  const buildQuery = () => {
    let query = supabase
      .from('products')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('is_active', true)

    if (categorySlug) query = query.eq('category_id', selectedCategory?.id ?? EMPTY_UUID)
    if (q) query = query.ilike('name', `%${q.replace(/[%_]/g, '\\$&')}%`)
    if (minPrice !== undefined) query = query.gte('price', minPrice)
    if (maxPrice !== undefined) query = query.lte('price', maxPrice)
    if (brands.length) query = query.in('brand', brands)
    if (minRating !== undefined) query = query.gte('rating', minRating)

    return query
  }

  const buildSortedQuery = () => {
    let query = buildQuery()
    switch (sort) {
      case 'price_asc': query = query.order('price', { ascending: true }); break
      case 'price_desc': query = query.order('price', { ascending: false }); break
      case 'newest': query = query.order('created_at', { ascending: false }); break
      case 'rating': query = query.order('rating', { ascending: false }); break
      case 'sold_desc':
      default: query = query.order('sold_count', { ascending: false }); break
    }
    return query
  }

  const { data, count, error } = await buildSortedQuery()
    .range((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE - 1)

  const total = error ? 0 : count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  let products = (error ? [] : data ?? []) as Product[]

  if (page !== requestedPage) {
    const clamped = await buildSortedQuery()
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)
    products = (clamped.data ?? []) as Product[]
  }

  const sortOptions = [
    { label: 'Terlaris', value: 'sold_desc' },
    { label: 'Terbaru', value: 'newest' },
    { label: 'Harga Terendah', value: 'price_asc' },
    { label: 'Harga Tertinggi', value: 'price_desc' },
  ]

  const buildHref = (overrides: Record<string, string>) => {
    const base: Record<string, string> = {}
    if (q) base.q = q
    if (categorySlug) base.category = categorySlug
    if (rawMin) base.min_price = rawMin
    if (rawMax) base.max_price = rawMax
    if (brands.length) base.brand = brands.join(',')
    if (minRating !== undefined) base.min_rating = String(minRating)
    base.sort = sort
    const params = new URLSearchParams()
    Object.entries({ ...base, ...overrides }).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const queryString = params.toString()
    return `/products${queryString ? `?${queryString}` : ''}`
  }

  const heading = q ? `Hasil pencarian: "${q}"` : categoryName ?? 'Semua Produk'

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-gray-500 mb-3 bg-white px-3 py-2 rounded-sm border border-gray-100 flex-wrap">
        <Link href="/" className="flex items-center gap-1 hover:text-brand">
          <Home className="w-3.5 h-3.5" /> Beranda
        </Link>
        {categoryName && (
          <>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <Link href={`/products?category=${categorySlug}`} className="hover:text-brand">{categoryName}</Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-gray-700 font-medium truncate max-w-[240px]">
          {q ? `Pencarian: "${q}"` : 'Semua Produk'}
        </span>
      </nav>

      <div className="flex gap-3">
        {/* Sidebar filter */}
        <aside className="w-52 flex-shrink-0 hidden md:block">
          <Suspense fallback={<div className="bg-white rounded-sm border border-gray-200 p-4 text-xs text-gray-500">Memuat filter...</div>}>
            <ProductFilters
              categories={categories}
              brands={brandNames}
              currentCategory={categorySlug}
              currentSort={sort}
              currentQuery={q}
            />
          </Suspense>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Filter mobile */}
          <details className="md:hidden mb-3 bg-white rounded-sm border border-gray-200">
            <summary className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-800 cursor-pointer">
              <SlidersHorizontal className="w-4 h-4 text-brand" /> Filter Produk
            </summary>
            <div className="p-2 border-t border-gray-100">
              <Suspense fallback={<div className="p-3 text-xs text-gray-500">Memuat filter...</div>}>
                <ProductFilters
                  categories={categories}
                  brands={brandNames}
                  currentCategory={categorySlug}
                  currentSort={sort}
                  currentQuery={q}
                />
              </Suspense>
            </div>
          </details>

          <div className="bg-white rounded-sm border border-gray-200 mb-3">
            <div className="px-4 py-3 border-b border-gray-100">
              <h1 className="text-base font-bold text-gray-800 truncate">{heading}</h1>
            </div>
            <div className="px-3 sm:px-4 py-2.5 flex items-center gap-2 flex-wrap bg-orange-50/50">
              <span className="text-sm text-gray-600 font-medium">Urutkan:</span>
              {sortOptions.map(option => (
                <Link
                  key={option.value}
                  href={buildHref({ sort: option.value, page: '1' })}
                  className={cn(
                    'text-xs sm:text-sm px-3 py-1.5 rounded-sm transition-colors border',
                    sort === option.value
                      ? 'bg-brand text-white border-brand font-medium'
                      : 'bg-white text-gray-700 border-gray-200 hover:text-brand hover:border-brand',
                  )}
                >
                  {option.label}
                </Link>
              ))}
              <span className="ml-auto text-xs text-gray-500">{total} produk ditemukan</span>
            </div>
          </div>

          {error ? (
            <div className="bg-white rounded-sm border border-gray-200 py-16 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium">Produk belum dapat dimuat</p>
              <p className="text-sm text-gray-500 mt-1">Terjadi kendala saat mengambil data. Silakan coba lagi.</p>
              <Link href="/products" className="inline-block mt-4 text-brand text-sm hover:underline">
                Lihat semua produk
              </Link>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-sm border border-gray-200 py-16 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-700 font-medium">Produk tidak ditemukan</p>
              <p className="text-sm text-gray-500 mt-1">Coba ubah kata kunci atau filter pencarianmu.</p>
              <Link href="/products" className="inline-block mt-4 bg-brand text-white text-sm font-semibold px-5 py-2 rounded-sm hover:bg-brand-dark">
                Lihat Semua Produk
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-sm border border-gray-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Halaman produk" className="flex justify-center items-center gap-1.5 mt-4 flex-wrap">
                  {page > 1 && (
                    <Link href={buildHref({ page: String(page - 1) })} aria-label="Halaman sebelumnya" className="w-9 h-9 rounded-sm flex items-center justify-center text-sm border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand">
                      ‹
                    </Link>
                  )}
                  {paginationItems(page, totalPages).map((item, index) => item === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="w-8 h-9 flex items-center justify-center text-sm text-gray-400">…</span>
                  ) : (
                    <Link
                      key={item}
                      href={buildHref({ page: String(item) })}
                      aria-current={item === page ? 'page' : undefined}
                      className={cn(
                        'w-9 h-9 rounded-sm flex items-center justify-center text-sm border transition-colors',
                        item === page
                          ? 'bg-brand text-white border-brand font-semibold'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-brand hover:text-brand',
                      )}
                    >
                      {item}
                    </Link>
                  ))}
                  {page < totalPages && (
                    <Link href={buildHref({ page: String(page + 1) })} aria-label="Halaman berikutnya" className="w-9 h-9 rounded-sm flex items-center justify-center text-sm border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand">
                      ›
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
