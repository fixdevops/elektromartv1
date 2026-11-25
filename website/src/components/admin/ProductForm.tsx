'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { saveButton } from '@/lib/admin'
import type { Category, Product, ProductVariant } from '@/types/database'
import toast from 'react-hot-toast'

interface Props {
  categories: Category[]
  product?: Product
}

function parseLines(value: string): string[] {
  return value.split('\n').map(s => s.trim()).filter(Boolean)
}

export default function ProductForm({ categories, product }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    category_id: product?.category_id ?? '',
    description: product?.description ?? '',
    price: product?.price?.toString() ?? '',
    original_price: product?.original_price?.toString() ?? '',
    stock: product?.stock?.toString() ?? '0',
    brand: product?.brand ?? '',
    images: product?.images?.join('\n') ?? '',
    specifications: Object.entries(product?.specifications ?? {}).map(([k, v]) => `${k}=${v}`).join('\n'),
    variants: (product?.variants ?? []).map(v => `${v.name}: ${v.options.join(', ')}`).join('\n'),
    seller_name: product?.seller_name ?? 'ElektroMart Official',
    location: product?.location ?? 'Jakarta Pusat',
    is_featured: product?.is_featured ?? false,
    is_active: product?.is_active ?? true,
  })

  useEffect(() => {
    if (!product && form.name) {
      setForm(f => ({ ...f, slug: slugify(f.name) }))
    }
  }, [form.name, product])

  const set = (key: keyof typeof form, value: string | boolean) => setForm(f => ({ ...f, [key]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()

    const specs: Record<string, string> = {}
    parseLines(form.specifications).forEach(line => {
      const idx = line.indexOf('=')
      if (idx > 0) specs[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    })
    const variants: ProductVariant[] = parseLines(form.variants).map(line => {
      const [name, opts = ''] = line.split(':')
      return { name: name.trim(), options: opts.split(',').map(o => o.trim()).filter(Boolean) }
    }).filter(v => v.name && v.options.length)

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      category_id: form.category_id || null,
      description: form.description.trim() || null,
      price: Number(form.price),
      original_price: form.original_price ? Number(form.original_price) : null,
      stock: Number(form.stock),
      brand: form.brand.trim() || null,
      images: parseLines(form.images),
      specifications: specs,
      variants,
      seller_name: form.seller_name.trim() || 'ElektroMart Official',
      location: form.location.trim() || 'Jakarta Pusat',
      is_featured: form.is_featured,
      is_active: form.is_active,
      sku: product?.sku ?? `SKU-${Date.now()}`,
    }

    if (!payload.name || !payload.slug || !Number.isFinite(payload.price) || payload.price < 0) {
      setSaving(false)
      return toast.error('Nama, slug, dan harga wajib diisi dengan benar')
    }

    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload)

    setSaving(false)
    if (error) return toast.error(error.message)
    toast.success(product ? 'Produk diperbarui' : 'Produk ditambahkan')
    router.push('/admin/products')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-xs text-gray-600">Nama Produk *
          <input className="input mt-1" value={form.name} onChange={e => set('name', e.target.value)} required />
        </label>
        <label className="block text-xs text-gray-600">Slug
          <input className="input mt-1" value={form.slug} onChange={e => set('slug', slugify(e.target.value))} />
        </label>
        <label className="block text-xs text-gray-600">Kategori
          <select className="input mt-1" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">-- Pilih kategori --</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-xs text-gray-600">Brand
          <input className="input mt-1" value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Apple, Samsung, ..." />
        </label>
        <label className="block text-xs text-gray-600">Harga *
          <input className="input mt-1" type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)} required />
        </label>
        <label className="block text-xs text-gray-600">Harga Sebelumnya
          <input className="input mt-1" type="number" min="0" value={form.original_price} onChange={e => set('original_price', e.target.value)} />
        </label>
        <label className="block text-xs text-gray-600">Stok
          <input className="input mt-1" type="number" min="0" value={form.stock} onChange={e => set('stock', e.target.value)} />
        </label>
        <label className="block text-xs text-gray-600">Toko / Penjual
          <input className="input mt-1" value={form.seller_name} onChange={e => set('seller_name', e.target.value)} />
        </label>
        <label className="block text-xs text-gray-600">Lokasi
          <input className="input mt-1" value={form.location} onChange={e => set('location', e.target.value)} />
        </label>
      </div>

      <label className="block text-xs text-gray-600">Deskripsi
        <textarea className="input mt-1" rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
      </label>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-xs text-gray-600">URL Gambar (satu per baris)
          <textarea className="input mt-1 font-mono" rows={4} value={form.images} onChange={e => set('images', e.target.value)} placeholder={'https://...\nhttps://...'} />
        </label>
        <label className="block text-xs text-gray-600">Spesifikasi (key=value per baris)
          <textarea className="input mt-1 font-mono" rows={4} value={form.specifications} onChange={e => set('specifications', e.target.value)} placeholder={'ram=12GB\nstorage=256GB'} />
        </label>
      </div>

      <label className="block text-xs text-gray-600">Varian (Nama: opsi1, opsi2 per baris)
        <textarea className="input mt-1" rows={3} value={form.variants} onChange={e => set('variants', e.target.value)} placeholder={'Warna: Titanium, Hitam\nStorage: 256GB, 512GB'} />
      </label>

      <div className="flex gap-5 text-sm text-gray-600">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={e => set('is_featured', e.target.checked)} className="accent-brand" /> Produk unggulan</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="accent-brand" /> Aktif ditampilkan</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary text-sm py-2.5">{saving ? 'Menyimpan...' : saveButton(!!product)}</button>
        <button type="button" onClick={() => router.back()} className="btn-outline text-sm py-2.5">Batal</button>
      </div>
    </form>
  )
}
