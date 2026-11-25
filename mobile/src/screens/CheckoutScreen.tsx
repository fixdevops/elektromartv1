import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import EmptyState from '@/components/EmptyState'
import VoucherField from '@/components/VoucherField'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { showError } from '@/lib/alerts'
import { computeShipping, formatRupiah, orderCode } from '@/lib/commerce'
import { addressesFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { Address } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>

interface FormState {
  name: string
  phone: string
  address: string
  city: string
  postal: string
  notes: string
}

interface PaymentMethod {
  id: string
  label: string
  icon: string
  detail: string
  instructions: string[]
}

const PAYMENTS: PaymentMethod[] = [
  {
    id: 'transfer_bank',
    label: 'Transfer Bank',
    icon: '🏦',
    detail: 'BCA 1234567890 a.n. ElektroMart',
    instructions: [
      'Transfer ke rekening BCA 1234567890 a.n. ElektroMart',
      'Masukkan nomor pesanan pada keterangan transfer',
      'Unggah/masukkan URL bukti transfer agar admin dapat memverifikasi',
    ],
  },
  {
    id: 'ewallet',
    label: 'E-Wallet (GoPay / OVO / DANA)',
    icon: '📱',
    detail: '0812-0000-1234 a.n. ElektroMart',
    instructions: [
      'Kirim pembayaran ke 0812-0000-1234 (GoPay / OVO / DANA)',
      'Sertakan nomor pesanan pada catatan transaksi',
      'Simpan bukti transaksi dan masukkan URL-nya di bawah',
    ],
  },
  {
    id: 'cod',
    label: 'Bayar di Tempat (COD)',
    icon: '🏠',
    detail: 'Bayar saat kurir menyerahkan paket',
    instructions: [
      'Siapkan uang tunai saat paket tiba',
      'Cek kondisi barang sebelum membayar',
      'Tidak perlu mengunggah bukti pembayaran',
    ],
  },
]

const FIELD_TYPES: Record<string, 'default' | 'phone-pad' | 'number-pad'> = {
  phone: 'phone-pad',
  postal: 'number-pad',
}

export default function CheckoutScreen() {
  const nav = useNavigation<Nav>()
  const { user, profile } = useAuth()
  const {
    items,
    selectedItems,
    selectedCount,
    selectedTotal,
    discountAmount,
    voucher,
    consumeCheckoutItems,
    cancelBuyNow,
  } = useCart()
  const insets = useSafeAreaInsets()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', phone: '', address: '', city: '', postal: '', notes: '' })
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [saveAddress, setSaveAddress] = useState(false)
  const [courier, setCourier] = useState<'reguler' | 'instan' | 'gratis'>('reguler')
  const [payment, setPayment] = useState('transfer_bank')
  const [proofUrl, setProofUrl] = useState('')
  const [proofAsset, setProofAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const prefilledRef = useRef(false)
  const completedRef = useRef(false)
  const cancelBuyNowRef = useRef(cancelBuyNow)

  const chosen = selectedItems()
  const subtotal = selectedTotal()
  const discount = discountAmount()
  const shipping = computeShipping(subtotal, courier)
  const total = Math.max(0, subtotal + shipping - discount)
  const paymentMethod = PAYMENTS.find(method => method.id === payment) ?? PAYMENTS[0]

  const loadAddresses = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      showError('Gagal Memuat Alamat', error)
      return
    }
    const list = addressesFrom(data)
    setAddresses(list)
    const preferred = list.find(address => address.is_default) ?? list[0]
    if (preferred && !prefilledRef.current) {
      prefilledRef.current = true
      setSelectedAddressId(preferred.id)
      setForm({
        name: preferred.receiver_name,
        phone: preferred.phone,
        address: preferred.address,
        city: preferred.city,
        postal: preferred.postal_code,
        notes: '',
      })
    }
  }, [user])

  useFocusEffect(useCallback(() => { void loadAddresses() }, [loadAddresses]))

  useEffect(() => {
    setForm(previous => ({
      ...previous,
      name: previous.name || profile?.full_name || '',
      phone: previous.phone || profile?.phone || '',
      address: previous.address || profile?.address || '',
    }))
  }, [profile])

  useEffect(() => {
    if (courier === 'gratis' && !voucher) setCourier('reguler')
  }, [courier, voucher])

  useEffect(() => {
    cancelBuyNowRef.current = cancelBuyNow
  }, [cancelBuyNow])

  // Jika checkout ditinggalkan tanpa pesanan, kembalikan isi keranjang sebelum "Beli Sekarang".
  useEffect(() => () => {
    if (!completedRef.current) cancelBuyNowRef.current()
  }, [])

  const setField = (key: keyof FormState, value: string) => {
    setSelectedAddressId(null)
    setForm(previous => ({ ...previous, [key]: value }))
  }

  const useAddress = (address: Address) => {
    setSelectedAddressId(address.id)
    setForm({
      name: address.receiver_name,
      phone: address.phone,
      address: address.address,
      city: address.city,
      postal: address.postal_code,
      notes: form.notes,
    })
    setShowAddressForm(false)
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
    setProofUrl('')
  }

  const placeOrder = async () => {
    if (!user) return showError('Login Diperlukan', new Error('Silakan masuk untuk melanjutkan checkout'))
    if (chosen.length === 0) return showError('Keranjang Kosong', new Error('Pilih minimal satu produk untuk checkout'))

    if (form.name.trim().length < 2) return showError('Data Belum Lengkap', new Error('Nama penerima minimal 2 karakter'))
    if (form.phone.trim().length < 9) return showError('Data Belum Lengkap', new Error('Nomor HP tidak valid'))
    if (form.address.trim().length < 10) return showError('Data Belum Lengkap', new Error('Alamat lengkap terlalu pendek'))
    if (form.city.trim().length < 2) return showError('Data Belum Lengkap', new Error('Kota wajib diisi'))

    const proof = proofUrl.trim()
    if (proof && !/^https?:\/\//i.test(proof)) {
      return showError('Bukti Pembayaran', new Error('URL bukti bayar harus diawali http:// atau https://'))
    }

    setSubmitting(true)
    try {
      const { data: orderId, error } = await supabase.rpc('place_order', {
        p_items: chosen.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        p_shipping_name: form.name.trim(),
        p_shipping_phone: form.phone.trim(),
        p_shipping_address: form.address.trim(),
        p_shipping_city: form.city.trim(),
        p_shipping_postal: form.postal.trim() || '',
        p_notes: form.notes.trim() || '',
        p_payment_method: payment,
        p_payment_proof: proof || null,
        p_courier: courier,
        p_shipping_fee: shipping,
        p_voucher_code: voucher?.code ?? null,
        p_discount_amount: discount,
      })

      if (error) throw error
      if (!orderId) throw new Error('Pesanan gagal dibuat, silakan coba lagi')
      completedRef.current = true

      if (proofAsset && payment !== 'cod') {
        try {
          const extension = proofAsset.fileName?.split('.').pop()?.toLowerCase() || 'jpg'
          const contentType = proofAsset.mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`
          const path = `${user.id}/${String(orderId)}-${Date.now()}.${extension}`
          const formData = new FormData()
          formData.append('file', {
            uri: proofAsset.uri,
            name: `proof-${Date.now()}.${extension}`,
            type: contentType,
          } as any)
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(path, formData, { contentType, upsert: true })
          if (uploadError) throw uploadError
          const url = supabase.storage.from('payment-proofs').getPublicUrl(path).data.publicUrl
          const { error: proofError } = await supabase.rpc('mark_order_paid', {
            p_order_id: String(orderId),
            p_payment_proof: url,
          })
          if (proofError) throw proofError
        } catch (proofError) {
          showError('Bukti Bayar Gagal Dikirim', proofError)
        }
      }

      if (saveAddress) {
        const { error: addressError } = await supabase.from('addresses').insert({
          user_id: user.id,
          label: 'Alamat Utama',
          receiver_name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          postal_code: form.postal.trim(),
          is_default: addresses.length === 0,
        })
        if (addressError) showError('Alamat Gagal Disimpan', addressError)
      }

      await consumeCheckoutItems()
      nav.navigate('Orders')
      setTimeout(() => {
        showSuccessAlert(String(orderId))
      }, 150)
    } catch (err) {
      showError('Gagal Membuat Pesanan', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="person-outline"
          title="Masuk untuk melanjutkan"
          description="Kamu perlu masuk terlebih dahulu sebelum melakukan checkout"
          actionLabel="Masuk"
          onPressAction={() => nav.navigate('Login')}
        />
      </View>
    )
  }

  if (items.length === 0 || chosen.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="cart-outline"
          title="Tidak ada produk dipilih"
          description="Pilih produk di keranjang terlebih dahulu sebelum checkout"
          actionLabel="Kembali ke Keranjang"
          onPressAction={() => nav.navigate('Tabs', { screen: 'Keranjang' })}
        />
      </View>
    )
  }

  const fields: { key: keyof FormState; label: string; placeholder: string; multiline?: boolean }[] = [
    { key: 'name', label: 'Nama Penerima', placeholder: 'Nama lengkap' },
    { key: 'phone', label: 'Nomor HP', placeholder: '081234567890' },
    { key: 'address', label: 'Alamat Lengkap', placeholder: 'Jl. Contoh No. 12, RT 01/RW 02', multiline: true },
    { key: 'city', label: 'Kota', placeholder: 'Jakarta Selatan' },
    { key: 'postal', label: 'Kode Pos', placeholder: '12345' },
    { key: 'notes', label: 'Catatan (opsional)', placeholder: 'Pesan untuk kurir' },
  ]

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Alamat Pengiriman</Text>
            <TouchableOpacity style={styles.addAddressButton} onPress={() => setShowAddressForm(value => !value)}>
              <Ionicons name={showAddressForm ? 'close' : 'add'} size={15} color={COLORS.primary} />
              <Text style={styles.addAddressText}>{showAddressForm ? 'Tutup' : 'Alamat Baru'}</Text>
            </TouchableOpacity>
          </View>

          {addresses.map(address => {
            const active = selectedAddressId === address.id
            return (
              <TouchableOpacity
                key={address.id}
                style={[styles.addressCard, active && styles.addressCardActive]}
                onPress={() => useAddress(address)}
              >
                <Ionicons
                  name={active ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={active ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.addressBody}>
                  <Text style={styles.addressLabel}>
                    {address.label} · {address.receiver_name}
                    {address.is_default ? ' (Utama)' : ''}
                  </Text>
                  <Text style={styles.addressDetail}>{address.phone}</Text>
                  <Text style={styles.addressDetail} numberOfLines={2}>
                    {address.address}, {address.city} {address.postal_code}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}

          {showAddressForm || addresses.length === 0 ? (
            <View style={styles.form}>
              {fields.map(field => (
                <View key={field.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, field.multiline && styles.inputMultiline]}
                    value={form[field.key]}
                    onChangeText={value => setField(field.key, value)}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.muted}
                    keyboardType={FIELD_TYPES[field.key] ?? 'default'}
                    multiline={field.multiline}
                    textAlignVertical={field.multiline ? 'top' : 'auto'}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.checkRow} onPress={() => setSaveAddress(value => !value)}>
                <Ionicons
                  name={saveAddress ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={saveAddress ? COLORS.primary : COLORS.textSecondary}
                />
                <Text style={styles.checkText}>Simpan alamat ini untuk berikutnya</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car-sport-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Pengiriman</Text>
          </View>
          <View style={styles.courierList}>
            {([
              { id: 'reguler', label: 'Reguler', detail: 'Estimasi 2-3 hari' },
              { id: 'instan', label: 'Instan', detail: 'Estimasi hari ini' },
              { id: 'gratis', label: 'Gratis Ongkir', detail: 'Pakai voucher aktif' },
            ] as const).map(option => {
              const active = courier === option.id
              const disabled = option.id === 'gratis' && !voucher
              const fee = computeShipping(subtotal, option.id)
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.courierCard, active && styles.courierCardActive, disabled && styles.courierDisabled]}
                  disabled={disabled}
                  onPress={() => setCourier(option.id)}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={17}
                    color={active ? COLORS.primary : COLORS.textSecondary}
                  />
                  <View style={styles.courierBody}>
                    <Text style={styles.courierLabel}>{option.label}</Text>
                    <Text style={styles.courierDetail}>{option.detail}</Text>
                  </View>
                  <Text style={[styles.courierFee, fee === 0 && styles.freeText]}>
                    {disabled ? 'Butuh voucher' : fee === 0 ? 'GRATIS' : formatRupiah(fee)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Voucher</Text>
          </View>
          <VoucherField />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          </View>
          {PAYMENTS.map(method => {
            const active = payment === method.id
            return (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentCard, active && styles.paymentCardActive]}
                onPress={() => setPayment(method.id)}
              >
                <Text style={styles.paymentIcon}>{method.icon}</Text>
                <View style={styles.paymentBody}>
                  <Text style={styles.paymentLabel}>{method.label}</Text>
                  <Text style={styles.paymentDetail}>{method.detail}</Text>
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={17}
                  color={active ? COLORS.primary : COLORS.textSecondary}
                />
              </TouchableOpacity>
            )
          })}
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Cara Pembayaran</Text>
            {paymentMethod.instructions.map((instruction, index) => (
              <Text key={instruction} style={styles.instructionText}>{index + 1}. {instruction}</Text>
            ))}
          </View>
          {payment !== 'cod' && (
            <View style={styles.proofField}>
              <Text style={styles.fieldLabel}>URL Bukti Pembayaran (opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://contoh.com/bukti-transfer.jpg"
                placeholderTextColor={COLORS.muted}
                value={proofUrl}
                onChangeText={setProofUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity style={styles.proofPickButton} onPress={() => void pickProof()} disabled={submitting}>
                <Ionicons name="image-outline" size={15} color={COLORS.primary} />
                <Text style={styles.proofPickText}>{proofAsset ? 'Ganti Gambar Bukti' : 'Pilih Gambar Bukti'}</Text>
              </TouchableOpacity>
              {proofAsset ? (
                <Text style={styles.proofFile} numberOfLines={1}>{proofAsset.fileName ?? 'Gambar dipilih'}</Text>
              ) : null}
              <Text style={styles.proofHint}>
                Boleh diisi nanti lewat menu detail pesanan. Pilih gambar atau masukkan tautan bukti transfer.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Ringkasan Pesanan</Text>
          </View>
          {chosen.map(item => (
            <View key={item.product_id} style={styles.orderItem}>
              <Text style={styles.orderItemName} numberOfLines={2}>{item.product.name}</Text>
              <Text style={styles.orderItemQty}>
                {item.quantity} x {formatRupiah(item.product.price)}
              </Text>
              <Text style={styles.orderItemTotal}>{formatRupiah(item.quantity * item.product.price)}</Text>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({selectedCount()} barang)</Text>
            <Text style={styles.summaryValue}>{formatRupiah(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Diskon Voucher</Text>
              <Text style={styles.freeText}>-{formatRupiah(discount)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ongkir ({courier})</Text>
            <Text style={[styles.summaryValue, shipping === 0 && styles.freeText]}>
              {shipping === 0 ? 'GRATIS' : formatRupiah(shipping)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>Total</Text>
          <Text style={styles.bottomTotalValue}>{formatRupiah(total)}</Text>
        </View>
        <TouchableOpacity
          style={styles.orderButton}
          onPress={() => void placeOrder()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.orderButtonText}>Buat Pesanan</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

function showSuccessAlert(orderId: string) {
  Alert.alert(
    'Pesanan Berhasil 🎉',
    `Nomor pesanan ${orderCode(orderId)} berhasil dibuat. Lanjutkan pembayaran sesuai metode yang dipilih.`,
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 100 },
  section: {
    backgroundColor: COLORS.surface,
    marginBottom: 8,
    padding: 14,
    ...SHADOW.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitle: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '800' },
  addAddressButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addAddressText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  addressCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    marginBottom: 8,
  },
  addressCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  addressBody: { flex: 1 },
  addressLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  addressDetail: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  form: { marginTop: 4 },
  field: { marginBottom: 10 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 13,
    backgroundColor: COLORS.surface,
  },
  inputMultiline: { minHeight: 62 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  checkText: { color: COLORS.textSecondary, fontSize: 12 },
  courierList: { gap: 8 },
  courierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
  },
  courierCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  courierDisabled: { opacity: 0.55 },
  courierBody: { flex: 1 },
  courierLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  courierDetail: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  courierFee: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  freeText: { color: COLORS.success, fontSize: 12, fontWeight: '700' },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    marginBottom: 8,
  },
  paymentCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  paymentIcon: { fontSize: 21 },
  paymentBody: { flex: 1 },
  paymentLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  paymentDetail: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  instructions: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    padding: 11,
    marginTop: 4,
  },
  instructionsTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  instructionText: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 17 },
  proofField: { marginTop: 12 },
  proofPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    marginTop: 8,
  },
  proofPickText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  proofFile: { color: COLORS.success, fontSize: 11, marginTop: 5 },
  proofHint: { color: COLORS.muted, fontSize: 10, marginTop: 5, lineHeight: 14 },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  orderItemName: { flex: 1, color: COLORS.text, fontSize: 12 },
  orderItemQty: { color: COLORS.textSecondary, fontSize: 11 },
  orderItemTotal: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  summaryLabel: { color: COLORS.textSecondary, fontSize: 12 },
  summaryValue: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  totalLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  totalValue: { color: COLORS.primary, fontSize: 20, fontWeight: '800' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.raised,
  },
  bottomTotal: { flex: 1 },
  bottomTotalLabel: { color: COLORS.textSecondary, fontSize: 11 },
  bottomTotalValue: { color: COLORS.primary, fontSize: 17, fontWeight: '800' },
  orderButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  orderButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
})
