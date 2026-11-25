'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Flame, Sparkles, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

const banners = [
  {
    id: 1,
    tag: 'PRODUK BARU',
    title: 'iPhone 15 Pro Max',
    subtitle: 'Titanium yang ringan, kamera Pro, dan performa luar biasa.',
    cta: 'Beli Sekarang',
    href: '/products/iphone-15-pro-max',
    bg: 'from-gray-900 via-slate-800 to-gray-900',
    accent: 'bg-blue-500',
    img: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600',
  },
  {
    id: 2,
    tag: 'PROMO SPESIAL',
    title: 'Samsung Galaxy S24 Ultra',
    subtitle: 'Kamera 200MP, S Pen bawaan, dan layar terbaik di kelasnya.',
    cta: 'Lihat Penawaran',
    href: '/products/samsung-s24-ultra',
    bg: 'from-indigo-950 via-purple-900 to-indigo-950',
    accent: 'bg-brand',
    img: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600',
  },
  {
    id: 3,
    tag: 'PILIHAN PRO',
    title: 'MacBook Pro M3',
    subtitle: 'Performa monster untuk kebutuhan kerja dan kreativitasmu.',
    cta: 'Cek Spesifikasi',
    href: '/products/macbook-pro-14-m3',
    bg: 'from-zinc-900 via-neutral-800 to-zinc-900',
    accent: 'bg-orange-500',
    img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
  },
]

export default function HeroSection() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((index: number) => {
    setCurrent((index + banners.length) % banners.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const timer = window.setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000)
    return () => window.clearInterval(timer)
  }, [paused])

  const banner = banners[current]

  return (
    <div
      className={cn('relative overflow-hidden rounded-sm bg-gradient-to-r transition-all duration-700', banner.bg)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      role="region"
      aria-label="Promo unggulan"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center min-h-[280px] sm:min-h-[330px] py-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35 }}
              className="flex-1 z-10 max-w-lg lg:pr-[34%] xl:pr-0"
            >
              <span className={cn('inline-flex items-center gap-1 text-white text-[11px] font-bold px-2.5 py-1 rounded-sm mb-4 tracking-wide', banner.accent)}>
                {current === 0 ? <Sparkles className="w-3 h-3" /> : current === 1 ? <Tag className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                {banner.tag}
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
                {banner.title}
              </h1>
              <p className="text-sm sm:text-base text-white/75 mb-6 max-w-md leading-relaxed">
                {banner.subtitle}
              </p>
              <Link
                href={banner.href}
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-bold px-6 py-3 rounded-sm text-sm transition-colors shadow-lg shadow-black/20"
              >
                {banner.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${banner.id}-img`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.4 }}
              className="hidden sm:block absolute right-2 bottom-0 w-44 sm:w-56 lg:w-[240px] xl:w-[380px] h-full"
            >
              <Image
                src={banner.img}
                alt={banner.title}
                fill
                sizes="(max-width: 640px) 176px, (max-width: 1280px) 240px, 380px"
                className="object-contain object-right-bottom drop-shadow-2xl"
                unoptimized
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Panah */}
      <button
        type="button"
        aria-label="Slide sebelumnya"
        onClick={() => goTo(current - 1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex w-9 h-9 rounded-full bg-black/25 hover:bg-black/45 text-white items-center justify-center transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Slide berikutnya"
        onClick={() => goTo(current + 1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex w-9 h-9 rounded-full bg-black/25 hover:bg-black/45 text-white items-center justify-center transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
      </button>

      {/* Dot indikator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {banners.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Tampilkan promo ${i + 1}`}
            aria-current={i === current}
            onClick={() => goTo(i)}
            className="group py-3 flex items-center"
          >
            <span className={cn(
              'block h-2 rounded-full transition-all duration-300',
              i === current ? 'w-6 bg-white' : 'w-2 bg-white/45 group-hover:bg-white/75',
            )} />
          </button>
        ))}
      </div>
    </div>
  )
}
