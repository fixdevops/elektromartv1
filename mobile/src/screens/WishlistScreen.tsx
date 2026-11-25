import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { showError, showInfo } from '@/lib/alerts'
import { formatRupiah } from '@/lib/commerce'
import { wishlistsFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { WishlistItem } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>

export default function WishlistScreen() {
  const nav = useNavigation<Nav>()
  const { user } = useAuth()
  const { addItem, buyNow } = useCart()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadWishlist = useCallback(async () => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('wishlists')
      .select('*, product:products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) showError('Gagal Memuat Wishlist', error)
    setItems(wishlistsFrom(data))
    setLoading(false)
  }, [user])

  useFocusEffect(useCallback(() => { void loadWishlist() }, [loadWishlist]))

  const remove = async (id: string, name: string) => {
    const { error } = await supabase.from('wishlists').delete().eq('id', id)
    if (error) return showError('Gagal Menghapus Wishlist', error)
    setItems(previous => previous.filter(item => item.id !== id))
    showInfoRemoved(name)
  }

  const addToCart = async (id: string, product: WishlistItem['product']) => {
    if (!product || product.stock === 0) return
    setBusyId(id)
    try {
      await addItem(product, 1)
      showInfo('Berhasil', 'Produk ditambahkan ke keranjang')
    } catch (error) {
      showError('Gagal Menambah Keranjang', error)
    } finally {
      setBusyId(null)
    }
  }

  const buyProductNow = (product: WishlistItem['product']) => {
    if (!product || product.stock === 0) return
    buyNow(product, 1)
    nav.navigate('Checkout')
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="heart-outline"
          title="Masuk untuk melihat wishlist"
          description="Simpan produk favoritmu agar tidak kehilangan ide belanja"
          actionLabel="Masuk"
          onPressAction={() => nav.navigate('Login')}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat wishlist...</Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Wishlist masih kosong"
          description="Ketuk ikon hati pada produk untuk menyimpannya di sini"
          actionLabel="Jelajahi Produk"
          onPressAction={() => nav.navigate('Tabs', { screen: 'Produk' })}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const product = item.product
            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.main}
                  onPress={() => product && nav.navigate('ProductDetail', { slug: product.slug })}
                >
                  {product?.images[0] ? (
                    <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <View style={[styles.image, styles.imageFallback]}>
                      <Ionicons name="image-outline" size={22} color={COLORS.muted} />
                    </View>
                  )}
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>{product?.name ?? 'Produk tidak tersedia'}</Text>
                    <Text style={styles.price}>{product ? formatRupiah(product.price) : '-'}</Text>
                    {product?.stock === 0 ? <Text style={styles.soldOut}>Stok Habis</Text> : null}
                  </View>
                </TouchableOpacity>
                {product && product.stock > 0 ? (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => void addToCart(item.id, product)}
                      disabled={busyId === item.id}
                    >
                      <Ionicons name="cart-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.actionText}>Tambah Keranjang</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => buyProductNow(product)}>
                      <Text style={styles.actionTextPrimary}>Beli Sekarang</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => void remove(item.id, product?.name ?? 'produk')}
                >
                  <Ionicons name="heart" size={17} color={COLORS.primary} />
                  <Text style={styles.removeText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

function showInfoRemoved(name: string) {
  Alert.alert('Wishlist', `${name} dihapus dari wishlist`)
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 12 },
  list: { padding: 10, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    marginBottom: 8,
    padding: 10,
    ...SHADOW.card,
  },
  main: { flexDirection: 'row', gap: 12 },
  image: { width: 78, height: 78, borderRadius: RADIUS.sm },
  imageFallback: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { color: COLORS.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  price: { color: COLORS.primary, fontSize: 14, fontWeight: '800', marginTop: 8 },
  soldOut: { color: COLORS.danger, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  actionButtonPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  actionText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  actionTextPrimary: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  removeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
})
