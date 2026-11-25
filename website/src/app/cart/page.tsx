'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Trash2, ShoppingBag, Minus, Plus, Tag, Check, X, Ticket, Truck } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { formatRupiah } from '@/lib/utils'
import { COURIERS, FREE_SHIPPING_MIN, computeShipping, computeVoucherDiscount } from '@/lib/commerce'
import { getAppliedVoucher, setAppliedVoucher } from '@/lib/voucher'
import { createClient } from '@/lib/supabase/client'
import type { Voucher } from '@/types/database'
import toast from 'react-hot-toast'

export default function CartPage() {
  const {
    items, selectedIds, buyNowBackup, toggleSelect, selectAll,
    removeItem, updateQuantity, clearItems, cancelBuyNow,
  } = useCartStore()
  const [courier, setCourier] = useState<string>('reguler')
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [voucherCode, setVoucherCode] = useState('')
  const [voucher, setVoucher] = useState<Voucher | null>(null)

  useEffect(() => {
    setVoucher(getAppliedVoucher())
    createClient().from('vouchers').select('*').eq('is_active', true).then(({ data }) => {
      setVouchers((data as Voucher[] | null) ?? [])
    })
  }, [])

  const selectedItems = useMemo(
    () => items.filter(i => selectedIds.includes(i.product_id)),
    [items, selectedIds]
  )
  const subtotal = selectedItems.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const shipping = computeShipping(subtotal, courier)
  const discount = computeVoucherDiscount(voucher, subtotal)
  const total = Math.max(0, subtotal + shipping - discount)
  const allSelected = items.length > 0 && selectedIds.length === items.length

  const applyVoucher = (code: string) => {
    const found = vouchers.find(v => v.code.toUpperCase() === code.trim().toUpperCase())
    if (!found) return toast.error('Kode voucher tidak ditemukan')
    const potongan = computeVoucherDiscount(found, subtotal)
    if (potongan <= 0) return toast.error('Voucher tidak bisa dipakai untuk transaksi ini')
    setVoucher(found)
    setAppliedVoucher(found)
    setVoucherCode(found.code)
    toast.success(`Voucher dipakai, hemat ${formatRupiah(potongan)}`)
  }

  const handleCheckout = () => {
    if (!selectedItems.length) return toast.error('Pilih minimal satu produk')
    void setAppliedVoucher(voucher)
    window.location.href = '/checkout'
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-20 h-20 text-gray-200 mx-auto mb-5" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Keranjang Belanja Kosong</h2>
        <p className="text-gray-400 mb-8 text-sm">Yuk mulai belanja dan tambahkan produk ke keranjang!</p>
        <Link href="/products" className="btn-primary">Belanja Sekarang</Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 pb-24 lg:pb-4">
      {buyNowBackup && (
        <div className="bg-orange-50 border border-orange-200 rounded-sm px-4 py-3 mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-orange-700 min-w-0 flex-1">Mode Beli Sekarang — hanya produk ini yang akan dipesan.</span>
          <button onClick={cancelBuyNow} className="flex shrink-0 items-center gap-1 text-brand font-semibold p-2 -m-2">
            <X className="w-4 h-4" /> Kembali ke keranjang
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <div className="bg-white rounded-sm border border-gray-100 px-4 py-3 flex items-center gap-3 shopee-shadow">
            <button onClick={() => selectAll(!allSelected)} aria-label="Pilih semua" className="p-2 -m-2">
              {allSelected
                ? <Check className="w-5 h-5 text-brand border border-brand rounded-sm" />
                : <span className="w-5 h-5 border border-gray-300 rounded-sm block" />}
            </button>
            <span className="text-sm text-gray-700 font-medium">Pilih Semua ({items.length})</span>
            {selectedIds.length > 0 && (
              <button
                onClick={() => { void clearItems(selectedIds); toast.success('Produk terpilih dihapus') }}
                className="ml-auto text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 p-2 -m-2"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            )}
          </div>

          {items.map(item => (
            <div key={item.product_id} className="bg-white rounded-sm border border-gray-100 shopee-shadow">
              <div className="flex gap-3 p-3 sm:p-4">
                <button onClick={() => toggleSelect(item.product_id)} className="flex-shrink-0 mt-1 p-2 -m-2" aria-label="Pilih produk">
                  {selectedIds.includes(item.product_id)
                    ? <Check className="w-5 h-5 text-brand border border-brand rounded-sm" />
                    : <span className="w-5 h-5 border border-gray-300 rounded-sm block" />}
                </button>

                <Link href={`/products/${item.product.slug}`} className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 border border-gray-100 rounded overflow-hidden bg-gray-50">
                  <Image src={item.product.images?.[0] ?? '/placeholder.png'} alt={item.product.name} fill className="object-cover" unoptimized />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product.slug}`} className="text-sm text-gray-700 hover:text-brand line-clamp-2">
                    {item.product.name}
                  </Link>
                  {item.variant && <p className="text-xs text-gray-400 mt-0.5">Varian: {item.variant}</p>}
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Truck className="w-3 h-3" /> {item.product.location || 'Jakarta Pusat'}</p>
                  <div className="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-brand font-bold min-w-0 break-all">{formatRupiah(item.product.price)}</span>
                    <div className="flex flex-shrink-0 items-center border border-gray-200 rounded-sm overflow-hidden">
                      <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)} className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 sm:w-9 text-center text-sm text-gray-700">{item.quantity}</span>
                      <button
                        onClick={() => {
                          if (item.quantity >= item.product.stock) toast.error(`Stok hanya ${item.product.stock}`)
                          else updateQuantity(item.product_id, item.quantity + 1)
                        }}
                        className="w-9 h-9 sm:w-7 sm:h-7 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <button onClick={() => removeItem(item.product_id)} className="text-gray-300 hover:text-red-400 self-start p-2 -m-2" aria-label="Hapus produk">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="bg-white rounded-sm border border-gray-100 shopee-shadow p-4 lg:sticky lg:top-24">
            <h2 className="text-base font-bold text-gray-800 mb-4 pb-3 border-b">Ringkasan Belanja</h2>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><Ticket className="w-4 h-4 text-brand" /> Voucher</p>
              <div className="flex gap-2">
                <input
                  value={voucherCode}
                  onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode"
                  className="input flex-1 py-2"
                />
                <button onClick={() => applyVoucher(voucherCode)} className="px-3 bg-brand text-white text-xs font-semibold rounded-sm">Pakai</button>
              </div>
              {voucher && (
                <div className="mt-2 flex items-center justify-between bg-orange-50 border border-orange-100 px-2 py-1.5 rounded-sm">
                  <span className="text-xs text-orange-700 truncate">{voucher.code} — hemat {formatRupiah(computeVoucherDiscount(voucher, subtotal))}</span>
                  <button onClick={() => { setVoucher(null); setAppliedVoucher(null); setVoucherCode('') }} className="text-orange-500"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              {vouchers.length > 0 && !voucher && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {vouchers.slice(0, 3).map(v => (
                    <button key={v.code} onClick={() => applyVoucher(v.code)} className="text-[11px] border border-dashed border-brand text-brand px-2 py-0.5 rounded-sm">
                      {v.code}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1"><Truck className="w-4 h-4 text-brand" /> Pengiriman</p>
              <div className="space-y-1">
                {COURIERS.map(c => (
                  <label key={c.id} className="flex items-center justify-between text-xs py-1.5 cursor-pointer">
                    <span className="flex items-center gap-2 text-gray-600">
                      <input type="radio" name="courier" checked={courier === c.id} onChange={() => setCourier(c.id)} className="accent-brand" />
                      {c.label}
                    </span>
                    <span className={courier === c.id ? 'text-brand font-semibold' : 'text-gray-500'}>
                      {c.id === 'reguler' && subtotal >= FREE_SHIPPING_MIN ? 'GRATIS' : formatRupiah(c.fee)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-4 text-sm pt-3 border-t border-dashed">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal ({selectedItems.reduce((s, i) => s + i.quantity, 0)} barang)</span>
                <span className="text-gray-700">{formatRupiah(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon voucher</span><span>-{formatRupiah(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Ongkos Kirim</span>
                <span className={shipping === 0 ? 'text-green-600 font-medium' : 'text-gray-700'}>
                  {shipping === 0 ? 'GRATIS' : formatRupiah(shipping)}
                </span>
              </div>
              {courier === 'reguler' && subtotal < FREE_SHIPPING_MIN && (
                <p className="text-xs text-gray-400 bg-green-50 px-3 py-1.5 rounded-sm">
                  Tambah {formatRupiah(FREE_SHIPPING_MIN - subtotal)} lagi untuk gratis ongkir
                </p>
              )}
            </div>

            <div className="flex justify-between font-bold text-base mb-4 pt-3 border-t">
              <span className="text-gray-800">Total Pembayaran</span>
              <span className="text-brand">{formatRupiah(total)}</span>
            </div>

            <button onClick={handleCheckout} disabled={!selectedItems.length} className="btn-primary w-full text-sm disabled:bg-gray-300">
              Beli ({selectedItems.reduce((s, i) => s + i.quantity, 0)} barang)
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t px-3 pt-3 flex items-center gap-3 z-40 shopee-shadow"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex-1">
          <p className="text-[11px] text-gray-500">Total ({selectedItems.length})</p>
          <p className="text-brand font-bold">{formatRupiah(total)}</p>
        </div>
        <button onClick={handleCheckout} disabled={!selectedItems.length} className="btn-primary px-6 py-2.5 text-sm disabled:bg-gray-300">Checkout</button>
      </div>
    </div>
  )
}
