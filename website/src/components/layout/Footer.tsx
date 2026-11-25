import Link from 'next/link'
import { Zap, Instagram, Music2, Facebook, Youtube } from 'lucide-react'

type FooterLink = { label: string; href: string; external?: boolean }

const groups: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Tentang ElektroMart',
    links: [
      { label: 'Tentang Kami', href: '/info/tentang-kami' },
      { label: 'Karier', href: '/info/karier' },
      { label: 'Blog', href: '/info/blog' },
      { label: 'ElektroMart Poin', href: '/info/poin' },
      { label: 'Kebijakan Privasi', href: '/info/kebijakan-privasi' },
    ],
  },
  {
    title: 'Layanan Pelanggan',
    links: [
      { label: 'Pusat Bantuan', href: '/info/pusat-bantuan' },
      { label: 'Cara Belanja', href: '/info/cara-belanja' },
      { label: 'Pengembalian', href: '/info/pengembalian' },
      { label: 'Kebijakan Garansi', href: '/info/garansi' },
      { label: 'Hubungi Kami', href: '/info/hubungi-kami' },
    ],
  },
  {
    title: 'Ikuti Kami',
    links: [
      { label: 'Facebook', href: 'https://www.facebook.com', external: true },
      { label: 'Instagram', href: 'https://www.instagram.com', external: true },
      { label: 'TikTok', href: 'https://www.tiktok.com', external: true },
      { label: 'YouTube', href: 'https://www.youtube.com', external: true },
    ],
  },
  {
    title: 'Unduh Aplikasi',
    links: [
      { label: 'App Store', href: 'https://www.apple.com/app-store/', external: true },
      { label: 'Google Play', href: 'https://play.google.com/store', external: true },
    ],
  },
]

const socials = [
  { Icon: Facebook, href: 'https://www.facebook.com', label: 'Facebook' },
  { Icon: Instagram, href: 'https://www.instagram.com', label: 'Instagram' },
  { Icon: Music2, href: 'https://www.tiktok.com', label: 'TikTok' },
  { Icon: Youtube, href: 'https://www.youtube.com', label: 'YouTube' },
]

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-6 pb-20 lg:pb-0">
      {/* Top section */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {groups.map(group => (
            <div key={group.title}>
              <h4 className="font-bold text-gray-800 text-sm mb-4 uppercase">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map(link => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 text-xs hover:text-brand transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-gray-500 text-xs hover:text-brand transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Payment & courier logos */}
      <div className="border-t border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 gap-y-1.5 min-w-0 max-w-full">
            <span className="text-xs text-gray-400 font-medium shrink-0">PEMBAYARAN:</span>
            {['VISA', 'MASTER', 'BCA', 'BNI', 'MANDIRI', 'GoPay', 'OVO'].map(p => (
              <span key={p} className="border border-gray-200 text-xs px-2 py-0.5 rounded text-gray-500">{p}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 gap-y-1.5 min-w-0 max-w-full">
            <span className="text-xs text-gray-400 font-medium shrink-0">KURIR:</span>
            {['JNE', 'J&T', 'SiCepat', 'GoSend'].map(k => (
              <span key={k} className="border border-gray-200 text-xs px-2 py-0.5 rounded text-gray-500">{k}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="shopee-gradient py-3">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-4 h-4" />
            <span className="font-bold text-sm">ElektroMart</span>
          </div>
          <p className="text-white/70 text-xs text-center">
            &copy; {new Date().getFullYear()} ElektroMart. All rights reserved. | Toko Elektronik Terpercaya Indonesia
          </p>
          <div className="flex items-center gap-3">
            {socials.map(({ Icon, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="text-white/70 hover:text-white transition-colors p-2 -m-2">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
