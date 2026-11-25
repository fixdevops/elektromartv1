'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ArrowLeft, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'
import { formatDateID, orderCode, ORDER_STATUS } from '@/lib/commerce'
import type { Order, OrderStatus } from '@/types/database'
import toast from 'react-hot-toast'

const statuses: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  const load = async () => {
    const { data, error } = await createClient()
      .from('orders')
      .select('*, order_items(*, product:products(name)), order_status_history(*)')
      .order('created_at', { ascending: false })
    if (error) toast.error(error.message)
    setOrders((data as Order[] | null) ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const updateStatus = async (order: Order, status: OrderStatus) => {
    if (order.status === 'cancelled') return toast.error('Pesanan yang dibatalkan tidak dapat diubah')
    const { error } = await createClient().rpc('update_order_status', {
      p_order_id: order.id,
      p_status: status,
      p_note: null,
      p_tracking_number: status === 'shipped' ? tracking[order.id] ?? null : null,
    })
    if (error) return toast.error(error.message)
    toast.success('Status pesanan diperbarui')
    await load()
  }

  const filtered = orders.filter(o =>
    o.shipping_name.toLowerCase().includes(query.toLowerCase()) ||
    o.id.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-3"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Kelola Pesanan</h1>

      <div className="card">
        <div className="p-3 border-b">
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama / ID pesanan" className="input pl-9" />
          </div>
        </div>

        {loading ? <div className="p-8 text-center text-sm text-gray-400">Memuat...</div> : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">Belum ada pesanan</div>
        ) : (
          <div className="divide-y">
            {filtered.map(order => (
              <div key={order.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 break-all">{orderCode(order.id)} <span className="text-xs font-normal text-gray-400 break-words">• {formatDateID(order.created_at, true)}</span></p>
                    <p className="text-xs text-gray-500 mt-0.5 break-words">{order.shipping_name} — {order.shipping_city} • {order.payment_method?.replace('_', ' ')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge whitespace-nowrap ${ORDER_STATUS[order.status].badge}`}>{ORDER_STATUS[order.status].label}</span>
                    <span className="text-sm font-bold text-brand shrink-0">{formatRupiah(order.total_amount)}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={order.status}
                    disabled={order.status === 'cancelled'}
                    onChange={e => updateStatus(order, e.target.value as OrderStatus)}
                    className="input !w-auto py-1.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {statuses.map(s => <option key={s} value={s}>{ORDER_STATUS[s].label}</option>)}
                  </select>
                  {!['shipped', 'delivered', 'cancelled'].includes(order.status) && (
                    <div className="flex items-center gap-1">
                      <input
                        value={tracking[order.id] ?? order.tracking_number ?? ''}
                        onChange={e => setTracking(prev => ({ ...prev, [order.id]: e.target.value }))}
                        placeholder="No. resi"
                        className="input !w-40 py-1.5 text-xs"
                      />
                    </div>
                  )}
                  {order.tracking_number && (
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> {order.tracking_number}</span>
                  )}
                  <button onClick={() => setOpenId(openId === order.id ? null : order.id)} className="text-xs text-brand hover:underline ml-auto">
                    {openId === order.id ? 'Tutup' : 'Detail item'}
                  </button>
                </div>

                {openId === order.id && (
                  <div className="mt-3 bg-gray-50 rounded-sm p-3 space-y-2">
                    {order.order_items?.map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-gray-600">
                        <span>{item.product?.name ?? 'Produk'} x {item.quantity}</span>
                        <span>{formatRupiah(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 text-xs text-gray-500">
                      <p>{order.shipping_address}, {order.shipping_city} {order.shipping_postal}</p>
                      {order.notes && <p>Catatan: {order.notes}</p>}
                      {order.payment_proof && <a href={order.payment_proof} target="_blank" rel="noreferrer" className="text-brand underline">Lihat bukti pembayaran</a>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
