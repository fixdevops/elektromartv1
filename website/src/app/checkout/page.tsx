'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle, MapPin, Phone, User, FileText, CreditCard, Truck, Ticket, Upload, ArrowLeft, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { formatRupiah } from '@/lib/utils'
import { COURIERS, computeShipping, computeVoucherDiscount, orderCode } from '@/lib/commerce'
import { getAppliedVoucher, setAppliedVoucher } from '@/lib/voucher'
import type { Address, Voucher } from '@/types/database'
import toast from 'react-hot-toast'

const schema = z.object({
  shipping_name: z.string().min(2, 'Nama minimal 2 karakter'),
  shipping_phone: z.string().min(9, 'Nomor HP tidak valid'),
  shipping_address: z.string().min(10, 'Alamat terlalu pendek'),
  shipping_city: z.string().min(2, 'Kota wajib diisi'),
  shipping_postal: z.string().optional(),
  notes: z.string().optional(),
  payment_method: z.enum(['transfer_bank', 'cod', 'ewallet']),
  save_address: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

const payments = [
  { value: 'transfer_bank', label: 'Transfer Bank', icon: '🏦', detail: 'BCA 1234567890 a.n. ElektroMart' },
  { value: 'ewallet', label: 'E-Wallet (GoPay / OVO / DANA)', icon: '📱', detail: '0812-0000-1234 a.n. ElektroMart' },
  { value: 'cod', label: 'Bayar di Tempat (COD)', icon: '🏠', detail: 'Bayar saat kurir menyerahkan paket' },
] as const

export default function CheckoutPage() {
  const router = useRouter()
  const { items, selectedIds, selectedItems, selectedTotal, consumeCheckoutItems } = useCartStore()
  const { user, profile } = useAuthStore()
  const [submitting, setSubmitting] = useState(false)
  const [doneOrderId, setDoneOrderId] = useState<string | null>(null)
  const [courier, setCourier] = useState('reguler')
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [voucherCode, setVoucherCode] = useState('')
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [proofFile, setProofFile] = useState<File | null>(null)

  const chosen = useMemo(() => items.filter(i => selectedIds.includes(i.product_id)), [items, selectedIds])
  const subtotal = selectedTotal()
  const shipping = computeShipping(subtotal, courier)
  const discount = computeVoucherDiscount(voucher, subtotal)
  const total = Math.max(0, subtotal + shipping - discount)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_method: 'transfer_bank',
      shipping_name: profile?.full_name ?? '',
      shipping_address: profile?.address ?? '',
    },
  })
  const paymentMethod = watch('payment_method')

  useEffect(() => {
    const applied = getAppliedVoucher()
    if (applied) {
      setVoucher(applied)
      setVoucherCode(applied.code)
    }
    const supabase = createClient()
    supabase.from('vouchers').select('*').eq('is_active', true).then(({ data }) => setVouchers((data as Voucher[] | null) ?? []))
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('addresses').select('*').eq('user_id', data.user.id).then(({ data: addr }) => {
        const list = (addr as Address[] | null) ?? []
        setAddresses(list)
        const def = list.find(a => a.is_default) ?? list[0]
        if (def) {
          setValue('shipping_name', def.receiver_name)
          setValue('shipping_phone', def.phone)
          setValue('shipping_address', def.address)
          setValue('shipping_city', def.city)
          setValue('shipping_postal', def.postal_code)
        }
      })
    })
  }, [setValue])

  const applyVoucher = (code: string) => {
    const found = vouchers.find(v => v.code.toUpperCase() === code.trim().toUpperCase())
    if (!found) return toast.error('Kode voucher tidak ditemukan')
    if (computeVoucherDiscount(found, subtotal) <= 0) return toast.error('Voucher tidak bisa dipakai untuk transaksi ini')
    setVoucher(found)
    setVoucherCode(found.code)
    setAppliedVoucher(found)
    toast.success('Voucher berhasil dipakai')
  }

  const applyAddress = (a: Address) => {
    setValue('shipping_name', a.receiver_name)
    setValue('shipping_phone', a.phone)
    setValue('shipping_address', a.address)
    setValue('shipping_city', a.city)
    setValue('shipping_postal', a.postal_code)
  }

  const onSubmit = async (data: FormData) => {
    if (!user) return toast.error('Silakan masuk terlebih dahulu')
    if (!chosen.length) return toast.error('Keranjang belanja kosong')

    setSubmitting(true)
    const supabase = createClient()
    try {
      let proofUrl: string | null = null
      if (proofFile) {
        const ext = proofFile.name.split('.').pop() ?? 'jpg'
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(path, proofFile, { upsert: true, contentType: proofFile.type })
        if (uploadError) throw uploadError
        proofUrl = supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl
      }

      const { data: orderId, error } = await supabase.rpc('place_order', {
        p_items: chosen.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        p_shipping_name: data.shipping_name,
        p_shipping_phone: data.shipping_phone,
        p_shipping_address: data.shipping_address,
        p_shipping_city: data.shipping_city,
        p_shipping_postal: data.shipping_postal ?? '',
        p_notes: data.notes ?? '',
        p_payment_method: data.payment_method,
        p_payment_proof: proofUrl,
        p_courier: courier,
        p_shipping_fee: shipping,
        p_voucher_code: voucher?.code ?? null,
        p_discount_amount: discount,
      })

      if (error) throw error
      if (!orderId) throw new Error('Pesanan gagal dibuat')

      if (data.save_address) {
        await supabase.from('addresses').insert({
          user_id: user.id,
          label: 'Alamat Utama',
          receiver_name: data.shipping_name,
          phone: data.shipping_phone,
          address: data.shipping_address,
          city: data.shipping_city,
          postal_code: data.shipping_postal ?? '',
          is_default: addresses.length === 0,
        })
      }

      setAppliedVoucher(null)
      await consumeCheckoutItems()
      setDoneOrderId(String(orderId))
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Silakan coba lagi'
      toast.error(`Gagal membuat pesanan: ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (doneOrderId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-11 h-11 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Pesanan Berhasil Dibuat!</h2>
        <p className="text-gray-500 text-sm mb-1">Nomor pesanan <span className="font-semibold text-gray-700">{orderCode(doneOrderId)}</span></p>
        <p className="text-gray-500 text-sm mb-8">Selesaikan pembayaran sesuai metode yang dipilih, lalu unggah bukti transfer di halaman pesanan.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => router.push('/account')} className="btn-primary">Lihat Pesanan</button>
          <button onClick={() => router.push('/products')} className="btn-outline">Belanja Lagi</button>
        </div>
      </div>
    )
  }

  if (!chosen.length) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 mb-4">Tidak ada produk yang dipilih untuk checkout.</p>
        <Link href="/cart" className="btn-primary">Kembali ke Keranjang</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-3">
        <ArrowLeft className="w-4 h-4" /> Kembali ke keranjang
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Address */}
            <div className="card p-5">
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-brand" /> Alamat Pengiriman</h2>

              {addresses.length > 0 && (
                <div className="mb-4 space-y-2">
                  {addresses.map(a => (
                    <button type="button" key={a.id} onClick={() => applyAddress(a)} className="w-full text-left border border-gray-200 hover:border-brand rounded-sm p-3 text-xs">
                      <p className="font-semibold text-gray-700">{a.label} — {a.receiver_name}</p>
                      <p className="text-gray-500">{a.address}, {a.city} {a.postal_code}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5"><User className="w-3 h-3 inline mr-1" /> Nama Penerima</label>
                  <input {...register('shipping_name')} className="input" placeholder="Nama lengkap" />
                  {errors.shipping_name && <p className="text-red-500 text-xs mt-1">{errors.shipping_name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5"><Phone className="w-3 h-3 inline mr-1" /> Nomor HP</label>
                  <input {...register('shipping_phone')} className="input" placeholder="08123456789" />
                  {errors.shipping_phone && <p className="text-red-500 text-xs mt-1">{errors.shipping_phone.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1.5">Alamat Lengkap</label>
                  <textarea {...register('shipping_address')} rows={2} className="input resize-none" placeholder="Jl. Contoh No. 123, RT 01/RW 02" />
                  {errors.shipping_address && <p className="text-red-500 text-xs mt-1">{errors.shipping_address.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Kota</label>
                  <input {...register('shipping_city')} className="input" placeholder="Jakarta Selatan" />
                  {errors.shipping_city && <p className="text-red-500 text-xs mt-1">{errors.shipping_city.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Kode Pos</label>
                  <input {...register('shipping_postal')} className="input" placeholder="12345" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-500 mb-1.5"><FileText className="w-3 h-3 inline mr-1" /> Catatan (opsional)</label>
                  <input {...register('notes')} className="input" placeholder="Pesan khusus untuk kurir..." />
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" {...register('save_address')} className="accent-brand" /> Simpan alamat ini untuk berikutnya
                </label>
              </div>
            </div>

            {/* Shipping */}
            <div className="card p-5">
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-brand" /> Pengiriman</h2>
              <div className="grid sm:grid-cols-3 gap-2">
                {COURIERS.map(c => (
                  <label key={c.id} className={`border rounded-sm p-3 cursor-pointer text-xs ${courier === c.id ? 'border-brand bg-orange-50' : 'border-gray-200'}`}>
                    <span className="flex items-center gap-2 text-gray-700 font-medium">
                      <input type="radio" name="courier" checked={courier === c.id} onChange={() => setCourier(c.id)} className="accent-brand" />
                      {c.label}
                    </span>
                    <span className={`block mt-1.5 font-semibold ${computeShipping(subtotal, c.id) === 0 ? 'text-green-600' : 'text-brand'}`}>
                      {computeShipping(subtotal, c.id) === 0 ? 'GRATIS' : formatRupiah(c.fee)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="card p-5">
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-brand" /> Metode Pembayaran</h2>
              <div className="space-y-2">
                {payments.map(m => (
                  <label key={m.value} className={`flex items-center gap-3 p-3 border rounded-sm cursor-pointer ${paymentMethod === m.value ? 'border-brand bg-orange-50' : 'border-gray-200'}`}>
                    <input {...register('payment_method')} type="radio" value={m.value} className="accent-brand" />
                    <span className="text-xl">{m.icon}</span>
                    <span>
                      <span className="block text-sm font-medium text-gray-700">{m.label}</span>
                      <span className="block text-xs text-gray-500">{m.detail}</span>
                    </span>
                  </label>
                ))}
              </div>

              {paymentMethod !== 'cod' && (
                <div className="mt-4">
                  <label className="block text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Bukti pembayaran (opsional, bisa diunggah nanti)</label>
                  <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] ?? null)} className="text-xs text-gray-500 w-full max-w-full min-w-0" />
                  {proofFile && <p className="text-xs text-green-600 mt-1">File dipilih: {proofFile.name}</p>}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-4 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Pembayaran diproses manual oleh admin</p>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="card p-5 lg:sticky lg:top-24">
              <h2 className="text-base font-bold text-gray-800 mb-4">Ringkasan Pesanan</h2>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                {chosen.map(item => (
                  <div key={item.product_id} className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 rounded-sm overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                      <Image src={item.product.images?.[0] ?? '/placeholder.png'} alt={item.product.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 line-clamp-2">{item.product.name}</p>
                      <p className="text-xs text-gray-400">x{item.quantity}</p>
                    </div>
                    <span className="text-xs text-gray-700 font-medium flex-shrink-0">{formatRupiah(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><Ticket className="w-4 h-4 text-brand" /> Voucher</p>
                <div className="flex gap-2">
                  <input value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} className="input flex-1 py-2" placeholder="Kode voucher" />
                  <button type="button" onClick={() => applyVoucher(voucherCode)} className="px-3 bg-brand text-white text-xs font-semibold rounded-sm">Pakai</button>
                </div>
                {voucher && <p className="text-xs text-green-600 mt-1">{voucher.code} aktif</p>}
              </div>

              <div className="space-y-2 text-sm border-t border-dashed pt-3 mb-4">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="text-gray-700">{formatRupiah(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Diskon</span><span>-{formatRupiah(discount)}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Ongkir</span><span className={shipping === 0 ? 'text-green-600' : 'text-gray-700'}>{shipping === 0 ? 'GRATIS' : formatRupiah(shipping)}</span></div>
                <div className="flex justify-between font-bold pt-2 border-t"><span className="text-gray-800">Total</span><span className="text-brand text-lg">{formatRupiah(total)}</span></div>
              </div>

              <button type="submit" disabled={submitting || !user} className="btn-primary w-full">
                {submitting ? 'Memproses...' : !user ? 'Masuk untuk Melanjutkan' : 'Buat Pesanan'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
