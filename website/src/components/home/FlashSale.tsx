'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, ArrowRight } from 'lucide-react'
import { formatRupiah, discountPercent } from '@/lib/utils'
import type { Product } from '@/types/database'

interface Props {
  products: Product[]
  focusSale?: boolean
}

function getTimeLeft() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const totalSeconds = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  }
}

function Countdown() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    setTime(getTimeLeft())
    const timer = window.setInterval(() => setTime(getTimeLeft()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-center gap-1 text-sm font-bold" aria-label="Waktu tersisa flash sale">
      {[['Jam', time.h], ['Menit', time.m], ['Detik', time.s]].map(([label, value]) => (
        <span key={label as string} className="flex items-center gap-1">
          <span className="bg-gray-900 text-white px-1.5 py-0.5 rounded text-xs tabular-nums">
            {pad(value as number)}
          </span>
          {label !== 'Detik' && <span className="text-gray-900 text-xs">:</span>}
        </span>
      ))}
    </div>
  )
}

export default function FlashSale({ products, focusSale = false }: Props) {
  const saleProducts = useMemo(
    () => products.filter(p => p?.original_price && p.original_price > p.price).slice(0, 10),
    [products],
  )

  useEffect(() => {
    if (!focusSale) return
    const target = document.getElementById('flash-sale')
    if (target) {
      window.requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }, [focusSale, saleProducts.length])

  return (
    <section id="flash-sale" className="bg-white rounded-sm p-4 mb-3 scroll-mt-32">
      {focusSale && (
        <div className="mb-3 bg-orange-50 border border-orange-100 text-brand text-xs px-3 py-2 rounded-sm">
          Menampilkan penawaran Flash Sale hari ini. Berakhir pada tengah malam.
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-brand text-white px-3 py-1.5 rounded-sm">
          <Zap className="w-4 h-4 fill-white" />
          <span className="font-extrabold text-base uppercase tracking-wider">Flash Sale</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <span>Berakhir dalam</span>
          <Countdown />
        </div>
        <Link href="/?sale=1" className="ml-auto flex items-center gap-1 text-brand text-xs font-medium hover:underline">
          Lihat Semua <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {saleProducts.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-sm">
          <p className="text-sm font-medium text-gray-700">Belum ada promo Flash Sale saat ini</p>
          <p className="text-xs text-gray-500 mt-1">Nantikan penawaran spesial berikutnya.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
          {saleProducts.map(p => {
            const disc = discountPercent(p.original_price!, p.price)
            const sold = Math.max(0, p.sold_count ?? 0)
            const stock = Math.max(0, p.stock ?? 0)
            const target = sold + stock
            const progress = target > 0 ? Math.min(100, Math.round((sold / target) * 100)) : 0

            return (
              <Link key={p.id} href={`/products/${p.slug}`} className="flex-shrink-0 w-36 sm:w-40 group">
                <div className="border border-gray-100 rounded-sm overflow-hidden hover:shadow-md hover:border-brand/30 transition-all h-full">
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    <Image
                      src={p.images?.[0] || '/placeholder.png'}
                      alt={p.name}
                      fill
                      sizes="160px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute top-0 left-0 bg-brand text-white text-xs font-bold px-1.5 py-0.5 rounded-br">
                      -{disc}%
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-brand font-bold text-sm">{formatRupiah(p.price)}</p>
                    <p className="text-gray-400 text-xs line-through">{formatRupiah(p.original_price!)}</p>
                    <div className="mt-1.5">
                      <div className="bg-orange-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-brand-light to-brand h-full rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Terjual {sold}</p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
