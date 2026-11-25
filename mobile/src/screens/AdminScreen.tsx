import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import { showError, showInfo } from '@/lib/alerts'
import { formatDateID, formatRupiah, orderCode, STATUS_FLOW, STATUS_LABELS } from '@/lib/commerce'
import { ordersFrom, productsFrom, vouchersFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { Category, Order, OrderStatus, Product, Profile, Voucher } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>
type AdminTab = 'orders' | 'products' | 'vouchers' | 'users'

type ProductDraft = {
  id?: string
  name: string
  slug: string
  price: string
  stock: string
  categorySlug: string
  imageUrl: string
}

type VoucherDraft = {
  originalCode?: string
  code: string
  description: string
  discountType: 'fixed' | 'percent'
  value: string
  minSpend: string
  maxDiscount: string
  expiresAt: string
  usageLimit: string
}

const emptyProductDraft = (): ProductDraft => ({
  name: '', slug: '', price: '', stock: '10', categorySlug: '', imageUrl: '',
})

const emptyVoucherDraft = (): VoucherDraft => ({
  code: '', description: '', discountType: 'fixed', value: '', minSpend: '0',
  maxDiscount: '', expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  usageLimit: '',
})

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function AdminScreen() {
  const nav = useNavigation<Nav>()
  const { user, profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState<AdminTab>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [nextStatus, setNextStatus] = useState<OrderStatus>('paid')
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState('')
  const [saving, setSaving] = useState(false)
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null)
  const [voucherDraft, setVoucherDraft] = useState<VoucherDraft | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [orderRes, voucherRes, productRes, categoryRes, profileRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('vouchers').select('*').order('code'),
      supabase.from('products').select('*, category:categories(*)').order('created_at', { ascending: false }).limit(100),
      supabase.from('categories').select('*').order('name'),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
    ])

    if (orderRes.error) showError('Gagal Memuat Pesanan', orderRes.error)
    if (voucherRes.error) showError('Gagal Memuat Voucher', voucherRes.error)
    if (productRes.error) showError('Gagal Memuat Produk', productRes.error)
    if (categoryRes.error) showError('Gagal Memuat Kategori', categoryRes.error)
    if (profileRes.error) showError('Gagal Memuat Pengguna', profileRes.error)

    setOrders(ordersFrom(orderRes.data))
    setVouchers(vouchersFrom(voucherRes.data))
    setProducts(productsFrom(productRes.data))
    setCategories((categoryRes.data ?? []) as Category[])
    setProfiles((profileRes.data ?? []) as Profile[])
    setLoading(false)
  }, [])

  useFocusEffect(useCallback(() => {
    void (async () => {
      await refreshProfile()
      await loadData()
    })()
  }, [loadData, refreshProfile]))

  const totalRevenue = orders
    .filter(order => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total_amount, 0)
  const pendingCount = orders.filter(order => order.status === 'pending').length

  const openStatusModal = (order: Order) => {
    setSelected(order)
    const currentIndex = STATUS_FLOW.indexOf(order.status)
    setNextStatus(currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1
      ? STATUS_FLOW[currentIndex + 1]
      : order.status)
    setNote('')
    setTracking(order.tracking_number ?? '')
  }

  const updateStatus = async () => {
    if (!selected) return
    if (selected.status === 'cancelled') {
      return showError('Status Final', new Error('Pesanan yang sudah dibatalkan tidak dapat diubah'))
    }
    if (nextStatus === selected.status) {
      return showInfo('Tidak Ada Perubahan', 'Pilih status yang berbeda sebelum menyimpan')
    }
    setSaving(true)
    try {
      const { error } = await supabase.rpc('update_order_status', {
        p_order_id: selected.id,
        p_status: nextStatus,
        p_note: note.trim() || null,
        p_tracking_number: tracking.trim() || null,
      })
      if (error) throw error
      showInfo('Status Diperbarui', `Pesanan ${orderCode(selected.id)} sekarang ${STATUS_LABELS[nextStatus].toLowerCase()}`)
      setSelected(null)
      await loadData()
    } catch (error) {
      showError('Gagal Memperbarui Status', error)
    } finally {
      setSaving(false)
    }
  }

  const statusLocked = selected?.status === 'cancelled' || nextStatus === selected?.status

  const confirmDelete = (title: string, message: string, action: () => void) => {
    Alert.alert(title, message, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: action },
    ])
  }

  const openProductDraft = (product?: Product) => {
    setProductDraft(product ? {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: String(product.price),
      stock: String(product.stock),
      categorySlug: product.category?.slug ?? product.category?.name ?? '',
      imageUrl: product.images[0] ?? '',
    } : emptyProductDraft())
  }

  const saveProduct = async () => {
    if (!productDraft) return
    const name = productDraft.name.trim()
    if (name.length < 2) return showError('Produk', new Error('Nama produk minimal 2 karakter'))
    const price = Number(productDraft.price)
    const stock = Number(productDraft.stock)
    if (!Number.isFinite(price) || price < 0) return showError('Produk', new Error('Harga tidak valid'))
    if (!Number.isInteger(stock) || stock < 0) return showError('Produk', new Error('Stok harus bilangan bulat >= 0'))

    const slug = productDraft.slug.trim() || slugify(name)
    if (!slug) return showError('Produk', new Error('Slug tidak valid'))
    const categoryKey = productDraft.categorySlug.trim().toLowerCase()
    const category = categories.find(item =>
      item.slug.toLowerCase() === categoryKey || item.name.toLowerCase() === categoryKey,
    )
    const imageUrl = productDraft.imageUrl.trim()
    const payload = {
      name,
      slug,
      price,
      stock,
      category_id: category?.id ?? null,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    }

    setSaving(true)
    try {
      const { error } = productDraft.id
        ? await supabase.from('products').update(payload).eq('id', productDraft.id)
        : await supabase.from('products').insert({ ...payload, images: imageUrl ? [imageUrl] : [] })
      if (error) throw error
      showInfo('Berhasil', productDraft.id ? 'Produk diperbarui' : 'Produk ditambahkan')
      setProductDraft(null)
      await loadData()
    } catch (error) {
      showError('Gagal Menyimpan Produk', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleProduct = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)
    if (error) return showError('Gagal Mengubah Produk', error)
    showInfo('Berhasil', product.is_active ? 'Produk dinonaktifkan' : 'Produk diaktifkan')
    await loadData()
  }

  const deleteProduct = (product: Product) => {
    confirmDelete('Hapus Produk', `Hapus "${product.name}"? Tindakan ini tidak bisa dibatalkan.`, async () => {
      const { error } = await supabase.from('products').delete().eq('id', product.id)
      if (error) return showError('Gagal Menghapus Produk', error)
      showInfo('Berhasil', 'Produk dihapus')
      await loadData()
    })
  }

  const openVoucherDraft = (voucher?: Voucher) => {
    setVoucherDraft(voucher ? {
      originalCode: voucher.code,
      code: voucher.code,
      description: voucher.description,
      discountType: voucher.discount_type,
      value: String(voucher.value),
      minSpend: String(voucher.min_spend),
      maxDiscount: voucher.max_discount != null ? String(voucher.max_discount) : '',
      expiresAt: voucher.expires_at.slice(0, 10),
      usageLimit: voucher.usage_limit != null ? String(voucher.usage_limit) : '',
    } : emptyVoucherDraft())
  }

  const saveVoucher = async () => {
    if (!voucherDraft) return
    const code = voucherDraft.code.trim().toUpperCase()
    if (!/^[A-Z0-9_-]+$/.test(code)) return showError('Voucher', new Error('Kode hanya boleh huruf, angka, - dan _'))
    const value = Number(voucherDraft.value)
    const minSpend = Number(voucherDraft.minSpend)
    if (!Number.isFinite(value) || value <= 0) return showError('Voucher', new Error('Nilai diskon tidak valid'))
    if (!Number.isFinite(minSpend) || minSpend < 0) return showError('Voucher', new Error('Minimum belanja tidak valid'))
    const expires = new Date(`${voucherDraft.expiresAt}T23:59:59`)
    if (Number.isNaN(expires.getTime())) return showError('Voucher', new Error('Tanggal kedaluwarsa tidak valid'))

    const payload = {
      code,
      description: voucherDraft.description.trim() || `Voucher ${code}`,
      discount_type: voucherDraft.discountType,
      value,
      min_spend: minSpend,
      max_discount: voucherDraft.maxDiscount.trim() ? Number(voucherDraft.maxDiscount) : null,
      expires_at: expires.toISOString(),
      usage_limit: voucherDraft.usageLimit.trim() ? Number(voucherDraft.usageLimit) : null,
    }

    setSaving(true)
    try {
      const { error } = voucherDraft.originalCode
        ? await supabase.from('vouchers').update(payload).eq('code', voucherDraft.originalCode)
        : await supabase.from('vouchers').insert({ ...payload, used_count: 0, is_active: true })
      if (error) throw error
      showInfo('Berhasil', voucherDraft.originalCode ? 'Voucher diperbarui' : 'Voucher ditambahkan')
      setVoucherDraft(null)
      await loadData()
    } catch (error) {
      showError('Gagal Menyimpan Voucher', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleVoucher = async (voucher: Voucher) => {
    const { error } = await supabase
      .from('vouchers')
      .update({ is_active: !voucher.is_active })
      .eq('code', voucher.code)
    if (error) return showError('Gagal Mengubah Voucher', error)
    showInfo('Berhasil', voucher.is_active ? 'Voucher dinonaktifkan' : 'Voucher diaktifkan')
    await loadData()
  }

  const deleteVoucher = (voucher: Voucher) => {
    confirmDelete('Hapus Voucher', `Hapus voucher ${voucher.code}?`, async () => {
      const { error } = await supabase.from('vouchers').delete().eq('code', voucher.code)
      if (error) return showError('Gagal Menghapus Voucher', error)
      showInfo('Berhasil', 'Voucher dihapus')
      await loadData()
    })
  }

  const changeRole = async (target: Profile) => {
    if (target.id === user?.id && target.role === 'admin') {
      return showError('Role Admin', new Error('Tidak dapat menurunkan role admin yang sedang login'))
    }
    const role = target.role === 'admin' ? 'customer' : 'admin'
    const { error } = await supabase.from('profiles').update({ role }).eq('id', target.id)
    if (error) return showError('Gagal Mengubah Role', error)
    showInfo('Berhasil', `${target.full_name ?? 'Pengguna'} sekarang ${role}`)
    await loadData()
  }

  if (profile?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="lock-closed-outline"
          title="Halaman Admin"
          description="Kamu tidak memiliki akses ke panel admin. Masuk dengan akun admin untuk melanjutkan."
          actionLabel={profile ? 'Kembali ke Akun' : 'Masuk'}
          onPressAction={() => (profile ? nav.navigate('Tabs', { screen: 'Akun' }) : nav.navigate('Login'))}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar} contentContainerStyle={styles.tabsContent}>
        <TouchableOpacity
          style={[styles.tab, tab === 'orders' && styles.tabActive]}
          onPress={() => setTab('orders')}
        >
          <Text style={[styles.tabText, tab === 'orders' && styles.tabTextActive]}>Pesanan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'products' && styles.tabActive]}
          onPress={() => setTab('products')}
        >
          <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>Produk</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'vouchers' && styles.tabActive]}
          onPress={() => setTab('vouchers')}
        >
          <Text style={[styles.tabText, tab === 'vouchers' && styles.tabTextActive]}>Voucher</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'users' && styles.tabActive]}
          onPress={() => setTab('users')}
        >
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Pengguna</Text>
        </TouchableOpacity>
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat data admin...</Text>
        </View>
      ) : tab === 'orders' ? (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatCard icon="receipt-outline" label="Total Pesanan" value={String(orders.length)} color={COLORS.primary} />
              <StatCard icon="time-outline" label="Menunggu" value={String(pendingCount)} color={COLORS.warning} />
              <StatCard icon="wallet-outline" label="Omzet" value={formatRupiah(totalRevenue)} color={COLORS.success} />
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderCode}>{orderCode(item.id)}</Text>
                  <Text style={styles.orderDate}>{formatDateID(item.created_at, true)}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.customer}>{item.shipping_name} · {item.shipping_phone}</Text>
              <Text style={styles.customer} numberOfLines={2}>{item.shipping_address}, {item.shipping_city}</Text>
              <View style={styles.orderFooter}>
                <View>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatRupiah(item.total_amount)}</Text>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={() => openStatusModal(item)}>
                  <Ionicons name="create-outline" size={14} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Update Status</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" title="Belum ada pesanan" description="Pesanan pelanggan akan muncul di sini" />
          }
        />
      ) : tab === 'products' ? (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity style={styles.addButton} onPress={() => openProductDraft()}>
              <Ionicons name="add" size={16} color={COLORS.white} />
              <Text style={styles.addButtonText}>Produk Baru</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={styles.voucherCard}>
              <View style={styles.voucherIcon}>
                <Ionicons name="cube-outline" size={19} color={COLORS.primary} />
              </View>
              <View style={styles.voucherBody}>
                <View style={styles.voucherHeader}>
                  <Text style={styles.voucherCode} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.voucherStatus, item.is_active ? styles.voucherActive : styles.voucherInactive]}>
                    <Text style={[styles.voucherStatusText, item.is_active && styles.voucherActiveText]}>
                      {item.is_active ? 'Aktif' : 'Nonaktif'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.voucherMeta}>
                  {formatRupiah(item.price)} · Stok {item.stock} · {item.category?.name ?? 'Tanpa kategori'}
                </Text>
                <Text style={styles.voucherMeta}>{item.slug}</Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.miniButton} onPress={() => openProductDraft(item)}>
                    <Text style={styles.miniButtonText}>Ubah</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniButton} onPress={() => void toggleProduct(item)}>
                    <Text style={styles.miniButtonText}>{item.is_active ? 'Nonaktifkan' : 'Aktifkan'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.miniButton, styles.miniButtonDanger]} onPress={() => deleteProduct(item)}>
                    <Text style={styles.miniButtonDangerText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="cube-outline" title="Belum ada produk" description="Tekan Produk Baru untuk menambah produk" />
          }
        />
      ) : tab === 'users' ? (
        <FlatList
          data={profiles}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.voucherCard}>
              <View style={styles.voucherIcon}>
                <Ionicons name="person-outline" size={19} color={COLORS.primary} />
              </View>
              <View style={styles.voucherBody}>
                <View style={styles.voucherHeader}>
                  <Text style={styles.voucherCode} numberOfLines={1}>{item.full_name ?? 'Pengguna'}</Text>
                  <View style={[styles.voucherStatus, item.role === 'admin' ? styles.voucherActive : styles.voucherInactive]}>
                    <Text style={[styles.voucherStatusText, item.role === 'admin' && styles.voucherActiveText]}>
                      {item.role === 'admin' ? 'Admin' : 'Pembeli'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.voucherMeta}>{item.phone ?? 'Tanpa nomor telepon'}</Text>
                <TouchableOpacity style={styles.miniButton} onPress={() => void changeRole(item)}>
                  <Text style={styles.miniButtonText}>
                    Jadikan {item.role === 'admin' ? 'Pembeli' : 'Admin'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="Belum ada pengguna" description="Pengguna yang mendaftar akan muncul di sini" />
          }
        />
      ) : (
        <FlatList
          data={vouchers}
          keyExtractor={item => item.code}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity style={styles.addButton} onPress={() => openVoucherDraft()}>
              <Ionicons name="add" size={16} color={COLORS.white} />
              <Text style={styles.addButtonText}>Voucher Baru</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={styles.voucherCard}>
              <View style={styles.voucherIcon}>
                <Ionicons name="pricetag" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.voucherBody}>
                <View style={styles.voucherHeader}>
                  <Text style={styles.voucherCode}>{item.code}</Text>
                  <View style={[styles.voucherStatus, item.is_active ? styles.voucherActive : styles.voucherInactive]}>
                    <Text style={[styles.voucherStatusText, item.is_active && styles.voucherActiveText]}>
                      {item.is_active ? 'Aktif' : 'Nonaktif'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.voucherDesc} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.voucherMeta}>
                  {item.discount_type === 'percent'
                    ? `${item.value}%${item.max_discount ? ` (maks. ${formatRupiah(item.max_discount)})` : ''}`
                    : formatRupiah(item.value)}{' '}
                  · Min. {formatRupiah(item.min_spend)}
                </Text>
                <Text style={styles.voucherMeta}>
                  Berlaku sampai {formatDateID(item.expires_at)} · {item.used_count}
                  {item.usage_limit != null ? `/${item.usage_limit}` : ''} dipakai
                </Text>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.miniButton} onPress={() => openVoucherDraft(item)}>
                    <Text style={styles.miniButtonText}>Ubah</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniButton} onPress={() => void toggleVoucher(item)}>
                    <Text style={styles.miniButtonText}>{item.is_active ? 'Nonaktifkan' : 'Aktifkan'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.miniButton, styles.miniButtonDanger]} onPress={() => deleteVoucher(item)}>
                    <Text style={styles.miniButtonDangerText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState icon="pricetag-outline" title="Belum ada voucher" description="Voucher dari seed akan muncul di sini" />
          }
        />
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Status Pesanan</Text>
                <Text style={styles.modalSubtitle}>{selected ? orderCode(selected.id) : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selected?.status === 'cancelled' ? (
                <Text style={styles.lockedNote}>Pesanan ini sudah dibatalkan. Status tidak dapat diubah lagi.</Text>
              ) : null}
              <Text style={styles.fieldLabel}>Status Baru</Text>
              <View style={styles.statusGrid}>
                {STATUS_FLOW.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statusChip, nextStatus === status && styles.statusChipActive, selected?.status === 'cancelled' && styles.statusChipDisabled]}
                    onPress={() => setNextStatus(status)}
                    disabled={selected?.status === 'cancelled'}
                  >
                    <Text style={[styles.statusChipText, nextStatus === status && styles.statusChipTextActive]}>
                      {STATUS_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.statusChip, nextStatus === 'cancelled' && styles.statusChipActiveDanger, selected?.status === 'cancelled' && styles.statusChipDisabled]}
                  onPress={() => setNextStatus('cancelled')}
                  disabled={selected?.status === 'cancelled'}
                >
                  <Text style={[styles.statusChipText, nextStatus === 'cancelled' && styles.statusChipTextActive]}>
                    Dibatalkan
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Nomor Resi (opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: JP1234567890"
                placeholderTextColor={COLORS.muted}
                value={tracking}
                onChangeText={setTracking}
              />

              <Text style={styles.fieldLabel}>Catatan (opsional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Contoh: Paket sudah diserahkan ke kurir"
                placeholderTextColor={COLORS.muted}
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.saveButton, statusLocked && styles.saveButtonDisabled]}
                onPress={() => void updateStatus()}
                disabled={saving || statusLocked}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Simpan Status</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailLink}
                onPress={() => {
                  const id = selected?.id
                  setSelected(null)
                  if (id) nav.navigate('OrderDetail', { id })
                }}
              >
                <Text style={styles.detailLinkText}>Lihat detail lengkap pesanan</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!productDraft} transparent animationType="slide" onRequestClose={() => setProductDraft(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{productDraft?.id ? 'Ubah Produk' : 'Produk Baru'}</Text>
                <Text style={styles.modalSubtitle}>Isi detail produk lalu simpan</Text>
              </View>
              <TouchableOpacity onPress={() => setProductDraft(null)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Nama Produk</Text>
              <TextInput
                style={styles.input}
                placeholder="Contoh: iPhone 15 Pro Max"
                placeholderTextColor={COLORS.muted}
                value={productDraft?.name ?? ''}
                onChangeText={value => setProductDraft(prev => prev ? { ...prev, name: value } : prev)}
              />
              <Text style={styles.fieldLabel}>Slug (kosongkan untuk otomatis)</Text>
              <TextInput
                style={styles.input}
                placeholder="iphone-15-pro-max"
                placeholderTextColor={COLORS.muted}
                value={productDraft?.slug ?? ''}
                onChangeText={value => setProductDraft(prev => prev ? { ...prev, slug: value } : prev)}
                autoCapitalize="none"
              />
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Harga</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.muted}
                    value={productDraft?.price ?? ''}
                    onChangeText={value => setProductDraft(prev => prev ? { ...prev, price: value } : prev)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Stok</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.muted}
                    value={productDraft?.stock ?? ''}
                    onChangeText={value => setProductDraft(prev => prev ? { ...prev, stock: value } : prev)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Slug/Nama Kategori (opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="smartphone"
                placeholderTextColor={COLORS.muted}
                value={productDraft?.categorySlug ?? ''}
                onChangeText={value => setProductDraft(prev => prev ? { ...prev, categorySlug: value } : prev)}
                autoCapitalize="none"
              />
              <Text style={styles.fieldLabel}>URL Gambar (opsional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor={COLORS.muted}
                value={productDraft?.imageUrl ?? ''}
                onChangeText={value => setProductDraft(prev => prev ? { ...prev, imageUrl: value } : prev)}
                autoCapitalize="none"
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={() => void saveProduct()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>Simpan Produk</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!voucherDraft} transparent animationType="slide" onRequestClose={() => setVoucherDraft(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{voucherDraft?.originalCode ? 'Ubah Voucher' : 'Voucher Baru'}</Text>
                <Text style={styles.modalSubtitle}>Diskon dihitung ulang oleh server saat checkout</Text>
              </View>
              <TouchableOpacity onPress={() => setVoucherDraft(null)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.fieldLabel}>Kode Voucher</Text>
              <TextInput
                style={[styles.input, Boolean(voucherDraft?.originalCode) && styles.inputDisabled]}
                placeholder="HEMAT10"
                placeholderTextColor={COLORS.muted}
                value={voucherDraft?.code ?? ''}
                onChangeText={value => setVoucherDraft(prev => prev ? { ...prev, code: value.toUpperCase() } : prev)}
                autoCapitalize="characters"
                editable={!voucherDraft?.originalCode}
              />
              <Text style={styles.fieldLabel}>Deskripsi</Text>
              <TextInput
                style={styles.input}
                placeholder="Diskon 10% semua produk"
                placeholderTextColor={COLORS.muted}
                value={voucherDraft?.description ?? ''}
                onChangeText={value => setVoucherDraft(prev => prev ? { ...prev, description: value } : prev)}
              />
              <Text style={styles.fieldLabel}>Tipe Diskon</Text>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={[styles.miniButton, voucherDraft?.discountType === 'fixed' && styles.miniButtonActive]}
                  onPress={() => setVoucherDraft(prev => prev ? { ...prev, discountType: 'fixed' } : prev)}
                >
                  <Text style={[styles.miniButtonText, voucherDraft?.discountType === 'fixed' && styles.miniButtonTextActive]}>Nominal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniButton, voucherDraft?.discountType === 'percent' && styles.miniButtonActive]}
                  onPress={() => setVoucherDraft(prev => prev ? { ...prev, discountType: 'percent' } : prev)}
                >
                  <Text style={[styles.miniButtonText, voucherDraft?.discountType === 'percent' && styles.miniButtonTextActive]}>Persentase</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Nilai {voucherDraft?.discountType === 'percent' ? '(%)' : '(Rp)'}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.muted}
                    value={voucherDraft?.value ?? ''}
                    onChangeText={value => setVoucherDraft(prev => prev ? { ...prev, value: value } : prev)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Min. Belanja</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.muted}
                    value={voucherDraft?.minSpend ?? ''}
                    onChangeText={value => setVoucherDraft(prev => prev ? { ...prev, minSpend: value } : prev)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Maks. Diskon (opsional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.muted}
                    value={voucherDraft?.maxDiscount ?? ''}
                    onChangeText={value => setVoucherDraft(prev => prev ? { ...prev, maxDiscount: value } : prev)}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.fieldLabel}>Kuota (opsional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tidak terbatas"
                    placeholderTextColor={COLORS.muted}
                    value={voucherDraft?.usageLimit ?? ''}
                    onChangeText={value => setVoucherDraft(prev => prev ? { ...prev, usageLimit: value } : prev)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <Text style={styles.fieldLabel}>Berlaku Sampai</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.muted}
                value={voucherDraft?.expiresAt ?? ''}
                onChangeText={value => setVoucherDraft(prev => prev ? { ...prev, expiresAt: value } : prev)}
                keyboardType="numbers-and-punctuation"
              />
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={() => void saveVoucher()}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}>Simpan Voucher</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={19} color={color} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 46 },
  tabsContent: { paddingHorizontal: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 12 },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 12 },
  list: { padding: 10, paddingBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: 10, ...SHADOW.card },
  statIcon: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  statLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  orderCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, padding: 12, marginBottom: 8, ...SHADOW.card },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  orderCode: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  orderDate: { color: COLORS.textSecondary, fontSize: 10, marginTop: 3 },
  customer: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  totalLabel: { color: COLORS.textSecondary, fontSize: 10 },
  totalValue: { color: COLORS.primary, fontSize: 15, fontWeight: '800' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  voucherCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  voucherIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  voucherBody: { flex: 1 },
  voucherHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  voucherCode: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  voucherStatus: { borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 },
  voucherActive: { backgroundColor: COLORS.successLight },
  voucherInactive: { backgroundColor: COLORS.surfaceAlt },
  voucherStatusText: { color: COLORS.muted, fontSize: 10, fontWeight: '700' },
  voucherActiveText: { color: COLORS.success },
  voucherDesc: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  voucherMeta: { color: COLORS.textSecondary, fontSize: 10, marginTop: 4 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 11,
    marginBottom: 10,
  },
  addButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  miniButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  miniButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  miniButtonText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  miniButtonTextActive: { color: COLORS.primary },
  miniButtonDanger: { borderColor: COLORS.danger },
  miniButtonDangerText: { color: COLORS.danger, fontSize: 10, fontWeight: '700' },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1 },
  inputDisabled: { backgroundColor: COLORS.surfaceAlt, color: COLORS.muted },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: { maxHeight: '85%', backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  modalSubtitle: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  modalScroll: { padding: 16 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 7, marginTop: 12 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  statusChipActiveDanger: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  statusChipDisabled: { opacity: 0.45 },
  statusChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  lockedNote: {
    color: COLORS.danger,
    fontSize: 11,
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.sm,
    padding: 10,
    marginBottom: 4,
  },
  statusChipTextActive: { color: COLORS.primary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 11,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 13,
  },
  inputMultiline: { minHeight: 70 },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  saveButtonDisabled: { backgroundColor: COLORS.border },
  saveButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  detailLink: { alignItems: 'center', paddingVertical: 14 },
  detailLinkText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
})
