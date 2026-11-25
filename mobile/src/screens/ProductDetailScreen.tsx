import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, Dimensions, FlatList, Image, Modal, ScrollView, Share, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import EmptyState from '@/components/EmptyState'
import QtyStepper from '@/components/QtyStepper'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { showError, showInfo } from '@/lib/alerts'
import { discountPercent, formatDateID, formatRupiah, getErrorMessage } from '@/lib/commerce'
import { normalizeProduct, reviewsFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { Product, Review, ReviewAuthor } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>
type Route = RouteProp<RootStackParamList, 'ProductDetail'>

export default function ProductDetailScreen() {
  const nav = useNavigation<Nav>()
  const { params } = useRoute<Route>()
  const { user } = useAuth()
  const { addItem, buyNow } = useCart()
  const insets = useSafeAreaInsets()

  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [wishlisted, setWishlisted] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const onViewableItemsChanged = useRef((info: { viewableItems: Array<{ index: number | null }> }) => {
    const index = info.viewableItems[0]?.index
    if (typeof index === 'number') setActiveImage(index)
  }).current

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('slug', params.slug)
        .maybeSingle()

      if (!active) return
      if (fetchError) {
        setError(getErrorMessage(fetchError))
        setLoading(false)
        return
      }
      if (!data) {
        setError('Produk tidak ditemukan')
        setLoading(false)
        return
      }

      const found = normalizeProduct(data)
      setProduct(found)
      setQty(1)
      setActiveImage(0)
      const initialVariants: Record<string, string> = {}
      found.variants.forEach(variant => {
        if (variant.options.length > 0) initialVariants[variant.name] = variant.options[0]
      })
      setSelectedVariants(initialVariants)

      const [reviewResult, wishlistResult] = await Promise.all([
        supabase.from('reviews').select('*').eq('product_id', found.id).order('created_at', { ascending: false }).limit(10),
        user
          ? supabase.from('wishlists').select('id').eq('user_id', user.id).eq('product_id', found.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (!active) return
      let rows = reviewsFrom(reviewResult.data)
      if (rows.length > 0) {
        const ids = Array.from(new Set(rows.map(review => review.user_id)))
        const { data: authorData } = await supabase
          .from('review_authors')
          .select('id, full_name, avatar_url')
          .in('id', ids)
        const authors = new Map<string, ReviewAuthor>()
        ;((authorData ?? []) as ReviewAuthor[]).forEach(author => authors.set(author.id, author))
        rows = rows.map(review => ({ ...review, author: authors.get(review.user_id) }))
      }
      setReviews(rows)
      setWishlisted(!!wishlistResult.data)
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [params.slug, user])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.centerText}>Memuat detail produk...</Text>
      </View>
    )
  }

  if (error || !product) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title={error ?? 'Produk tidak ditemukan'}
        actionLabel="Kembali"
        onPressAction={() => nav.goBack()}
      />
    )
  }

  const discount = discountPercent(product.original_price, product.price)
  const variantText = Object.entries(selectedVariants)
    .map(([name, value]) => `${name}: ${value}`)
    .join(', ')
  const images = product.images.length > 0 ? product.images : ['']

  const toggleWishlist = async () => {
    if (!user) {
      return AlertLogin(nav)
    }
    setActionLoading(true)
    try {
      if (wishlisted) {
        const { error: deleteError } = await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id)
        if (deleteError) throw deleteError
        setWishlisted(false)
        showInfo('Wishlist', 'Produk dihapus dari wishlist')
      } else {
        const { error: insertError } = await supabase
          .from('wishlists')
          .insert({ user_id: user.id, product_id: product.id })
        if (insertError) throw insertError
        setWishlisted(true)
        showInfo('Wishlist', 'Produk ditambahkan ke wishlist')
      }
    } catch (err) {
      showError('Gagal Memperbarui Wishlist', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddToCart = async () => {
    setActionLoading(true)
    try {
      await addItem(product, qty, variantText || undefined)
      showInfo('Berhasil', 'Produk ditambahkan ke keranjang')
    } finally {
      setActionLoading(false)
    }
  }

  const handleBuyNow = () => {
    buyNow(product, qty, variantText || undefined)
    nav.navigate('Checkout')
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${product.name} - ${formatRupiah(product.price)} | ElektroMart`,
        title: product.name,
      })
    } catch {
      // Pembatalan share bukan error yang perlu ditampilkan.
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.imageSection}>
          <FlatList
            horizontal
            pagingEnabled
            data={images}
            keyExtractor={(item, index) => `${product.id}-${index}`}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 55 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.slide}
                activeOpacity={0.95}
                onPress={() => setGalleryOpen(true)}
              >
                {item ? (
                  <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={styles.imageFallback}>
                    <Ionicons name="image-outline" size={48} color={COLORS.muted} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{discount}%</Text>
            </View>
          )}
          <View style={styles.imageDots}>
            {images.map((_, index) => (
              <View key={index} style={[styles.imageDot, index === activeImage && styles.imageDotActive]} />
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.titleInfo}>
              {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
              <Text style={styles.name}>{product.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => void toggleWishlist()}
              disabled={actionLoading}
            >
              <Ionicons
                name={wishlisted ? 'heart' : 'heart-outline'}
                size={22}
                color={wishlisted ? COLORS.primary : COLORS.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => void handleShare()}>
              <Ionicons name="share-outline" size={21} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= Math.round(product.rating) ? 'star' : 'star-outline'}
                size={14}
                color="#f5a623"
              />
            ))}
            <Text style={styles.ratingText}>
              {product.rating.toFixed(1)} ({product.review_count} ulasan)
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatRupiah(product.price)}</Text>
            {product.original_price && discount > 0 ? (
              <Text style={styles.originalPrice}>{formatRupiah(product.original_price)}</Text>
            ) : null}
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
              <Text style={styles.infoText}>Stok: {product.stock}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cart-outline" size={15} color={COLORS.primary} />
              <Text style={styles.infoText}>{product.sold_count} terjual</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="storefront-outline" size={15} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{product.seller_name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{product.location}</Text>
            </View>
          </View>

          {product.variants.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Pilih Varian</Text>
              {product.variants.map(variant => (
                <View key={variant.name} style={styles.variantGroup}>
                  <Text style={styles.variantLabel}>{variant.name}</Text>
                  <View style={styles.variantOptions}>
                    {variant.options.map(option => {
                      const active = selectedVariants[variant.name] === option
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.variantChip, active && styles.variantChipActive]}
                          onPress={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: option }))}
                        >
                          <Text style={[styles.variantText, active && styles.variantTextActive]}>{option}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              ))}
              {variantText ? <Text style={styles.selectedVariant}>Varian: {variantText}</Text> : null}
            </View>
          )}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Jumlah</Text>
            <QtyStepper value={qty} max={product.stock} onChange={setQty} />
          </View>

          {product.description ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Deskripsi</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          ) : null}

          {Object.keys(product.specifications).length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Spesifikasi</Text>
              {Object.entries(product.specifications).map(([key, value], index) => (
                <View key={key} style={[styles.specRow, index % 2 === 0 && styles.specRowAlt]}>
                  <Text style={styles.specKey}>{key}</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.blockTitle}>Ulasan Pembeli ({product.review_count})</Text>
          {reviews.length === 0 ? (
            <Text style={styles.emptyReview}>Belum ada ulasan untuk produk ini.</Text>
          ) : (
            reviews.map(review => (
              <View key={review.id} style={styles.reviewRow}>
                <View style={styles.reviewAvatar}>
                  <Ionicons name="person" size={16} color={COLORS.white} />
                </View>
                <View style={styles.reviewBody}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewAuthor}>{review.author?.full_name ?? 'Pelanggan'}</Text>
                    <Text style={styles.reviewDate}>{formatDateID(review.created_at)}</Text>
                  </View>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Ionicons
                        key={star}
                        name={star <= review.rating ? 'star' : 'star-outline'}
                        size={11}
                        color="#f5a623"
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewComment}>{review.comment || 'Tidak ada komentar'}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => void handleAddToCart()}
          disabled={product.stock === 0 || actionLoading}
        >
          <Ionicons name="cart-outline" size={19} color={COLORS.primary} />
          <Text style={styles.cartButtonText}>Keranjang</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={handleBuyNow}
          disabled={product.stock === 0 || actionLoading}
        >
          <Text style={styles.buyButtonText}>Beli Sekarang</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={galleryOpen} transparent animationType="fade">
        <View style={styles.galleryBackdrop}>
          <TouchableOpacity style={styles.galleryClose} onPress={() => setGalleryOpen(false)}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <FlatList
            horizontal
            pagingEnabled
            data={images}
            keyExtractor={(_, index) => `gallery-${index}`}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 55 }}
            renderItem={({ item }) => (
              <View style={styles.gallerySlide}>
                {item ? (
                  <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="contain" />
                ) : (
                  <Ionicons name="image-outline" size={64} color={COLORS.white} />
                )}
              </View>
            )}
          />
          <View style={styles.galleryDots}>
            {images.map((_, index) => (
              <View key={index} style={[styles.imageDot, index === activeImage && styles.imageDotActive]} />
            ))}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const ScreenWidth = Dimensions.get('window').width

function AlertLogin(nav: Nav) {
  return Alert.alert(
    'Login Diperlukan',
    'Masuk terlebih dahulu untuk menyimpan produk ke wishlist',
    [{ text: 'Batal', style: 'cancel' }, { text: 'Masuk', onPress: () => nav.navigate('Login') }],
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { color: COLORS.textSecondary, fontSize: 13 },
  scroll: { paddingBottom: 100 },
  imageSection: { position: 'relative', backgroundColor: COLORS.surface },
  slide: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  imageFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  discountText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  imageDots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  imageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)' },
  imageDotActive: { width: 16, backgroundColor: COLORS.white },
  card: {
    backgroundColor: COLORS.surface,
    marginTop: 8,
    padding: 14,
    ...SHADOW.card,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  titleInfo: { flex: 1 },
  brand: { color: COLORS.primary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  name: { color: COLORS.text, fontSize: 18, fontWeight: '800', lineHeight: 24, marginTop: 3 },
  iconButton: { padding: 8, marginLeft: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8 },
  ratingText: { color: COLORS.textSecondary, fontSize: 11, marginLeft: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  price: { color: COLORS.primary, fontSize: 26, fontWeight: '800' },
  originalPrice: { color: COLORS.muted, fontSize: 13, textDecorationLine: 'line-through' },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '48%' },
  infoText: { color: COLORS.textSecondary, fontSize: 11, flexShrink: 1 },
  block: { marginTop: 16 },
  blockTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800', marginBottom: 9 },
  variantGroup: { marginBottom: 10 },
  variantLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 },
  variantOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  variantChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  variantText: { color: COLORS.textSecondary, fontSize: 12 },
  variantTextActive: { color: COLORS.primary, fontWeight: '700' },
  selectedVariant: { color: COLORS.primary, fontSize: 11, marginTop: 4 },
  description: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  specRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8 },
  specRowAlt: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.sm },
  specKey: { color: COLORS.textSecondary, fontSize: 12, width: '38%' },
  specValue: { color: COLORS.text, fontSize: 12, flex: 1 },
  emptyReview: { color: COLORS.muted, fontSize: 12 },
  reviewRow: { flexDirection: 'row', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  reviewAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBody: { flex: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewAuthor: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  reviewDate: { color: COLORS.muted, fontSize: 10 },
  starRow: { flexDirection: 'row', gap: 1, marginTop: 4 },
  reviewComment: { color: COLORS.textSecondary, fontSize: 12, marginTop: 5, lineHeight: 18 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.raised,
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  cartButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  buyButton: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  buyButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  galleryBackdrop: { flex: 1, backgroundColor: COLORS.backdrop, justifyContent: 'center' },
  galleryClose: { position: 'absolute', top: 48, right: 16, zIndex: 2, padding: 8 },
  gallerySlide: { width: ScreenWidth, height: ScreenWidth, alignItems: 'center', justifyContent: 'center' },
  galleryImage: { width: '100%', height: '100%' },
  galleryDots: { position: 'absolute', bottom: 60, alignSelf: 'center', flexDirection: 'row', gap: 6 },
})
