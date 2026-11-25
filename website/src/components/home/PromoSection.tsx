import Link from 'next/link'
import {
  Truck, ShieldCheck, RefreshCw, Headphones, Smartphone, Laptop, Watch, Zap,
} from 'lucide-react'

const promos = [
  { icon: Smartphone, title: 'Smartphone', desc: 'Flash Sale Hari Ini', href: '/products?category=smartphones', color: 'bg-blue-50 border-blue-100 text-blue-600' },
  { icon: Laptop, title: 'Laptop', desc: 'Diskon spesial', href: '/products?category=laptops', color: 'bg-purple-50 border-purple-100 text-purple-600' },
  { icon: Headphones, title: 'Audio', desc: 'Hemat hingga 40%', href: '/products?category=audio', color: 'bg-green-50 border-green-100 text-green-600' },
  { icon: Watch, title: 'Smart Watch', desc: 'Cicilan 0%', href: '/products?category=smart-watches', color: 'bg-orange-50 border-orange-100 text-brand' },
]

const features = [
  { icon: Truck, label: 'Gratis Ongkir', sub: 'Min. pembelian Rp 500.000', color: 'text-brand' },
  { icon: ShieldCheck, label: 'Garansi Resmi', sub: 'Semua produk bergaransi', color: 'text-green-600' },
  { icon: RefreshCw, label: 'Mudah Return', sub: '7 hari pengembalian', color: 'text-blue-600' },
  { icon: Headphones, label: 'Support 24/7', sub: 'Siap membantu kapanpun', color: 'text-purple-600' },
]

export default function PromoSection() {
  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        {promos.map(({ icon: Icon, title, desc, href, color }) => (
          <Link
            key={title}
            href={href}
            className={`${color} border rounded-sm p-3 sm:p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all bg-white`}
          >
            <span className="w-11 h-11 flex-shrink-0 rounded-full bg-white/80 flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-gray-800 text-sm leading-tight">{title}</span>
              <span className="block text-xs font-medium text-brand leading-tight">{desc}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="bg-white rounded-sm p-4 mb-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, label, sub, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{label}</p>
                <p className="text-xs text-gray-500 leading-tight">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="shopee-gradient rounded-sm p-6 text-center text-white mb-3">
        <p className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-extrabold mb-1">
          <Zap className="w-5 h-5 fill-white" /> Daftar Sekarang & Dapatkan Voucher
        </p>
        <p className="text-white/85 mb-4 text-sm">Diskon Rp 50.000 untuk pembelian pertamamu</p>
        <Link href="/auth/register" className="inline-block bg-white text-brand font-bold px-8 py-3 rounded-sm hover:bg-gray-100 transition-colors">
          Daftar Gratis
        </Link>
      </section>
    </>
  )
}
