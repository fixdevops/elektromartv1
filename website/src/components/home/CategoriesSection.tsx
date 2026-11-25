import Link from 'next/link'
import {
  Smartphone, Laptop, Headphones, Watch, Package, LayoutGrid, Zap,
  Camera, Gamepad2, Tv,
} from 'lucide-react'
import type { Category } from '@/types/database'

const icons: Record<string, React.ElementType> = {
  smartphones: Smartphone,
  laptops: Laptop,
  audio: Headphones,
  'smart-watches': Watch,
  accessories: Package,
  tv: Tv,
  camera: Camera,
  gaming: Gamepad2,
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'smartphones', name: 'Smartphone', slug: 'smartphones', description: null, image_url: null, created_at: '' },
  { id: 'laptops', name: 'Laptop', slug: 'laptops', description: null, image_url: null, created_at: '' },
  { id: 'audio', name: 'Audio', slug: 'audio', description: null, image_url: null, created_at: '' },
  { id: 'smart-watches', name: 'Smart Watch', slug: 'smart-watches', description: null, image_url: null, created_at: '' },
  { id: 'accessories', name: 'Aksesori', slug: 'accessories', description: null, image_url: null, created_at: '' },
]

interface Props {
  categories: Category[]
  focusSale?: boolean
}

export default function CategoriesSection({ categories, focusSale = false }: Props) {
  const list = categories?.length ? categories : FALLBACK_CATEGORIES

  return (
    <section className="bg-white rounded-sm p-4 mb-3">
      <div className="section-header">
        <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide relative pl-3 before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-brand before:rounded">
          Kategori
        </h2>
        <Link href="/products" className="text-brand text-xs font-medium hover:underline">
          Semua Kategori
        </Link>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-1">
        <Link
          href="/products"
          className="flex flex-col items-center gap-2 p-2 rounded-sm hover:bg-orange-50 transition-colors group"
        >
          <span className="w-12 h-12 bg-orange-50 group-hover:bg-orange-100 rounded-full flex items-center justify-center transition-colors">
            <LayoutGrid className="w-6 h-6 text-brand" />
          </span>
          <span className="text-xs text-gray-700 text-center leading-tight">Semua Kategori</span>
        </Link>

        {list.map(cat => {
          const Icon = icons[cat.slug] ?? Package
          return (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 p-2 rounded-sm hover:bg-orange-50 transition-colors group"
            >
              <span className="w-12 h-12 bg-orange-50 group-hover:bg-orange-100 rounded-full flex items-center justify-center transition-colors">
                <Icon className="w-6 h-6 text-brand" />
              </span>
              <span className="text-xs text-gray-700 text-center leading-tight">{cat.name}</span>
            </Link>
          )
        })}

        <Link
          href="/?sale=1"
          className="flex flex-col items-center gap-2 p-2 rounded-sm hover:bg-orange-50 transition-colors group"
        >
          <span className="w-12 h-12 bg-brand/10 group-hover:bg-brand/20 rounded-full flex items-center justify-center transition-colors">
            <Zap className={focusSale ? 'w-6 h-6 text-brand fill-brand' : 'w-6 h-6 text-brand'} />
          </span>
          <span className="text-xs text-brand font-medium text-center leading-tight">Flash Sale</span>
        </Link>
      </div>
    </section>
  )
}
