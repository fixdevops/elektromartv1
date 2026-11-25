import { createClient } from '@/lib/supabase/server'
import ProductForm from '@/components/admin/ProductForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Category } from '@/types/database'

export default async function NewProductPage() {
  const { data } = await createClient().from('categories').select('*').order('name')

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-3"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Tambah Produk Baru</h1>
      <ProductForm categories={(data as Category[] | null) ?? []} />
    </div>
  )
}
