'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RotateCcw, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/database'

interface Props {
  categories: Category[]
  brands?: string[]
  currentCategory?: string
  currentSort?: string
  currentQuery?: string
}

export default function ProductFilters({
  categories,
  brands = [],
  currentCategory,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') ?? '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') ?? '')
  const selectedBrands = (searchParams.get('brand') ?? '').split(',').filter(Boolean)
  const currentRating = searchParams.get('min_rating') ?? ''

  useEffect(() => {
    setMinPrice(searchParams.get('min_price') ?? '')
    setMaxPrice(searchParams.get('max_price') ?? '')
  }, [searchParams])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }

  const applyPrice = () => {
    const params = new URLSearchParams(searchParams.toString())
    const min = Number(minPrice)
    const max = Number(maxPrice)
    const validMin = minPrice.trim() !== '' && Number.isFinite(min) && min >= 0 ? String(Math.floor(min)) : ''
    const validMax = maxPrice.trim() !== '' && Number.isFinite(max) && max >= 0 ? String(Math.floor(max)) : ''
    if (validMin && validMax && Number(validMin) > Number(validMax)) {
      params.set('min_price', validMax)
      params.set('max_price', validMin)
    } else {
      if (validMin) params.set('min_price', validMin)
      else params.delete('min_price')
      if (validMax) params.set('max_price', validMax)
      else params.delete('max_price')
    }
    params.delete('page')
    router.push(`/products?${params.toString()}`)
  }

  const toggleBrand = (brand: string) => {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand]
    updateFilter('brand', next.join(','))
  }

  const resetFilters = () => {
    const query = searchParams.get('q')
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products')
  }

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">Filter Pencarian</span>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        {/* Kategori */}
        <div className="py-2 border-b border-gray-100">
          <p className="px-4 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Kategori</p>
          <button
            type="button"
            onClick={() => updateFilter('category', '')}
            className={cn(
              'w-full text-left px-4 py-2 text-sm transition-colors border-l-2',
              !currentCategory
                ? 'text-brand bg-orange-50 border-brand font-medium'
                : 'text-gray-700 hover:bg-gray-50 border-transparent',
            )}
          >
            Semua Kategori
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateFilter('category', cat.slug)}
              className={cn(
                'w-full text-left px-4 py-2 text-sm transition-colors border-l-2',
                currentCategory === cat.slug
                  ? 'text-brand bg-orange-50 border-brand font-medium'
                  : 'text-gray-700 hover:bg-gray-50 border-transparent',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Harga */}
        <div className="py-3 px-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Harga</p>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="Rp Min"
              className="input !px-2 !py-1.5 text-xs min-w-0"
              aria-label="Harga minimum"
            />
            <span className="text-gray-400 text-xs">–</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Rp Max"
              className="input !px-2 !py-1.5 text-xs min-w-0"
              aria-label="Harga maksimum"
            />
          </div>
          <button
            type="button"
            onClick={applyPrice}
            className="mt-2 w-full bg-brand text-white text-xs font-semibold py-1.5 rounded-sm hover:bg-brand-dark transition-colors"
          >
            Terapkan
          </button>
        </div>

        {/* Merek */}
        {brands.length > 0 && (
          <div className="py-2 border-b border-gray-100">
            <p className="px-4 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Merek</p>
            {brands.map(brand => {
              const active = selectedBrands.includes(brand)
              return (
                <button
                  key={brand}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleBrand(brand)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <span className={cn(
                    'w-3.5 h-3.5 border rounded-sm flex items-center justify-center flex-shrink-0 text-[10px]',
                    active ? 'bg-brand border-brand text-white' : 'border-gray-300 bg-white',
                  )}>
                    {active ? '✓' : ''}
                  </span>
                  <span className={cn('truncate', active && 'text-brand font-medium')}>{brand}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Rating */}
        <div className="py-2">
          <p className="px-4 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Rating</p>
          {['4', '3', '2'].map(rating => (
            <button
              key={rating}
              type="button"
              onClick={() => updateFilter('min_rating', currentRating === rating ? '' : rating)}
              className={cn(
                'w-full flex items-center gap-1 px-4 py-2 text-sm transition-colors',
                currentRating === rating ? 'text-brand bg-orange-50 font-medium' : 'text-gray-700 hover:bg-gray-50',
              )}
            >
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              {rating} ke atas
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
