'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Pencil, Trash2, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'
import type { Product } from '@/types/database'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data, error } = await createClient().from('products').select('*, category:categories(name)').order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setProducts((data as Product[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const remove = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return
    const { error } = await createClient().from('products').delete().eq('id', id)
    if (error) return toast.error(error.message)
    toast.success('Produk dihapus')
    await load()
  }

  const toggleActive = async (p: Product) => {
    const { error } = await createClient().from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    if (error) return toast.error(error.message)
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !p.is_active } : x))
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-xl font-bold text-gray-800">Kelola Produk</h1>
        <Link href="/admin/products/new" className="btn-primary flex items-center gap-2 text-sm py-2.5"><Plus className="w-4 h-4" /> Tambah Produk</Link>
      </div>

      <div className="card">
        <div className="p-3 border-b">
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari produk..." className="input pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">Produk tidak ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Produk</th>
                  <th className="text-left px-4 py-3">Kategori</th>
                  <th className="text-right px-4 py-3">Harga</th>
                  <th className="text-center px-4 py-3">Stok</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 border border-gray-100 rounded-sm overflow-hidden bg-gray-50 flex-shrink-0">
                          <Image src={p.images?.[0] ?? '/placeholder.png'} alt={p.name} fill className="object-cover" unoptimized />
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-700 font-medium line-clamp-1 max-w-xs">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.brand ?? '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{(p.category as unknown as { name?: string } | null)?.name ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(p.price)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.stock}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(p)} className={`badge ${p.is_active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/products/${p.id}/edit`} className="p-2 -m-1 text-gray-400 hover:text-brand" aria-label="Edit"><Pencil className="w-4 h-4" /></Link>
                        <button onClick={() => remove(p.id, p.name)} className="p-2 -m-1 text-gray-400 hover:text-red-500" aria-label="Hapus"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
