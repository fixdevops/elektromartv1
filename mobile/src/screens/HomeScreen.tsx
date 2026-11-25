import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import ProductCard from '@/components/ProductCard'
import ScreenHeader from '@/components/ScreenHeader'
import SectionHeader from '@/components/SectionHeader'
import { useAuth } from '@/contexts/AuthContext'
import { showError } from '@/lib/alerts'
import { formatCountdown, msUntilNextMidnight } from '@/lib/commerce'
import { productsFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW, withAlpha } from '@/theme'
import type { Category, Product } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>
type IconName = React.ComponentProps<typeof Ionicons>['name']
type ProductParams = { q?: string; category?: string; promo?: 'flash' | 'gratis-ongkir' }

interface Banner {
  id: string
  badge: string
  title: string
  subtitle: string
  cta: string
  params: ProductParams
  accent: string
}

const BANNERS: Banner[] = [
  {
    id: 'diskon',
    badge: 'PROMO SPESIAL',
    title: 'Diskon sampai 30%',
    subtitle: 'Elektronik pilihan dengan harga terbaik',
    cta: 'Belanja Sekarang',
    params: { q: 'elektronik' },
    accent: '#ffb649',
  },
  {
    id: 'flash',
    badge: 'FLASH SALE',
    title: 'Buruan sebelum habis!',
    subtitle: 'Harga spesial hanya sampai tengah malam',
    cta: 'Lihat Flash Sale',
    params: { promo: 'flash' },
    accent: '#ffd166',
  },
  {
    id: 'ongkir',
    badge: 'GRATIS ONGKIR',
    title: 'Belanja hemat ongkir',
    subtitle: 'Minimal belanja Rp500.000, tanpa biaya kirim',
    cta: 'Cek Promo',
    params: { promo: 'gratis-ongkir' },
    accent: '#8be0c4',
  },
]

const CATEGORY_COLORS = ['#ee4d2d', '#f59e0b', '#16a34a', '#0284c7', '#8b5cf6', '#ec4899', '#06b6d4', '#65a30d', '#e11d48', '#0f766e']

function categoryIcon(name: string): IconName {
  const lower = name.toLowerCase()
  if (/hp|phone|smart|seluler/.test(lower)) return 'phone-portrait-outline'
  if (/laptop|komputer|pc/.test(lower)) return 'laptop-outline'
  if (/audio|headphone|speaker|sound/.test(lower)) return 'headset-outline'
  if (/tv|televisi|display/.test(lower)) return 'tv-outline'
  if (/kamera|camera/.test(lower)) return 'camera-outline'
  if (/rumah|home|smart home/.test(lower)) return 'home-outline'
  if (/game|gaming/.test(lower)) return 'game-controller-outline'
  return 'grid-outline'
}

export default function HomeScreen() {
  const nav = useNavigation<Nav>()
  const { user, profile } = useAuth()
  const [featured, setFeatured] = useState<Product[]>([])
  const [flashSale, setFlashSale] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [unread, setUnread] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [bannerIndex, setBannerIndex] = useState(0)
  const [remaining, setRemaining] = useState(msUntilNextMidnight())

  const goProducts = (params?: ProductParams) => {
    nav.navigate('Tabs', { screen: 'Produk', params })
  }

  const loadUnread = useCallback(async () => {
    if (!user) {
      setUnread(0)
      return
    }
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (!error) setUnread(count ?? 0)
  }, [user])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [featuredRes, categoryRes, flashRes] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').eq('is_active', true).eq('is_featured', true).order('created_at', { ascending: false }).limit(10),
      supabase.from('categories').select('*').order('name'),
      supabase.from('products').select('*, category:categories(*)').eq('is_active', true).order('sold_count', { ascending: false }).limit(10),
    ])

    const firstError = featuredRes.error ?? categoryRes.error ?? flashRes.error
    if (firstError) showError('Gagal Memuat Beranda', firstError)

    setFeatured(productsFrom(featuredRes.data))
    setCategories((categoryRes.data ?? []) as Category[])
    setFlashSale(productsFrom(flashRes.data))
    await loadUnread()
    setLoading(false)
  }, [loadUnread])

  useFocusEffect(useCallback(() => { void loadData() }, [loadData]))

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`home-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { void loadUnread() },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user, loadUnread])

  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex(index => (index + 1) % BANNERS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const tick = () => setRemaining(msUntilNextMidnight())
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  const banner = BANNERS[bannerIndex]

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="ElektroMart"
        subtitle={`Halo, ${profile?.full_name?.split(' ')[0] ?? 'Pelanggan'} 👋`}
        right={
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => nav.navigate('Search')} hitSlop={6}>
              <Ionicons name="search-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => nav.navigate('Notifications')} hitSlop={6}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
              {unread > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.searchArea}>
        <TouchableOpacity style={styles.searchBox} onPress={() => nav.navigate('Search')} activeOpacity={0.9}>
          <Ionicons name="search-outline" size={17} color={COLORS.muted} />
          <Text style={styles.searchPlaceholder}>{search || 'Cari produk elektronik...'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity
          style={styles.banner}
          activeOpacity={0.92}
          onPress={() => goProducts(banner.params)}
        >
          <View style={[styles.bannerCircle, { backgroundColor: withAlpha(banner.accent, 0.35) }]} />
          <View style={styles.bannerBadge}>
            <Ionicons name="flash" size={11} color={COLORS.primary} />
            <Text style={styles.bannerBadgeText}>{banner.badge}</Text>
          </View>
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
          <View style={styles.bannerCta}>
            <Text style={styles.bannerCtaText}>{banner.cta}</Text>
            <Ionicons name="arrow-forward" size={13} color={COLORS.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.dots}>
          {BANNERS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setBannerIndex(index)}
              style={styles.dotHit}
              hitSlop={6}
            >
              <View style={[styles.dot, index === bannerIndex && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <SectionHeader title="Kategori" subtitle="Pilih sesuai kebutuhanmu" />
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : categories.length === 0 ? (
            <EmptyState icon="grid-outline" title="Kategori belum tersedia" />
          ) : (
            <FlatList
              data={categories.slice(0, 10)}
              numColumns={5}
              scrollEnabled={false}
              keyExtractor={item => item.id}
              columnWrapperStyle={styles.categoryRow}
              renderItem={({ item, index }) => {
                const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                return (
                  <TouchableOpacity
                    style={styles.categoryItem}
                    onPress={() => goProducts({ category: item.slug || item.name })}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
                      <Ionicons name={categoryIcon(item.name)} size={21} color={color} />
                    </View>
                    <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
                  </TouchableOpacity>
                )
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Flash Sale"
            subtitle={`Berakhir dalam ${formatCountdown(remaining)}`}
            actionLabel="Lihat Semua"
            onPressAction={() => goProducts({ promo: 'flash' })}
          />
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : flashSale.length === 0 ? (
            <EmptyState icon="flash-outline" title="Belum ada promo flash sale" />
          ) : (
            <FlatList
              horizontal
              data={flashSale}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flashList}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  style={styles.flashCard}
                  onPress={() => nav.navigate('ProductDetail', { slug: item.slug })}
                />
              )}
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Produk Unggulan"
            subtitle="Pilihan terbaik untuk kamu"
            actionLabel="Lihat Semua"
            onPressAction={() => goProducts()}
          />
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : featured.length === 0 ? (
            <EmptyState icon="cube-outline" title="Belum ada produk unggulan" />
          ) : (
            <FlatList
              data={featured}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={item => item.id}
              columnWrapperStyle={styles.gridRow}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onPress={() => nav.navigate('ProductDetail', { slug: item.slug })}
                />
              )}
            />
          )}
        </View>

        <TouchableOpacity style={styles.promoBanner} onPress={() => goProducts()} activeOpacity={0.9}>
          <View style={styles.promoIcon}>
            <Ionicons name="car-sport-outline" size={26} color={COLORS.primary} />
          </View>
          <View style={styles.promoText}>
            <Text style={styles.promoTitle}>Gratis Ongkir!</Text>
            <Text style={styles.promoSubtitle}>Untuk pembelian minimal Rp500.000</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerButton: { position: 'relative', padding: 7 },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  searchArea: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingBottom: 14 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchPlaceholder: { flex: 1, color: COLORS.muted, fontSize: 13 },
  scrollContent: { paddingBottom: 12 },
  banner: {
    margin: 12,
    marginBottom: 6,
    minHeight: 156,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    padding: 16,
    overflow: 'hidden',
    ...SHADOW.raised,
  },
  bannerCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -45,
    bottom: -60,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  bannerBadgeText: { color: COLORS.primary, fontSize: 9, fontWeight: '800' },
  bannerTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800', lineHeight: 27 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 6, maxWidth: '75%' },
  bannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bannerCtaText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 },
  dotHit: { padding: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d8d8d8' },
  dotActive: { width: 18, backgroundColor: COLORS.primary },
  section: { marginBottom: 18 },
  loader: { marginVertical: 24 },
  categoryRow: { paddingHorizontal: 8, gap: 4 },
  categoryItem: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { color: COLORS.text, fontSize: 10, textAlign: 'center', marginTop: 6, lineHeight: 13 },
  flashList: { paddingHorizontal: 8, paddingRight: 16 },
  flashCard: { width: 148, flex: undefined },
  gridRow: { paddingHorizontal: 8 },
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    ...SHADOW.card,
  },
  promoIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoText: { flex: 1 },
  promoTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  promoSubtitle: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  bottomSpace: { height: 20 },
})
