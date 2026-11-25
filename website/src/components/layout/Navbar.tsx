'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ShoppingCart, Search, User, Menu, X, Bell, ChevronDown, Heart,
  LogOut, Package, ShieldCheck, Zap, LayoutGrid,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface NavCategory {
  id: string
  name: string
  slug: string
}

const FALLBACK_CATEGORIES: NavCategory[] = [
  { id: 'smartphones', name: 'Smartphone', slug: 'smartphones' },
  { id: 'laptops', name: 'Laptop', slug: 'laptops' },
  { id: 'audio', name: 'Audio', slug: 'audio' },
  { id: 'smart-watches', name: 'Smart Watch', slug: 'smart-watches' },
  { id: 'accessories', name: 'Aksesori', slug: 'accessories' },
]

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [categories, setCategories] = useState<NavCategory[]>(FALLBACK_CATEGORIES)
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const { user, profile, signOut } = useAuthStore()
  const totalItems = useCartStore(s => s.totalItems())

  // Kategori diambil dari Supabase; fallback memakai slug seed yang benar.
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase
      .from('categories')
      .select('id, name, slug')
      .order('name')
      .then(({ data, error }) => {
        if (!active || error || !data?.length) return
        setCategories(data as NavCategory[])
      })
    return () => { active = false }
  }, [])

  // Jumlah notifikasi belum dibaca untuk user yang sedang masuk.
  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    let active = true
    const supabase = createClient()
    const fetchUnread = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      if (active && !error) setUnreadCount(count ?? 0)
    }

    void fetchUnread()
    const channel = supabase
      .channel(`navbar-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { void fetchUnread() },
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [user?.id])

  useEffect(() => {
    const onScroll = () => {
      setUserMenuOpen(false)
      setMobileOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserMenuOpen(false)
        setMobileOpen(false)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products')
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Berhasil keluar')
    setUserMenuOpen(false)
    setMobileOpen(false)
    router.push('/')
  }

  const userMenuItems = [
    { href: '/account', label: 'Pesanan Saya', icon: Package },
    { href: '/wishlist', label: 'Wishlist', icon: Heart },
    { href: '/notifications', label: 'Notifikasi', icon: Bell },
    ...(profile?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ]

  return (
    <header className="sticky top-0 z-50">
      <div className="shopee-gradient text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          {/* Baris atas */}
          <div className="hidden md:flex items-center justify-between text-xs py-1.5 border-b border-white/20">
            <div className="flex items-center gap-4">
              <Link href="/notifications" className="flex items-center gap-1 hover:text-white/80">
                <Bell className="w-3 h-3" /> Notifikasi
              </Link>
              <Link href="/wishlist" className="flex items-center gap-1 hover:text-white/80">
                <Heart className="w-3 h-3" /> Wishlist
              </Link>
              <Link href="/products" className="flex items-center gap-1 hover:text-white/80">
                <LayoutGrid className="w-3 h-3" /> Semua Produk
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-white/90 max-w-[180px] truncate">
                    Halo, {profile?.full_name ?? user.email?.split('@')[0] ?? 'Pelanggan'}
                  </span>
                  <span className="text-white/40">|</span>
                  <button type="button" onClick={handleSignOut} className="hover:text-white/80">Keluar</button>
                </>
              ) : (
                <>
                  <Link href="/auth/register" className="hover:text-white/80">Daftar</Link>
                  <span className="text-white/40">|</span>
                  <Link href="/auth/login" className="hover:text-white/80">Masuk</Link>
                </>
              )}
            </div>
          </div>

          {/* Baris utama */}
          <div className="flex items-center gap-2 sm:gap-4 py-3">
            <button
              type="button"
              aria-label={mobileOpen ? 'Tutup menu kategori' : 'Buka menu kategori'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(open => !open)}
              className="md:hidden p-2.5 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-white/15 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
              <div className="bg-white rounded p-1 shadow-sm">
                <Zap className="w-5 h-5 text-brand fill-brand" />
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight hidden sm:block">ElektroMart</span>
            </Link>

            <form onSubmit={handleSearch} className="flex-1 flex max-w-2xl min-w-0">
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari produk, merek, dan kategori..."
                aria-label="Cari produk"
                className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 text-gray-800 text-sm focus:outline-none rounded-l-sm placeholder:text-gray-400"
              />
              <button
                type="submit"
                aria-label="Cari"
                className="bg-white/15 hover:bg-white/25 px-3 sm:px-5 min-h-[44px] rounded-r-sm transition-colors border-l border-white/20 flex items-center justify-center"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>

            {/* Ikon aksi */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              <Link href="/notifications" aria-label="Notifikasi" className="relative hidden sm:flex flex-col items-center justify-center p-2 -m-2 hover:text-white/80">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-yellow-400 text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                <span className="text-[11px] hidden lg:block mt-0.5">Notifikasi</span>
              </Link>

              <Link href="/wishlist" aria-label="Wishlist" className="hidden sm:flex flex-col items-center justify-center p-2 -m-2 hover:text-white/80">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[11px] hidden lg:block mt-0.5">Wishlist</span>
              </Link>

              <Link href="/cart" aria-label="Keranjang" className="relative flex flex-col items-center justify-center p-2 -m-2 hover:text-white/80">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-yellow-400 text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
                <span className="text-[11px] hidden lg:block mt-0.5">Keranjang</span>
              </Link>

              <div className="relative">
                <button
                  type="button"
                  aria-label="Menu akun"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen(open => !open)}
                  className="flex flex-col items-center justify-center p-2 -m-2 hover:text-white/80"
                >
                  <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[11px] hidden lg:block mt-0.5">Akun</span>
                  <ChevronDown className={cn('w-3 h-3 hidden md:block transition-transform', userMenuOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-sm shadow-xl border border-gray-100 overflow-hidden z-50"
                    >
                      {user ? (
                        <>
                          <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {profile?.full_name ?? 'Pelanggan'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          {userMenuItems.map(({ href, label, icon: Icon }) => (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-brand transition-colors"
                            >
                              <Icon className="w-4 h-4" /> {label}
                            </Link>
                          ))}
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> Keluar
                          </button>
                        </>
                      ) : (
                        <>
                          <Link href="/auth/login" onClick={() => setUserMenuOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-brand">
                            Masuk
                          </Link>
                          <Link href="/auth/register" onClick={() => setUserMenuOpen(false)} className="block px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-brand border-t border-gray-100">
                            Daftar
                          </Link>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Navigasi kategori desktop */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6 pb-2.5 text-xs text-white/90 overflow-x-auto">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="hover:text-white hover:underline whitespace-nowrap font-medium"
              >
                {cat.name}
              </Link>
            ))}
            <Link href="/?sale=1" className="flex items-center gap-1 text-yellow-300 hover:text-white whitespace-nowrap font-semibold">
              <Zap className="w-3.5 h-3.5 fill-current" /> Flash Sale
            </Link>
          </nav>
        </div>
      </div>

      {/* Menu kategori mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-b border-gray-200 shadow-lg overflow-hidden"
          >
            <div className="px-4 py-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Kategori</p>
              <div className="grid grid-cols-2 gap-1">
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    href={`/products?category=${cat.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-3 px-2 min-h-[44px] text-sm text-gray-700 hover:bg-orange-50 hover:text-brand rounded-sm"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
                <Link href="/products" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-3 px-2 min-h-[44px] text-sm text-gray-700 hover:text-brand">
                  <LayoutGrid className="w-4 h-4" /> Semua Produk
                </Link>
                <Link href="/?sale=1" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-3 px-2 min-h-[44px] text-sm text-brand font-medium">
                  <Zap className="w-4 h-4" /> Flash Sale
                </Link>
                <Link href="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-3 px-2 min-h-[44px] text-sm text-gray-700 hover:text-brand">
                  <Heart className="w-4 h-4" /> Wishlist
                </Link>
                <Link href="/notifications" onClick={() => setMobileOpen(false)} className="flex items-center justify-between py-3 px-2 min-h-[44px] text-sm text-gray-700 hover:text-brand">
                  <span className="flex items-center gap-2"><Bell className="w-4 h-4" /> Notifikasi</span>
                  {unreadCount > 0 && <span className="bg-brand text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{unreadCount}</span>}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
