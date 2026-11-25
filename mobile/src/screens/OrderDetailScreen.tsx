import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { showError, showInfo } from '@/lib/alerts'
import { formatDateID, formatRupiah, getErrorMessage, orderCode } from '@/lib/commerce'
import { normalizeOrder, orderItemsFrom, reviewsFrom, statusEventsFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { Order, OrderItem, OrderStatusEvent, Review } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>
type Route = RouteProp<RootStackParamList, 'OrderDetail'>

export default function OrderDetailScreen() {
  const nav = useNavigation<Nav>()
  const { params } = useRoute<Route>()
  const { user } = useAuth()
  const { addItem } = useCart()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [history, setHistory] = useState<OrderStatusEvent[]>([])
  const [myReviews, setMyReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [proofInput, setProofInput] = useState('')
  const [proofAsset, setProofAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error) {
      showError('Gagal Memuat Pesanan', error)
      setLoading(false)
      return
    }
    if (!data) {
      setOrder(null)
      setLoading(false)
      return
    }

    const found = normalizeOrder(data)
    const [itemsRes, historyRes, reviewsRes] = await Promise.all([
      supabase.from('order_items').select('*, product:products(*)').eq('order_id', found.id),
      supabase.from('order_status_history').select('*').eq('order_id', found.id).order('created_at', { ascending: true }),
      supabase.from('reviews').select('*').eq('user_id', user.id),
    ])

    const loadedItems = orderItemsFrom(itemsRes.data)
    setItems(loadedItems)
    setHistory(statusEventsFrom(historyRes.data))
    const reviews = reviewsFrom(reviewsRes.data)
    setMyReviews(reviews)
    const initialRatings: Record<string, number> = {}
    const initialComments: Record<string, string> = {}
    reviews.forEach(review => {
      initialRatings[review.product_id] = review.rating
      initialComments[review.product_id] = review.comment ?? ''
    })
    setRatings(initialRatings)
    setComments(initialComments)
    setProofInput(found.payment_proof ?? '')
    setOrder(found)
    setLoading(false)
  }, [params.id, user])

  useFocusEffect(useCallback(() => { void loadDetail() }, [loadDetail]))

  useEffect(() => {
    if (order?.payment_proof) setProofInput(order.payment_proof)
  }, [order?.payment_proof])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.centerText}>Memuat detail pesanan...</Text>
      </View>
    )
  }

  if (!order) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Pesanan tidak ditemukan"
        actionLabel="Lihat Pesanan"
        onPressAction={() => nav.navigate('Orders')}
      />
    )
  }

  const timeline = history.length > 0
    ? history
    : [{ id: 'created', order_id: order.id, status: order.status, note: 'Pesanan dibuat', created_at: order.created_at } as OrderStatusEvent]

  const handleCancel = () => {
    Alert.alert('Batalkan Pesanan', `Batalkan pesanan ${orderCode(order.id)}? Stok produk akan dikembalikan.`, [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Batalkan',
        style: 'destructive',
        onPress: async () => {
          setBusy(true)
          try {
            const { error } = await supabase.rpc('cancel_order', { p_order_id: order.id })
            if (error) throw error
            showInfo('Pesanan Dibatalkan', 'Pesanan berhasil dibatalkan')
            await loadDetail()
          } catch (err) {
            showError('Gagal Membatalkan', err)
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  const pickProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      return showError('Izin Ditolak', new Error('Izinkan akses galeri untuk memilih bukti bayar'))
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (result.canceled || !result.assets?.[0]) return
    setProofAsset(result.assets[0])
    setProofInput('')
  }

  const saveProof = async () => {
    if (!user) return
    setBusy(true)
    try {
      let url = proofInput.trim()

      if (proofAsset) {
        const extension = proofAsset.fileName?.split('.').pop()?.toLowerCase() || 'jpg'
        const contentType = proofAsset.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`
        const fileName = `proof-${Date.now()}.${extension}`
        const path = `${user.id}/${order.id}-${Date.now()}.${extension}`
        const formData = new FormData()
        formData.append('file', {
          uri: proofAsset.uri,
          name: fileName,
          type: contentType,
        } as any)

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(path, formData, { contentType, upsert: true })
        if (uploadError) throw uploadError
        url = supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl
      }

      if (!url) throw new Error('Pilih gambar atau masukkan URL bukti bayar terlebih dahulu')
      if (!/^https?:\/\//i.test(url)) throw new Error('URL harus diawali http:// atau https://')

      const { error } = await supabase.rpc('mark_order_paid', {
        p_order_id: order.id,
        p_payment_proof: url,
      })
      if (error) throw error

      setProofAsset(null)
      setProofInput(url)
      showInfo('Berhasil', 'Bukti pembayaran terkirim, pesanan menunggu verifikasi admin')
      await loadDetail()
    } catch (err) {
      showError('Gagal Menyimpan Bukti', err)
    } finally {
      setBusy(false)
    }
  }

  const openProof = async () => {
    if (!order.payment_proof) return
    try {
      await Linking.openURL(order.payment_proof)
    } catch (err) {
      showError('Gagal Membuka Bukti', err)
    }
  }

  const submitReview = async (productId: string) => {
    if (!user) return
    const rating = ratings[productId] ?? 5
    setBusy(true)
    try {
      const { error } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: user.id,
        rating,
        comment: comments[productId]?.trim() || null,
      })
      if (error) throw error
      showInfo('Terima Kasih', 'Ulasan kamu berhasil dikirim')
      await loadDetail()
    } catch (err) {
      showError('Gagal Mengirim Ulasan', getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const buyAgain = async (item: OrderItem) => {
    if (!item.product) return
    await addItem(item.product, item.quantity)
    nav.navigate('Tabs', { screen: 'Keranjang' })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.orderCode}>{orderCode(order.id)}</Text>
            <Text style={styles.orderDate}>{formatDateID(order.created_at, true)}</Text>
          </View>
          <StatusBadge status={order.status} />
        </View>

        <View style={styles.timeline}>
          {timeline.map((event, index) => (
            <View key={event.id} style={styles.timelineRow}>
              <View style={styles.timelineMarker}>
                <View style={[styles.timelineDot, index === timeline.length - 1 && styles.timelineDotActive]} />
                {index < timeline.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineBody}>
                <View style={styles.timelineTitleRow}>
                  <Text style={styles.timelineTitle}>{STATUS_LABEL_LOCAL[event.status] ?? event.status}</Text>
                  <Text style={styles.timelineDate}>{formatDateID(event.created_at, true)}</Text>
                </View>
                {event.note ? <Text style={styles.timelineNote}>{event.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        {order.tracking_number ? (
          <View style={styles.trackingBox}>
            <Ionicons name="bus-outline" size={17} color={COLORS.primary} />
            <Text style={styles.trackingText}>Nomor Resi: {order.tracking_number}</Text>
          </View>
        ) : null}

        {(order.status === 'pending' || order.status === 'paid') && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={busy}>
            <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
            <Text style={styles.cancelText}>Batalkan Pesanan</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Produk Dipesan</Text>
        {items.length === 0 ? (
          <Text style={styles.muted}>Detail produk tidak tersedia.</Text>
        ) : (
          items.map(item => {
            const reviewed = myReviews.some(review => review.product_id === item.product_id)
            return (
              <View key={item.id} style={styles.productRow}>
                {item.product?.images[0] ? (
                  <Image source={{ uri: item.product.images[0] }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.productImage, styles.imageFallback]}>
                    <Ionicons name="image-outline" size={20} color={COLORS.muted} />
                  </View>
                )}
                <View style={styles.productInfo}>
                  {item.product ? (
                    <TouchableOpacity onPress={() => nav.navigate('ProductDetail', { slug: item.product!.slug })}>
                      <Text style={styles.productName} numberOfLines={2}>{item.product.name}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.productName} numberOfLines={2}>Produk</Text>
                  )}
                  <Text style={styles.productQty}>{item.quantity} x {formatRupiah(item.unit_price)}</Text>
                  <Text style={styles.productSubtotal}>{formatRupiah(item.quantity * item.unit_price)}</Text>
                </View>

                <TouchableOpacity style={styles.buyAgainButton} onPress={() => void buyAgain(item)}>
                  <Text style={styles.buyAgainText}>Beli Lagi</Text>
                </TouchableOpacity>

                {order.status === 'delivered' && (
                  <View style={styles.reviewBox}>
                    {reviewed ? (
                      <View style={styles.reviewedRow}>
                        <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
                        <Text style={styles.reviewedText}>Kamu sudah mengulas produk ini</Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.reviewTitle}>Tulis Ulasan</Text>
                        <View style={styles.stars}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <TouchableOpacity
                              key={star}
                              onPress={() => setRatings(prev => ({ ...prev, [item.product_id]: star }))}
                            >
                              <Ionicons
                                name={star <= (ratings[item.product_id] ?? 5) ? 'star' : 'star-outline'}
                                size={21}
                                color="#f5a623"
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={styles.reviewInput}
                          placeholder="Bagaimana kualitas produknya?"
                          placeholderTextColor={COLORS.muted}
                          value={comments[item.product_id] ?? ''}
                          onChangeText={value => setComments(prev => ({ ...prev, [item.product_id]: value }))}
                          multiline
                        />
                        <TouchableOpacity
                          style={styles.reviewButton}
                          onPress={() => void submitReview(item.product_id)}
                          disabled={busy}
                        >
                          <Text style={styles.reviewButtonText}>Kirim Ulasan</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            )
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Informasi Pengiriman</Text>
        <InfoRow label="Penerima" value={order.shipping_name} />
        <InfoRow label="Telepon" value={order.shipping_phone} />
        <InfoRow label="Alamat" value={`${order.shipping_address}, ${order.shipping_city} ${order.shipping_postal ?? ''}`} />
        <InfoRow label="Kurir" value={order.courier ?? 'Reguler'} />
        <InfoRow label="Metode Bayar" value={order.payment_method ?? '-'} />
        {order.voucher_code ? <InfoRow label="Voucher" value={order.voucher_code} /> : null}
        {order.notes ? <InfoRow label="Catatan" value={order.notes} /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rincian Pembayaran</Text>
        <InfoRow label="Subtotal" value={formatRupiah(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0))} />
        <InfoRow label="Ongkir" value={order.shipping_fee === 0 ? 'GRATIS' : formatRupiah(order.shipping_fee)} />
        {order.discount_amount > 0 ? (
          <InfoRow label="Diskon" value={`-${formatRupiah(order.discount_amount)}`} accentSuccess />
        ) : null}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatRupiah(order.total_amount)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Bukti Pembayaran</Text>
        {order.payment_proof ? (
          <>
            <Text style={styles.proofUrl} numberOfLines={2}>{order.payment_proof}</Text>
            <TouchableOpacity style={styles.outlineButton} onPress={() => void openProof()}>
              <Ionicons name="open-outline" size={15} color={COLORS.primary} />
              <Text style={styles.outlineButtonText}>Lihat Bukti</Text>
            </TouchableOpacity>
          </>
        ) : null}
        {(order.status === 'pending' || order.status === 'paid') && (
          <>
            <TouchableOpacity style={styles.outlineButton} onPress={() => void pickProof()} disabled={busy}>
              <Ionicons name="image-outline" size={15} color={COLORS.primary} />
              <Text style={styles.outlineButtonText}>{proofAsset ? 'Ganti Gambar' : 'Pilih Gambar Bukti'}</Text>
            </TouchableOpacity>
            {proofAsset ? (
              <Text style={styles.proofFile} numberOfLines={1}>{proofAsset.fileName ?? 'Gambar dipilih'}</Text>
            ) : null}
            <Text style={styles.fieldLabel}>Atau masukkan URL bukti transfer</Text>
            <TextInput
              style={styles.input}
              placeholder="https://contoh.com/bukti.jpg"
              placeholderTextColor={COLORS.muted}
              value={proofInput}
              onChangeText={setProofInput}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity style={styles.primaryButton} onPress={() => void saveProof()} disabled={busy}>
              <Text style={styles.primaryButtonText}>Kirim Bukti</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  )
}

const STATUS_LABEL_LOCAL: Record<string, string> = {
  pending: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
}

function InfoRow({ label, value, accentSuccess = false }: { label: string; value: string; accentSuccess?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accentSuccess && styles.successText]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { color: COLORS.textSecondary, fontSize: 13 },
  scroll: { padding: 10, paddingBottom: 30 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.card,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderCode: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  orderDate: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  timeline: { marginTop: 16 },
  timelineRow: { flexDirection: 'row', gap: 10 },
  timelineMarker: { alignItems: 'center', width: 14 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border, marginTop: 4 },
  timelineDotActive: { backgroundColor: COLORS.primary },
  timelineLine: { width: 2, flex: 1, minHeight: 26, backgroundColor: COLORS.borderLight },
  timelineBody: { flex: 1, paddingBottom: 14 },
  timelineTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  timelineTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  timelineDate: { color: COLORS.muted, fontSize: 10 },
  timelineNote: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  trackingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight,
  },
  trackingText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.sm,
  },
  cancelText: { color: COLORS.danger, fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  productRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  productImage: { width: 62, height: 62, borderRadius: RADIUS.sm },
  imageFallback: { backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, minWidth: 140 },
  productName: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  productQty: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  productSubtotal: { color: COLORS.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  buyAgainButton: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  buyAgainText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  reviewBox: { width: '100%', marginTop: 4, padding: 10, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt },
  reviewTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  stars: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  reviewInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    padding: 9,
    color: COLORS.text,
    fontSize: 12,
    minHeight: 54,
    textAlignVertical: 'top',
  },
  reviewButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 8, alignItems: 'center', marginTop: 8 },
  reviewButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  reviewedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reviewedText: { color: COLORS.success, fontSize: 11 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 },
  infoLabel: { color: COLORS.textSecondary, fontSize: 12 },
  infoValue: { color: COLORS.text, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  successText: { color: COLORS.success, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  totalLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  totalValue: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  proofUrl: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 8 },
  proofFile: { color: COLORS.success, fontSize: 11, marginTop: 6 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 9, color: COLORS.text, fontSize: 12 },
  outlineButton: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 8 },
  outlineButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  primaryButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  muted: { color: COLORS.textSecondary, fontSize: 12 },
  bottomSpace: { height: 10 },
})
