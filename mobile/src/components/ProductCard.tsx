import React from 'react'
import {
  ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View,
  type StyleProp, type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { showInfo } from '@/lib/alerts'
import { discountPercent, formatRupiah } from '@/lib/commerce'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { Product } from '@/types/database'
import { useCart } from '@/contexts/CartContext'

interface Props {
  product: Product
  onPress: () => void
  style?: StyleProp<ViewStyle>
}

export default function ProductCard({ product, onPress, style }: Props) {
  const { addItem } = useCart()
  const [adding, setAdding] = React.useState(false)
  const discount = discountPercent(product.original_price, product.price)
  const soldOut = product.stock <= 0

  const handleAdd = async () => {
    if (soldOut || adding) return
    setAdding(true)
    try {
      await addItem(product, 1)
      showInfo('Berhasil', `${product.name} ditambahkan ke keranjang`)
    } finally {
      setAdding(false)
    }
  }

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageContainer}>
        {product.images[0] ? (
          <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={30} color={COLORS.muted} />
          </View>
        )}
        {discount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{discount}%</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>

        <View style={styles.metaRow}>
          {product.rating > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={11} color="#f5a623" />
              <Text style={styles.metaText}>{product.rating.toFixed(1)}</Text>
            </View>
          ) : null}
          {product.sold_count > 0 ? (
            <Text style={styles.metaText}>{product.sold_count} terjual</Text>
          ) : null}
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatRupiah(product.price)}</Text>
          {discount > 0 && product.original_price ? (
            <Text style={styles.originalPrice}>{formatRupiah(product.original_price)}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.addButton, soldOut && styles.addButtonDisabled]}
          onPress={event => {
            event.stopPropagation()
            void handleAdd()
          }}
          disabled={soldOut || adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <Ionicons
                name="cart-outline"
                size={13}
                color={soldOut ? COLORS.muted : COLORS.primary}
              />
              <Text style={[styles.addText, soldOut && styles.addTextDisabled]}>
                {soldOut ? 'Stok Habis' : '+ Keranjang'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    margin: 4,
    ...SHADOW.card,
  },
  imageContainer: {
    position: 'relative',
    aspectRatio: 1,
    backgroundColor: COLORS.surfaceAlt,
  },
  image: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  content: { padding: 8 },
  brand: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: { color: COLORS.text, fontSize: 12, lineHeight: 16, minHeight: 32 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: { color: COLORS.textSecondary, fontSize: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 6 },
  price: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  originalPrice: {
    color: COLORS.muted,
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  addButtonDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  addText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  addTextDisabled: { color: COLORS.muted },
})
