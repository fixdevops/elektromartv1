import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Package, ShoppingCart, Users, Ticket, Plus, ArrowRight } from 'lucide-react'

export default async function AdminPage() {
  const supabase = createClient()

  const [
    { count: productCount },
    { count: orderCount },
    { count: userCount },
    { count: pendingCount },
    { data: recentOrders },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('id, shipping_name, shipping_city, status, total_amount, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Total Produk', value: productCount ?? 0, icon: Package, color: 'text-brand bg-orange-50' },
    { label: 'Total Pesanan', value: orderCount ?? 0, icon: ShoppingCart, color: 'text-green-600 bg-green-50' },
    { label: 'Total Pengguna', value: userCount ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Perlu Dibayar', value: pendingCount ?? 0, icon: Ticket, color: 'text-yellow-600 bg-yellow-50' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard Admin</h1>
          <p className="text-xs text-gray-500 mt-0.5">Kelola toko ElektroMart</p>
        </div>
        <Link href="/admin/products/new" className="btn-primary flex items-center gap-2 text-sm py-2.5">
          <Plus className="w-4 h-4" /> Tambah Produk
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map(s => (
          <div key={s.label} className="card p-4 shopee-shadow">
            <div className={`w-9 h-9 rounded-sm flex items-center justify-center mb-3 ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { href: '/admin/products', label: 'Kelola Produk', desc: 'Tambah, edit, hapus produk', icon: Package },
          { href: '/admin/orders', label: 'Kelola Pesanan', desc: 'Update status & resi', icon: ShoppingCart },
          { href: '/admin/users', label: 'Kelola Pengguna', desc: 'Lihat pengguna & role', icon: Users },
          { href: '/admin/vouchers', label: 'Kelola Voucher', desc: 'Buat promo & diskon', icon: Ticket },
        ].map(link => (
          <Link key={link.href} href={link.href} className="card p-4 hover:border-brand transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 rounded-sm flex items-center justify-center group-hover:bg-orange-100"><link.icon className="w-5 h-5 text-brand" /></div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1">{link.label} <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-brand" /></h3>
                <p className="text-[11px] text-gray-500">{link.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Pesanan Terbaru</h2>
          <Link href="/admin/orders" className="text-xs text-brand hover:underline">Lihat Semua</Link>
        </div>
        {recentOrders && recentOrders.length > 0 ? (
          <div className="divide-y">
            {recentOrders.map(order => (
              <div key={order.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-700">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{order.shipping_name} • {order.shipping_city}</p>
                </div>
                <div className="text-right">
                  <span className="badge bg-orange-50 text-brand border-orange-200 capitalize">{order.status}</span>
                  <p className="text-xs text-gray-600 mt-1 font-medium">Rp {Number(order.total_amount).toLocaleString('id-ID')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="p-8 text-center text-gray-400 text-sm">Belum ada pesanan</p>}
      </div>
    </div>
  )
}
