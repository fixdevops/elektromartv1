import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Category, Product } from '@/types/database'

interface Props { params: { id: string } }

export default async function EditProductPage({ params }: Props) {
  const supabase = createClient()
  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('categories').select('*').order('name'),
  ])
  if (!product) notFound()

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <Link href="/admin/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-3"><ArrowLeft className="w-4 h-4" /> Kembali</Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Edit Produk</h1>
      <ProductForm categories={(categories as Category[] | null) ?? []} product={product as Product} />
    </div>
  )
}
