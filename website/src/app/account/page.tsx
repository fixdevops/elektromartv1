'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { formatRupiah } from '@/lib/utils'
import { formatDateID, orderCode, ORDER_STATUS, STATUS_FLOW } from '@/lib/commerce'
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronDown, Upload, Star, MapPin } from 'lucide-react'
import type { Order, OrderStatusEvent } from '@/types/database'
import toast from 'react-hot-toast'

export default function AccountPage() {
  const { user, profile } = useAuthStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [proofFile, setProofFile] = useState<Record<string, File>>({})
  const [reviewText, setReviewText] = useState<Record<string, string>>({})
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({})
  const userId = user?.id

  const loadOrders = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, product:products(name, images, slug)), order_status_history(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) toast.error('Gagal memuat pesanan')
    setOrders((data as Order[] | null) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { void loadOrders() }, [loadOrders])

  const uploadProof = async (order: Order) => {
    const file = proofFile[order.id]
    if (!user || !file) return toast.error('Pilih file bukti transfer terlebih dahulu')
    const supabase = createClient()
    const path = `${user.id}/${order.id}-${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`
    const { error: upErr } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: true })
    if (upErr) return toast.error(upErr.message)
    const url = supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl
    const { error } = await supabase.rpc('mark_order_paid', { p_order_id: order.id, p_payment_proof: url })
    if (error) return toast.error(error.message)
    toast.success('Bukti pembayaran terkirim')
    setProofFile(prev => ({ ...prev, [order.id]: undefined as never }))
    await loadOrders()
  }

  const cancel = async (order: Order) => {
    const supabase = createClient()
    const { error } = await supabase.rpc('cancel_order', { p_order_id: order.id })
    if (error) return toast.error(error.message)
    toast.success('Pesanan dibatalkan')
    await loadOrders()
  }

  const submitReview = async (order: Order, productId: string) => {
    if (!user) return
    const supabase = createClient()
    const rating = reviewRating[`${order.id}-${productId}`] ?? 5
    const comment = reviewText[`${order.id}-${productId}`]?.trim()
    const { error } = await supabase.from('reviews').upsert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment || 'Produk bagus, sesuai deskripsi.',
    }, { onConflict: 'product_id,user_id' })
    if (error) return toast.error(error.message)
    toast.success('Terima kasih atas ulasanmu!')
    await loadOrders()
  }

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <div className="bg-white rounded-sm border border-gray-100 p-4 sm:p-5 mb-4 shopee-shadow flex flex-wrap items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-orange-50 text-brand flex items-center justify-center text-xl font-bold">
          {(profile?.full_name ?? user.email ?? 'U').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-gray-800 truncate">{profile?.full_name ?? 'Pengguna ElektroMart'}</h1>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 min-w-0"><MapPin className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{profile?.address || 'Alamat belum diisi'}</span></p>
        </div>
        <Link href="/wishlist" className="ml-auto text-xs text-brand font-semibold hover:underline">Wishlist saya →</Link>
      </div>

      <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2"><Package className="w-5 h-5 text-brand" /> Pesanan Saya ({orders.length})</h2>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card h-28 animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-gray-700 font-semibold mb-2">Belum ada pesanan</h3>
          <p className="text-gray-400 text-sm mb-4">Kamu belum pernah melakukan pembelian</p>
          <Link href="/products" className="btn-primary inline-block">Mulai Belanja</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const status = ORDER_STATUS[order.status]
            const history = (order.order_status_history ?? []) as OrderStatusEvent[]
            const isOpen = openId === order.id
            return (
              <div key={order.id} className="card">
                <button onClick={() => setOpenId(isOpen ? null : order.id)} className="w-full p-4 text-left">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                      <span className="text-xs text-gray-400">{formatDateID(order.created_at, true)}</span>
                      <span className="text-xs text-gray-700 font-semibold break-all">{orderCode(order.id)}</span>
                    </div>
                    <span className={`badge whitespace-nowrap shrink-0 ${status?.badge}`}>{status?.label ?? order.status}</span>
                  </div>
                  {order.order_items?.slice(0, 3).map(item => (
                    <div key={item.id} className="flex items-center gap-3 mt-3">
                      <div className="relative w-12 h-12 border border-gray-100 rounded-sm overflow-hidden bg-gray-50 flex-shrink-0">
                        <Image src={item.product?.images?.[0] ?? '/placeholder.png'} alt={item.product?.name ?? 'Produk'} fill className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700 line-clamp-1">{item.product?.name ?? 'Produk'}</p>
                        <p className="text-xs text-gray-400">x{item.quantity}</p>
                      </div>
                      <span className="text-sm text-gray-700">{formatRupiah(item.unit_price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center justify-between gap-1 mt-3 pt-3 border-t border-gray-50 text-xs">
                    <span className="text-gray-400 min-w-0 break-words">{status?.description}</span>
                    <span className="text-brand font-bold text-sm shrink-0">{formatRupiah(order.total_amount)}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-gray-400 mt-2">
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    <span className="text-[11px]">{isOpen ? 'Tutup detail' : 'Lihat detail'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t px-4 py-4 space-y-4 bg-gray-50/50">
                    {/* Timeline */}
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-3">Status Pesanan</p>
                      <div className="space-y-3">
                        {STATUS_FLOW.map((s, i) => {
                          const currentIndex = STATUS_FLOW.indexOf(order.status)
                          const done = order.status !== 'cancelled' && i <= currentIndex
                          const event = history.find(h => h.status === s)
                          return (
                            <div key={s} className="flex gap-3 items-start">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-brand text-white' : 'bg-gray-200 text-gray-400'}`}>
                                {s === 'pending' ? <Clock className="w-3 h-3" /> : s === 'shipped' ? <Truck className="w-3 h-3" /> : s === 'delivered' ? <CheckCircle className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-medium ${done ? 'text-gray-700' : 'text-gray-400'}`}>{ORDER_STATUS[s].label}</p>
                                {event && <p className="text-[11px] text-gray-400">{formatDateID(event.created_at, true)}{event.note ? ` — ${event.note}` : ''}</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white border border-gray-100 rounded-sm p-3">
                        <p className="text-gray-400 mb-1">Alamat pengiriman</p>
                        <p className="text-gray-700 font-medium">{order.shipping_name} — {order.shipping_phone}</p>
                        <p className="text-gray-500 break-words">{order.shipping_address}, {order.shipping_city} {order.shipping_postal}</p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-sm p-3 space-y-1">
                        <p className="text-gray-400">Metode: {order.payment_method?.replace('_', ' ')}</p>
                        <p className="text-gray-400">Kurir: {order.courier ?? 'Reguler'}</p>
                        {order.voucher_code && <p className="text-green-600">Voucher: {order.voucher_code} (-{formatRupiah(order.discount_amount)})</p>}
                        {order.tracking_number && <p className="text-gray-700">Resi: {order.tracking_number}</p>}
                        <p className="text-gray-500">Ongkir: {formatRupiah(order.shipping_fee ?? 0)}</p>
                      </div>
                    </div>

                    {/* Items + review */}
                    {order.order_items?.map(item => (
                      <div key={item.id} className="bg-white border border-gray-100 rounded-sm p-3 flex gap-3">
                        <div className="relative w-14 h-14 border border-gray-100 rounded-sm overflow-hidden bg-gray-50 flex-shrink-0">
                          <Image src={item.product?.images?.[0] ?? '/placeholder.png'} alt={item.product?.name ?? 'Produk'} fill className="object-cover" unoptimized />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 line-clamp-1">{item.product?.name}</p>
                          <p className="text-xs text-gray-400">{item.quantity} x {formatRupiah(item.unit_price)}</p>
                          {order.status === 'delivered' && item.product && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {[1, 2, 3, 4, 5].map(n => (
                                <button key={n} onClick={() => setReviewRating(prev => ({ ...prev, [`${order.id}-${item.product_id}`]: n }))} className="min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={`Beri ${n} bintang`}>
                                  <Star className={`w-4 h-4 ${n <= (reviewRating[`${order.id}-${item.product_id}`] ?? 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                </button>
                              ))}
                              <input
                                value={reviewText[`${order.id}-${item.product_id}`] ?? ''}
                                onChange={e => setReviewText(prev => ({ ...prev, [`${order.id}-${item.product_id}`]: e.target.value }))}
                                placeholder="Tulis ulasan..."
                                className="input py-1 text-xs w-full min-w-0 sm:flex-1 sm:min-w-32"
                              />
                              <button onClick={() => submitReview(order, item.product_id)} className="text-xs bg-brand text-white px-4 py-2.5 rounded-sm shrink-0">Kirim</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Proof upload */}
                    {order.status === 'pending' && order.payment_method !== 'cod' && (
                      <div className="bg-white border border-dashed border-orange-200 rounded-sm p-3">
                        <p className="text-xs text-gray-600 mb-2 flex items-center gap-1"><Upload className="w-3.5 h-3.5 text-brand" /> Unggah bukti pembayaran</p>
                        <div className="flex flex-wrap gap-2">
                          <input type="file" accept="image/*" onChange={e => setProofFile(prev => ({ ...prev, [order.id]: e.target.files?.[0] as never }))} className="text-xs w-full max-w-full min-w-0 sm:flex-1" />
                          <button onClick={() => uploadProof(order)} className="text-xs bg-brand text-white px-4 py-2.5 rounded-sm shrink-0">Kirim</button>
                        </div>
                        {order.payment_proof && <a href={order.payment_proof} target="_blank" rel="noreferrer" className="text-xs text-brand underline mt-2 inline-block">Lihat bukti yang sudah diunggah</a>}
                      </div>
                    )}

                    {(order.status === 'pending' || order.status === 'paid') && (
                      <button onClick={() => cancel(order)} className="text-xs text-red-500 hover:underline flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Batalkan pesanan</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
