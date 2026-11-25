import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/providers/Providers'
import AppShell from '@/components/layout/AppShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'ElektroMart — Toko Elektronik Terpercaya',
    template: '%s | ElektroMart',
  },
  description: 'Temukan produk elektronik terbaik — smartphone, laptop, audio, smartwatch, dan aksesori dengan harga terbaik.',
  keywords: ['elektronik', 'smartphone', 'laptop', 'toko online', 'ElektroMart'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
