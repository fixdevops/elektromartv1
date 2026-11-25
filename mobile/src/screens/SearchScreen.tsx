import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, FlatList, Image, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import { showError } from '@/lib/alerts'
import { formatRupiah } from '@/lib/commerce'
import { asRows, productsFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { Product } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>

const RECENT_KEY = 'em_recent_searches'
const TRENDING = ['laptop', 'headphone', 'smartwatch', 'kamera', 'tv', 'speaker', 'mouse', 'keyboard']
const QUICK_LINKS = [
  { label: 'Semua Produk', icon: 'grid-outline' as const, params: {} },
  { label: 'Promo Hari Ini', icon: 'pricetag-outline' as const, params: { promo: 'flash' as const } },
  { label: 'Elektronik', icon: 'flash-outline' as const, params: { q: 'elektronik' } },
  { label: 'Terbaru', icon: 'sparkles-outline' as const, params: { q: '' } },
]

export default function SearchScreen() {
  const nav = useNavigation<Nav>()
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [results, setResults] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_KEY)
        if (!raw) return
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setRecent(parsed.filter((item): item is string => typeof item === 'string').slice(0, 8))
        }
      } catch {
        await AsyncStorage.removeItem(RECENT_KEY)
      }
    })()
  }, [])

  const storeRecent = useCallback(async (term: string) => {
    const next = [term, ...recent.filter(item => item.toLowerCase() !== term.toLowerCase())].slice(0, 8)
    setRecent(next)
    try {
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      // Penyimpanan opsional; pencarian tetap berfungsi.
    }
  }, [recent])

  const search = useCallback(async (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    setError(null)
    void storeRecent(trimmed)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .ilike('name', `%${trimmed}%`)
      .order('sold_count', { ascending: false })
      .limit(20)

    if (fetchError) {
      showError('Gagal Mencari Produk', fetchError)
      setError('Pencarian gagal. Silakan coba lagi.')
      setResults([])
    } else {
      setResults(productsFrom(asRows(data)))
    }
    setLoading(false)
  }, [storeRecent])

  const goProducts = (params?: { q?: string; category?: string; promo?: 'flash' | 'gratis-ongkir' }) => {
    nav.navigate('Tabs', { screen: 'Produk', params })
  }

  const clearRecent = async () => {
    setRecent([])
    await AsyncStorage.removeItem(RECENT_KEY)
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} />
        <TextInput
          style={styles.input}
          placeholder="Cari produk elektronik..."
          placeholderTextColor={COLORS.muted}
          value={query}
          onChangeText={value => {
            setQuery(value)
            if (!value) {
              setSearched(false)
              setResults([])
            }
          }}
          onSubmitEditing={() => void search(query)}
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('')
              setSearched(false)
              setResults([])
            }}
            hitSlop={6}
          >
            <Ionicons name="close-circle" size={17} color={COLORS.muted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.searchButton} onPress={() => void search(query)}>
          <Text style={styles.searchButtonText}>Cari</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Mencari produk...</Text>
        </View>
      ) : searched ? (
        error ? (
          <EmptyState
            icon="alert-circle-outline"
            title={error}
            actionLabel="Coba Lagi"
            onPressAction={() => void search(query)}
          />
        ) : results.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Produk tidak ditemukan"
            description={`Tidak ada hasil untuk "${query}". Coba kata kunci lain.`}
            actionLabel="Lihat Semua Produk"
            onPressAction={() => goProducts({ q: '' })}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.results}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultCard}
                onPress={() => nav.navigate('ProductDetail', { slug: item.slug })}
              >
                {item.images[0] ? (
                  <Image source={{ uri: item.images[0] }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbFallback]}>
                    <Ionicons name="image-outline" size={20} color={COLORS.muted} />
                  </View>
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.resultMeta}>
                    {item.category?.name ?? 'Elektronik'} · {item.sold_count} terjual
                  </Text>
                  <Text style={styles.resultPrice}>{formatRupiah(item.price)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity style={styles.seeAll} onPress={() => goProducts({ q: query })}>
                <Text style={styles.seeAllText}>Lihat semua hasil untuk "{query}"</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            }
          />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.discover} showsVerticalScrollIndicator={false}>
          {recent.length > 0 && (
            <View style={styles.block}>
              <View style={styles.blockHeader}>
                <Text style={styles.blockTitle}>Pencarian Terakhir</Text>
                <TouchableOpacity onPress={() => void clearRecent()}>
                  <Text style={styles.clearText}>Hapus</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chips}>
                {recent.map(term => (
                  <TouchableOpacity
                    key={term}
                    style={styles.chip}
                    onPress={() => {
                      setQuery(term)
                      void search(term)
                    }}
                  >
                    <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.chipText}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Pencarian Populer</Text>
            <View style={styles.trendingList}>
              {TRENDING.map((term, index) => (
                <TouchableOpacity
                  key={term}
                  style={styles.trendingRow}
                  onPress={() => {
                    setQuery(term)
                    void search(term)
                  }}
                >
                  <Text style={[styles.trendingRank, index < 3 && styles.trendingRankTop]}>{index + 1}</Text>
                  <Text style={styles.trendingText}>{term}</Text>
                  <Ionicons name="trending-up-outline" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Jelajahi</Text>
            <View style={styles.quickGrid}>
              {QUICK_LINKS.map(link => (
                <TouchableOpacity
                  key={link.label}
                  style={styles.quickCard}
                  onPress={() => goProducts(link.params)}
                >
                  <View style={styles.quickIcon}>
                    <Ionicons name={link.icon} size={22} color={COLORS.primary} />
                  </View>
                  <Text style={styles.quickLabel}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={18} color={COLORS.warning} />
            <Text style={styles.tipText}>
              Tips: coba cari nama produk, kategori, atau kata kunci seperti "laptop gaming".
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 8,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 12 },
  results: { padding: 10, paddingBottom: 24 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 8,
    ...SHADOW.card,
  },
  thumb: { width: 66, height: 66, borderRadius: RADIUS.sm },
  thumbFallback: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultName: { color: COLORS.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  resultMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  resultPrice: { color: COLORS.primary, fontSize: 14, fontWeight: '800', marginTop: 5 },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 16,
  },
  seeAllText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  discover: { padding: 14, paddingBottom: 30 },
  block: { marginBottom: 22 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  blockTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  clearText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 12 },
  trendingList: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingVertical: 4,
    ...SHADOW.card,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  trendingRank: { color: COLORS.muted, fontSize: 13, fontWeight: '800', width: 18 },
  trendingRankTop: { color: COLORS.primary },
  trendingText: { flex: 1, color: COLORS.text, fontSize: 13 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 14,
    alignItems: 'center',
    ...SHADOW.card,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { color: COLORS.text, fontSize: 12, fontWeight: '600', marginTop: 8 },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.warningLight,
  },
  tipText: { flex: 1, color: COLORS.textSecondary, fontSize: 11, lineHeight: 17 },
})
