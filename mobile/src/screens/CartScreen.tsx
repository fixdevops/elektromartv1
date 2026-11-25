import React from 'react'
import {
  ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import QtyStepper from '@/components/QtyStepper'
import ScreenHeader from '@/components/ScreenHeader'
import VoucherField from '@/components/VoucherField'
import { useCart } from '@/contexts/CartContext'
import { computeShipping, formatRupiah } from '@/lib/commerce'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'

type Nav = StackNavigationProp<RootStackParamList>

export default function CartScreen() {
  const nav = useNavigation<Nav>()
  const {
    items,
    selectedIds,
    isLoading,
    toggleSelect,
    selectAll,
    updateQuantity,
    removeItem,
    clearItems,
    selectedItems,
    selectedTotal,
    selectedCount,
    discountAmount,
  } = useCart()

  const allSelected = items.length > 0 && selectedIds.length === items.length
  const subtotal = selectedTotal()
  const discount = discountAmount()
  const shipping = computeShipping(subtotal, 'reguler')
  const total = Math.max(0, subtotal + shipping - discount)

  const confirmDeleteSelected = () => {
    if (selectedIds.length === 0) return
    Alert.alert('Hapus Item', `Hapus ${selectedIds.length} produk yang dipilih dari keranjang?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => void clearItems(selectedIds) },
    ])
  }

  const confirmDeleteItem = (productId: string, name: string) => {
    Alert.alert('Hapus Item', `Hapus ${name} dari keranjang?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => void removeItem(productId) },
    ])
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat keranjang...</Text>
      </View>
    )
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Keranjang" />
        <EmptyState
          icon="cart-outline"
          title="Keranjang kamu kosong"
          description="Yuk, cari produk elektronik favoritmu dulu"
          actionLabel="Mulai Belanja"
          onPressAction={() => nav.navigate('Tabs', { screen: 'Produk' })}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Keranjang" subtitle={`${items.length} produk di keranjang`} />

      <View style={styles.selectionBar}>
        <TouchableOpacity style={styles.selectAll} onPress={() => selectAll(!allSelected)}>
          <Ionicons
            name={allSelected ? 'checkbox' : 'square-outline'}
            size={19}
            color={allSelected ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={styles.selectAllText}>Pilih Semua ({items.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDeleteSelected} disabled={selectedIds.length === 0}>
          <Text style={[styles.deleteText, selectedIds.length === 0 && styles.deleteTextDisabled]}>
            Hapus
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.product_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const checked = selectedIds.includes(item.product_id)
          return (
            <View style={styles.itemCard}>
              <TouchableOpacity
                style={styles.itemMain}
                onPress={() => nav.navigate('ProductDetail', { slug: item.product.slug })}
                activeOpacity={0.8}
              >
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={event => {
                    event.stopPropagation()
                    toggleSelect(item.product_id)
                  }}
                  hitSlop={6}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={checked ? COLORS.primary : COLORS.textSecondary}
                  />
                </TouchableOpacity>

                {item.product.images[0] ? (
                  <Image source={{ uri: item.product.images[0] }} style={styles.image} resizeMode="cover" />
                ) : (
                  <View style={[styles.image, styles.imageFallback]}>
                    <Ionicons name="image-outline" size={22} color={COLORS.muted} />
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                  {item.variant ? <Text style={styles.variant}>{item.variant}</Text> : null}
                  <Text style={styles.price}>{formatRupiah(item.product.price)}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.itemFooter}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDeleteItem(item.product_id, item.product.name)}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.deleteItemText}>Hapus</Text>
                </TouchableOpacity>
                <QtyStepper
                  value={item.quantity}
                  max={item.product.stock}
                  compact
                  onChange={value => void updateQuantity(item.product_id, value)}
                />
              </View>
            </View>
          )
        }}
        ListFooterComponent={
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Ringkasan Belanja</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal ({selectedCount()} barang)</Text>
              <Text style={styles.summaryValue}>{formatRupiah(subtotal)}</Text>
            </View>
            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Diskon Voucher</Text>
                <Text style={styles.discountValue}>-{formatRupiah(discount)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ongkir (Reguler)</Text>
              <Text style={[styles.summaryValue, shipping === 0 && styles.discountValue]}>
                {shipping === 0 ? 'GRATIS' : formatRupiah(shipping)}
              </Text>
            </View>

            <View style={styles.voucherSection}>
              <Text style={styles.voucherTitle}>Pakai Voucher</Text>
              <VoucherField />
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutButton, selectedIds.length === 0 && styles.checkoutDisabled]}
              disabled={selectedIds.length === 0}
              onPress={() => nav.navigate('Checkout')}
            >
              <Text style={styles.checkoutText}>
                Checkout ({selectedIds.length} produk)
              </Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 13 },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  selectAllText: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  deleteText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  deleteTextDisabled: { color: COLORS.muted },
  list: { padding: 10, paddingBottom: 24 },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    marginBottom: 8,
    ...SHADOW.card,
  },
  itemMain: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  checkbox: { padding: 2 },
  image: { width: 72, height: 72, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { color: COLORS.text, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  variant: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  price: { color: COLORS.primary, fontSize: 14, fontWeight: '800', marginTop: 6 },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteItemText: { color: COLORS.danger, fontSize: 12 },
  summary: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 14,
    marginTop: 8,
    ...SHADOW.card,
  },
  summaryTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 12 },
  summaryValue: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  discountValue: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
  voucherSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  voucherTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  totalLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  totalValue: { color: COLORS.primary, fontSize: 19, fontWeight: '800' },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  checkoutDisabled: { backgroundColor: COLORS.muted },
  checkoutText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
})
