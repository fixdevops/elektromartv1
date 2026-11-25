'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'
import { formatDateID } from '@/lib/commerce'
import type { Voucher } from '@/types/database'
import toast from 'react-hot-toast'

const empty = {
  code: '', description: '', discount_type: 'fixed' as 'fixed' | 'percent', value: '',
  min_spend: '0', max_discount: '', expires_at: '', usage_limit: '',
}

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [form, setForm] = useState(empty)
  const [showForm, setShowForm] = useState(false)

  const load = async () => {
    const { data } = await createClient().from('vouchers').select('*').order('created_at', { ascending: false })
    setVouchers((data as Voucher[] | null) ?? [])
  }
  useEffect(() => { void load() }, [])

  const set = (k: keyof typeof empty, v: string) => setForm(f => ({ ...f, [k]: v }))

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await createClient().from('vouchers').insert({
      code: form.code.toUpperCase().trim(),
      description: form.description.trim(),
      discount_type: form.discount_type,
      value: Number(form.value),
      min_spend: Number(form.min_spend),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : new Date(Date.now() + 30 * 864e5).toISOString(),
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      is_active: true,
    })
    if (error) return toast.error(error.message)
    toast.success('Voucher dibuat')
    setForm(empty)
    setShowForm(false)
    await load()
  }

  const remove = async (code: string) => {
    const { error } = await createClient().from('vouchers').delete().eq('code', code)
    if (error) return toast.error(error.message)
    toast.success('Voucher dihapus')
    await load()
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-3"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Kelola Voucher</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2.5 flex items-center gap-2"><Plus className="w-4 h-4" /> Buat Voucher</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card p-5 mb-4 grid sm:grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">Kode *<input className="input mt-1 uppercase" value={form.code} onChange={e => set('code', e.target.value)} required /></label>
          <label className="text-xs text-gray-600">Deskripsi<input className="input mt-1" value={form.description} onChange={e => set('description', e.target.value)} /></label>
          <label className="text-xs text-gray-600">Tipe
            <select className="input mt-1" value={form.discount_type} onChange={e => set('discount_type', e.target.value)}>
              <option value="fixed">Nominal (Rp)</option><option value="percent">Persentase (%)</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">Nilai *<input className="input mt-1" type="number" value={form.value} onChange={e => set('value', e.target.value)} required /></label>
          <label className="text-xs text-gray-600">Min. Belanja<input className="input mt-1" type="number" value={form.min_spend} onChange={e => set('min_spend', e.target.value)} /></label>
          <label className="text-xs text-gray-600">Maks. Diskon (persen)<input className="input mt-1" type="number" value={form.max_discount} onChange={e => set('max_discount', e.target.value)} /></label>
          <label className="text-xs text-gray-600">Berlaku sampai<input className="input mt-1" type="datetime-local" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} /></label>
          <label className="text-xs text-gray-600">Batas Pemakaian<input className="input mt-1" type="number" value={form.usage_limit} onChange={e => set('usage_limit', e.target.value)} /></label>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary text-sm py-2.5">Simpan</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm py-2.5">Batal</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {vouchers.length === 0 && <div className="card p-10 text-center text-sm text-gray-500">Belum ada voucher</div>}
        {vouchers.map(v => (
          <div key={v.code} className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-orange-50 text-brand flex items-center justify-center"><Ticket className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">{v.code}</p>
              <p className="text-xs text-gray-500">{v.description || '-'}</p>
              <p className="text-[11px] text-gray-400">Min. {formatRupiah(v.min_spend)} • s/d {formatDateID(v.expires_at)} • {v.used_count}/{v.usage_limit ?? '∞'} dipakai</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-brand">{v.discount_type === 'fixed' ? formatRupiah(v.value) : `${v.value}%`}</p>
              <button onClick={() => remove(v.code)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
