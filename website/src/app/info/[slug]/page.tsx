import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react'

type InfoPage = {
  title: string
  intro: string
  sections: { heading: string; body: string }[]
}

const pages: Record<string, InfoPage> = {
  'tentang-kami': {
    title: 'Tentang ElektroMart',
    intro: 'ElektroMart adalah toko elektronik online yang menghadirkan pengalaman belanja sederhana, aman, dan nyaman untuk konsumen Indonesia.',
    sections: [
      { heading: 'Kami menjual apa', body: 'Smartphone, laptop, audio, smart watch, dan aksesori dari brand resmi dengan pilihan varian dan stok yang diperbarui secara real-time.' },
      { heading: 'Komitmen kami', body: 'Harga transparan, pembayaran dapat diverifikasi, pengiriman dapat dilacak, dan layanan purna jual yang jelas.' },
    ],
  },
  karier: {
    title: 'Karier',
    intro: 'Tumbuh bersama tim ElektroMart. Kami membuka peluang di bidang teknologi, operasional, layanan pelanggan, dan logistik.',
    sections: [
      { heading: 'Cara melamar', body: 'Kirimkan portofolio dan CV singkat ke careers@elektromart.co. Kami akan menghubungi kandidat yang sesuai.' },
      { heading: 'Budaya kerja', body: 'Cepat beradaptasi, berorientasi pada pelanggan, dan berani memperbaiki proses secara berkelanjutan.' },
    ],
  },
  blog: {
    title: 'Blog ElektroMart',
    intro: 'Panduan membeli perangkat, tips perawatan, dan perbandingan produk elektronik terkini.',
    sections: [
      { heading: 'Panduan pembelian', body: 'Simak checklist sebelum membeli smartphone atau laptop: kebutuhan performa, garansi resmi, dan reputasi penjual.' },
      { heading: 'Tips perawatan', body: 'Perbarui perangkat lunak secara berkala, gunakan charger sesuai spesifikasi, dan simpan perangkat di tempat kering.' },
    ],
  },
  poin: {
    title: 'ElektroMart Poin',
    intro: 'Program apresiasi untuk pelanggan yang berbelanja dan berpartisipasi aktif di ElektroMart.',
    sections: [
      { heading: 'Mendapat poin', body: 'Poin diberikan setelah pesanan selesai dan ulasan produktif dikirim dari halaman pesanan.' },
      { heading: 'Menggunakan poin', body: 'Poin dapat ditukarkan dengan voucher belanja pada halaman checkout saat tersedia.' },
    ],
  },
  'kebijakan-privasi': {
    title: 'Kebijakan Privasi',
    intro: 'Kami menjaga data pribadi kamu dengan bertanggung jawab dan hanya menggunakannya untuk kebutuhan layanan.',
    sections: [
      { heading: 'Data yang disimpan', body: 'Nama, email, nomor telepon, alamat pengiriman, riwayat pesanan, dan bukti pembayaran yang kamu unggah.' },
      { heading: 'Penggunaan data', body: 'Data dipakai untuk memproses pesanan, mengirim notifikasi, mencegah penyalahgunaan, dan meningkatkan layanan.' },
      { heading: 'Keamanan', body: 'Akses dibatasi oleh aturan keamanan basis data dan hanya admin berwenang yang dapat melihat data pesanan.' },
    ],
  },
  'pusat-bantuan': {
    title: 'Pusat Bantuan',
    intro: 'Butuh bantuan dengan pesanan, pembayaran, atau pengiriman? Temukan jawaban di sini.',
    sections: [
      { heading: 'Pembayaran', body: 'Transfer sesuai instruksi pada halaman checkout, lalu unggah bukti pembayaran melalui menu Pesanan Saya.' },
      { heading: 'Pengiriman', body: 'Nomor resi ditampilkan pada detail pesanan setelah admin mengubah status menjadi Dikirim.' },
      { heading: 'Belum terbantu?', body: 'Hubungi tim kami melalui halaman Hubungi Kami dan sertakan nomor pesanan kamu.' },
    ],
  },
  'cara-belanja': {
    title: 'Cara Belanja',
    intro: 'Belanja di ElektroMart hanya butuh beberapa langkah singkat.',
    sections: [
      { heading: '1. Pilih produk', body: 'Telusuri kategori, gunakan filter harga, atau cari produk favoritmu.' },
      { heading: '2. Masuk dan checkout', body: 'Masuk ke akun, pilih varian dan jumlah, lalu gunakan "Beli Sekarang" atau tambahkan ke keranjang.' },
      { heading: '3. Bayar dan tunggu pengiriman', body: 'Isi alamat, pilih kurir dan metode pembayaran, buat pesanan, lalu unggah bukti transfer.' },
    ],
  },
  pengembalian: {
    title: 'Pengembalian',
    intro: 'Kami membantu proses pengembalian jika barang tidak sesuai atau mengalami kerusakan.',
    sections: [
      { heading: 'Syarat', body: 'Pengajuan maksimal 7 hari setelah barang diterima, dengan bukti foto/video dan nomor pesanan.' },
      { heading: 'Proses', body: 'Hubungi tim layanan pelanggan, lampirkan bukti, lalu tunggu instruksi pengembalian dari admin.' },
    ],
  },
  garansi: {
    title: 'Kebijakan Garansi',
    intro: 'Produk bergaransi resmi dapat diklaim sesuai ketentuan pabrik dan distributor.',
    sections: [
      { heading: 'Klaim garansi', body: 'Siapkan nomor pesanan, foto produk, kartu garansi, dan bukti pembelian lalu hubungi tim kami.' },
      { heading: 'Bukan garansi', body: 'Kerusakan akibat pemakaian tidak sesuai petunjuk, modifikasi, atau bencana alam tidak termasuk cakupan.' },
    ],
  },
  'hubungi-kami': {
    title: 'Hubungi Kami',
    intro: 'Tim layanan pelanggan siap membantu pertanyaan seputar produk, pesanan, dan pengiriman.',
    sections: [
      { heading: 'Kontak', body: 'Email: cs@elektromart.co | Telepon: 0812-0000-1234 | Jam layanan: Senin–Sabtu, 09.00–18.00 WIB.' },
      { heading: 'Alamat', body: 'Jl. Mawar No. 12, Jakarta Selatan 12190, Indonesia.' },
    ],
  },
}

export function generateStaticParams() {
  return Object.keys(pages).map(slug => ({ slug }))
}

export default function InfoPage({ params }: { params: { slug: string } }) {
  const page = pages[params.slug]
  if (!page) notFound()

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-3">
        <ArrowLeft className="w-4 h-4" /> Kembali ke beranda
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{page.title}</h1>
      <p className="text-sm text-gray-500 mb-5">{page.intro}</p>

      <div className="card p-5 space-y-5">
        {page.sections.map(section => (
          <section key={section.heading}>
            <h2 className="font-semibold text-gray-800 mb-1.5">{section.heading}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{section.body}</p>
          </section>
        ))}

        {params.slug === 'hubungi-kami' && (
          <div className="border-t border-dashed pt-4 grid gap-2 text-sm text-gray-600">
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand" /> cs@elektromart.co</p>
            <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand" /> 0812-0000-1234</p>
            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" /> Jl. Mawar No. 12, Jakarta Selatan 12190</p>
          </div>
        )}
      </div>
    </div>
  )
}
