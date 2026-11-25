'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  images: string[]
  name: string
  discount?: number
}

const PLACEHOLDER = '/placeholder.png'

export default function ProductGallery({ images, name, discount }: Props) {
  const gallery = images?.length ? images : [PLACEHOLDER]
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState<Record<number, boolean>>({})

  const currentSrc = failed[active] ? PLACEHOLDER : gallery[active]
  const move = (step: number) => setActive(index => (index + step + gallery.length) % gallery.length)

  return (
    <div>
      <div className="relative aspect-square rounded-sm overflow-hidden border border-gray-200 bg-gray-50 mb-3">
        <Image
          src={currentSrc}
          alt={name}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain p-2"
          unoptimized
          onError={() => setFailed(prev => ({ ...prev, [active]: true }))}
        />
        {Boolean(discount && discount > 0) && (
          <span className="absolute top-3 left-3 bg-brand text-white text-sm font-bold px-2 py-1 rounded-sm">
            -{discount}%
          </span>
        )}
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto sebelumnya"
              onClick={() => move(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Foto berikutnya"
              onClick={() => move(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="absolute bottom-3 right-3 bg-black/55 text-white text-[11px] px-2 py-0.5 rounded-full">
              {active + 1} / {gallery.length}
            </span>
          </>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              aria-label={`Lihat foto ${index + 1}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
              className={cn(
                'relative w-16 h-16 flex-shrink-0 rounded-sm overflow-hidden border-2 bg-gray-50 transition-colors',
                index === active ? 'border-brand' : 'border-gray-200 hover:border-brand/60',
              )}
            >
              <Image
                src={failed[index] ? PLACEHOLDER : src}
                alt={`${name} foto ${index + 1}`}
                fill
                sizes="64px"
                className="object-contain"
                unoptimized
                onError={() => setFailed(prev => ({ ...prev, [index]: true }))}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
