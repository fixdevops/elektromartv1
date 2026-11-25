import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import ProductCard from '@/components/ProductCard'
import ScreenHeader from '@/components/ScreenHeader'
import { showError } from '@/lib/alerts'
import { getErrorMessage } from '@/lib/commerce'
import { asRows, normalizeCategory, productsFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList, TabParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS } from '@/theme'
import type { Category, Product } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>
type ProductsRoute = RouteProp<TabParamList, 'Produk'>
type SortKey = 'terlaris' | 'terbaru' | 'harga_asc' | 'harga_desc'

const PAGE_SIZE = 12

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'terlaris', label: 'Terlaris' },
  { id: 'terbaru', label: 'Terbaru' },
  { id: 'harga_asc', label: 'Harga ↑' },
  { id: 'harga_desc', label: 'Harga ↓' },
]

export default function ProductsScreen() {
  const nav = useNavigation<Nav>()
  const route = useRoute<ProductsRoute>()

  const [searchInput, setSearchInput] = useState(typeof route.params?.q === 'string' ? route.params.q : '')
  const [search, setSearch] = useState(searchInput.trim())
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('terlaris')
  const [filterOpen, setFilterOpen] = useState(false)
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({})
  const [promoOnly, setPromoOnly] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    void (async () => {
      const { data, error: fetchError } = await supabase.from('categories').select('*').order('name')
      if (fetchError) {
        showError('Gagal Memuat Kategori', fetchError)
        return
      }
      setCategories(asRows(data).map(normalizeCategory))
    })()
  }, [])

  // Parameter dari Home/Search/ScreenHeader: { q?, category? }.
  useEffect(() => {
    const q = route.params?.q
    if (typeof q === 'string') {
      setSearchInput(q)
      setSearch(q.trim())
    }
    const category = route.params?.category
    if (category && categories.length > 0) {
      const found = categories.find(item =>
        item.slug === category || item.name === category || item.id === category ||
        item.name.toLowerCase() === category.toLowerCase(),
      )
      setCategoryId(found?.id ?? null)
    } else if (category === '') {
      setCategoryId(null)
    }

    const promo = route.params?.promo
    setPromoOnly(promo === 'flash')
    if (promo === 'gratis-ongkir') {
      setPriceRange({ min: 500_000 })
      setCategoryId(null)
    } else if (promo) {
      setPriceRange({})
    }
  }, [route.params, categories])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const fetchPage = useCallback(async (page: number) => {
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    let query = supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)

    if (search) query = query.ilike('name', `%${search}%`)
    if (categoryId) query = query.eq('category_id', categoryId)
    if (priceRange.min != null) query = query.gte('price', priceRange.min)
    if (priceRange.max != null) query = query.lte('price', priceRange.max)
    if (promoOnly) query = query.gt('original_price', 0)

    if (sort === 'terlaris') query = query.order('sold_count', { ascending: false })
    else if (sort === 'terbaru') query = query.order('created_at', { ascending: false })
    else if (sort === 'harga_asc') query = query.order('price', { ascending: true })
    else query = query.order('price', { ascending: false })

    const { data, error: fetchError } = await query.range(from, to)
    if (fetchError) throw fetchError
    return productsFrom(data)
  }, [search, categoryId, sort, priceRange, promoOnly])

  const loadFirst = useCallback(async () => {
    setLoading(true)
    setError(null)
    pageRef.current = 0
    try {
      const rows = await fetchPage(0)
      setProducts(rows)
      setHasMore(rows.length === PAGE_SIZE)
    } catch (err) {
      setError(getErrorMessage(err))
      setProducts([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  useEffect(() => { void loadFirst() }, [loadFirst])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || loadingMoreRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const nextPage = pageRef.current + 1
      const rows = await fetchPage(nextPage)
      pageRef.current = nextPage
      setProducts(prev => [...prev, ...rows])
      setHasMore(rows.length === PAGE_SIZE)
    } catch (err) {
      showError('Gagal Memuat Produk', err)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [fetchPage, hasMore, loading])

  const resetFilters = () => {
    setSearchInput('')
    setSearch('')
    setCategoryId(null)
    setSort('terlaris')
    setMinInput('')
    setMaxInput('')
    setPriceRange({})
  }

  const applyPrice = () => {
    const min = minInput.trim() ? Number(minInput.trim()) : undefined
    const max = maxInput.trim() ? Number(maxInput.trim()) : undefined
    if ((min != null && !Number.isFinite(min)) || (max != null && !Number.isFinite(max))) {
      return Alert.alert('Filter Tidak Valid', 'Masukkan angka harga yang valid')
    }
    if (min != null && max != null && min > max) {
      return Alert.alert('Filter Tidak Valid', 'Harga minimum tidak boleh lebih besar dari harga maksimum')
    }
    setPriceRange({ min, max })
    setFilterOpen(false)
  }

  const filterActive = priceRange.min != null || priceRange.max != null

  return (
    <View style={styles.container}>
      <ScreenHeader title="Semua Produk" subtitle="Temukan elektronik favoritmu" />

      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor={COLORS.muted}
            value={searchInput}
            onChangeText={setSearchInput}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={6}>
              <Ionicons name="close-circle" size={17} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          data={[{ id: '', name: 'Semua' } as Category, ...categories]}
          keyExtractor={item => item.id || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
          renderItem={({ item }) => {
            const active = categoryId === (item.id || null)
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategoryId(item.id || null)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
              </TouchableOpacity>
            )
          }}
        />

        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={SORT_OPTIONS}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            style={styles.sortList}
            contentContainerStyle={styles.chipList}
            renderItem={({ item }) => {
              const active = sort === item.id
              return (
                <TouchableOpacity
                  style={[styles.chip, styles.sortChip, active && styles.chipActive]}
                  onPress={() => setSort(item.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              )
            }}
          />
          <TouchableOpacity
            style={[styles.filterButton, filterActive && styles.chipActive]}
            onPress={() => setFilterOpen(value => !value)}
          >
            <Ionicons name="options-outline" size={14} color={filterActive ? COLORS.white : COLORS.textSecondary} />
            <Text style={[styles.filterButtonText, filterActive && styles.chipTextActive]}>Harga</Text>
          </TouchableOpacity>
        </View>

        {filterOpen && (
          <View style={styles.filterPanel}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min. harga"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              value={minInput}
              onChangeText={setMinInput}
            />
            <Text style={styles.priceDash}>-</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Maks. harga"
              placeholderTextColor={COLORS.muted}
              keyboardType="number-pad"
              value={maxInput}
              onChangeText={setMaxInput}
            />
            <TouchableOpacity style={styles.applyButton} onPress={applyPrice}>
              <Text style={styles.applyText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Gagal memuat produk"
          description={error}
          actionLabel="Coba Lagi"
          onPressAction={() => void loadFirst()}
        />
      ) : loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat produk...</Text>
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Produk tidak ditemukan"
          description="Coba ubah kata kunci atau filter pencarianmu"
          actionLabel="Reset Filter"
          onPressAction={resetFilters}
        />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => nav.navigate('ProductDetail', { slug: item.slug })}
            />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadFirst()} />}
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.loadingText}>Memuat lebih banyak...</Text>
              </View>
            ) : !hasMore ? (
              <Text style={styles.endText}>Semua produk sudah ditampilkan</Text>
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.surface, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 2 },
  chipList: { paddingHorizontal: 12, gap: 6, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  sortList: { flex: 1 },
  sortChip: { paddingHorizontal: 10 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginRight: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  filterPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginTop: 8,
  },
  priceInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 12,
  },
  priceDash: { color: COLORS.muted },
  applyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  applyText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'center' },
  grid: { paddingHorizontal: 8, paddingBottom: 20 },
  gridRow: { paddingHorizontal: 0 },
  footerLoading: { paddingVertical: 18, alignItems: 'center' },
  endText: { color: COLORS.muted, fontSize: 11, textAlign: 'center', paddingVertical: 18 },
})
