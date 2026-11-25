import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '@/contexts/AuthContext'
import { showError, showInfo } from '@/lib/alerts'
import { addressesFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { Address } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>
type IconName = React.ComponentProps<typeof Ionicons>['name']
type MenuRoute = 'Orders' | 'Wishlist' | 'Notifications' | 'Admin'

interface AddressForm {
  label: string
  receiver_name: string
  phone: string
  address: string
  city: string
  postal_code: string
  is_default: boolean
}

const EMPTY_ADDRESS: AddressForm = {
  label: 'Rumah',
  receiver_name: '',
  phone: '',
  address: '',
  city: '',
  postal_code: '',
  is_default: false,
}

export default function ProfileScreen() {
  const nav = useNavigation<Nav>()
  const { user, profile, signOut } = useAuth()
  const insets = useSafeAreaInsets()

  const [stats, setStats] = useState({ orders: 0, wishlist: 0, vouchers: 0 })
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressModal, setAddressModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addressForm, setAddressForm] = useState<AddressForm>(EMPTY_ADDRESS)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    if (!user) return
    const [ordersRes, wishlistRes, voucherRes, addressRes] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('wishlists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('vouchers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('addresses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    setStats({
      orders: ordersRes.error ? 0 : ordersRes.count ?? 0,
      wishlist: wishlistRes.error ? 0 : wishlistRes.count ?? 0,
      vouchers: voucherRes.error ? 0 : voucherRes.count ?? 0,
    })
    if (addressRes.error) showError('Gagal Memuat Alamat', addressRes.error)
    setAddresses(addressesFrom(addressRes.data))
  }, [user])

  useFocusEffect(useCallback(() => { void loadData() }, [loadData]))

  const handleSignOut = () => {
    Alert.alert('Keluar Akun', 'Yakin ingin keluar dari akun ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => {
          void signOut().catch(error => showError('Gagal Keluar', error))
        },
      },
    ])
  }

  const openAddressModal = (address?: Address) => {
    if (address) {
      setEditingId(address.id)
      setAddressForm({
        label: address.label,
        receiver_name: address.receiver_name,
        phone: address.phone,
        address: address.address,
        city: address.city,
        postal_code: address.postal_code,
        is_default: address.is_default,
      })
    } else {
      setEditingId(null)
      setAddressForm({ ...EMPTY_ADDRESS, is_default: addresses.length === 0 })
    }
    setAddressModal(true)
  }

  const saveAddress = async () => {
    if (!user) return
    if (addressForm.receiver_name.trim().length < 2) return showError('Alamat Belum Lengkap', new Error('Nama penerima minimal 2 karakter'))
    if (addressForm.phone.trim().length < 9) return showError('Alamat Belum Lengkap', new Error('Nomor HP tidak valid'))
    if (addressForm.address.trim().length < 10) return showError('Alamat Belum Lengkap', new Error('Alamat terlalu pendek'))
    if (addressForm.city.trim().length < 2) return showError('Alamat Belum Lengkap', new Error('Kota wajib diisi'))

    setSaving(true)
    try {
      if (addressForm.is_default) {
        const { error } = await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
        if (error) throw error
      }

      const payload = {
        user_id: user.id,
        label: addressForm.label.trim() || 'Alamat',
        receiver_name: addressForm.receiver_name.trim(),
        phone: addressForm.phone.trim(),
        address: addressForm.address.trim(),
        city: addressForm.city.trim(),
        postal_code: addressForm.postal_code.trim(),
        is_default: addressForm.is_default,
      }

      if (editingId) {
        const { error } = await supabase.from('addresses').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('addresses').insert(payload)
        if (error) throw error
      }

      showInfo('Alamat Tersimpan', 'Alamat pengiriman berhasil disimpan')
      setAddressModal(false)
      await loadData()
    } catch (error) {
      showError('Gagal Menyimpan Alamat', error)
    } finally {
      setSaving(false)
    }
  }

  const deleteAddress = (address: Address) => {
    Alert.alert('Hapus Alamat', `Hapus alamat "${address.label}"?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('addresses').delete().eq('id', address.id)
          if (error) return showError('Gagal Menghapus Alamat', error)
          await loadData()
        },
      },
    ])
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.guestHeader, { paddingTop: insets.top + 40 }]}>
          <View style={styles.guestLogo}><Ionicons name="flash" size={38} color={COLORS.white} /></View>
          <Text style={styles.guestTitle}>Halo, Selamat Datang!</Text>
          <Text style={styles.guestSub}>Masuk atau daftar untuk menikmati semua fitur ElektroMart</Text>
        </View>
        <View style={styles.guestActions}>
          <TouchableOpacity style={styles.loginButton} onPress={() => nav.navigate('Login')}>
            <Text style={styles.loginButtonText}>Masuk</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerButton} onPress={() => nav.navigate('Register')}>
            <Text style={styles.registerButtonText}>Daftar Akun</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const menus: { icon: IconName; label: string; route?: MenuRoute; action?: () => void; color: string }[] = [
    { icon: 'receipt-outline', label: 'Pesanan Saya', route: 'Orders', color: COLORS.primary },
    { icon: 'heart-outline', label: 'Wishlist Saya', route: 'Wishlist', color: '#ec4899' },
    { icon: 'notifications-outline', label: 'Notifikasi', route: 'Notifications', color: '#0284c7' },
    { icon: 'location-outline', label: 'Alamat Tersimpan', action: () => openAddressModal(), color: '#16a34a' },
  ]
  if (profile?.role === 'admin') {
    menus.push({ icon: 'shield-checkmark-outline', label: 'Panel Admin', route: 'Admin', color: '#8b5cf6' })
  }

  const initial = (profile?.full_name ?? user.email ?? 'P').trim().charAt(0).toUpperCase()

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.userRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.full_name ?? 'Pelanggan ElektroMart'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {profile?.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={10} color={COLORS.primary} />
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => nav.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <StatCard icon="receipt-outline" label="Pesanan" value={stats.orders} />
          <StatCard icon="heart-outline" label="Wishlist" value={stats.wishlist} />
          <StatCard icon="pricetag-outline" label="Voucher" value={stats.vouchers} />
        </View>
      </View>

      <View style={styles.menuSection}>
        {menus.map((menu, index) => (
          <TouchableOpacity
            key={menu.label}
            style={[styles.menuItem, index === menus.length - 1 && styles.menuItemLast]}
            onPress={() => (menu.route ? nav.navigate(menu.route) : menu.action?.())}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${menu.color}18` }]}>
              <Ionicons name={menu.icon} size={19} color={menu.color} />
            </View>
            <Text style={styles.menuLabel}>{menu.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
        <Text style={styles.logoutText}>Keluar dari Akun</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ElektroMart · Versi 1.0.0</Text>

      <Modal visible={addressModal} animationType="slide" transparent onRequestClose={() => setAddressModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Alamat' : 'Alamat Baru'}</Text>
              <TouchableOpacity onPress={() => setAddressModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {addresses.length > 0 && (
                <View style={styles.addressList}>
                  {addresses.map(address => (
                    <View key={address.id} style={styles.addressItem}>
                      <View style={styles.addressInfo}>
                        <Text style={styles.addressLabel}>{address.label}{address.is_default ? ' · Utama' : ''}</Text>
                        <Text style={styles.addressDetail} numberOfLines={2}>
                          {address.receiver_name}, {address.address}, {address.city}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => openAddressModal(address)}>
                        <Text style={styles.addressAction}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteAddress(address)}>
                        <Text style={[styles.addressAction, styles.addressDelete]}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.newAddressButton} onPress={() => openAddressModal()}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.newAddressText}>Tambah Alamat Baru</Text>
              </TouchableOpacity>

              {([
                { key: 'label', label: 'Label Alamat', placeholder: 'Rumah / Kantor' },
                { key: 'receiver_name', label: 'Nama Penerima', placeholder: 'Nama lengkap' },
                { key: 'phone', label: 'Nomor HP', placeholder: '081234567890' },
                { key: 'address', label: 'Alamat Lengkap', placeholder: 'Jl. Contoh No. 12' },
                { key: 'city', label: 'Kota', placeholder: 'Jakarta Selatan' },
                { key: 'postal_code', label: 'Kode Pos', placeholder: '12345' },
              ] as { key: keyof AddressForm; label: string; placeholder: string }[]).map(field => (
                <View key={field.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={addressForm[field.key] as string}
                    onChangeText={value => setAddressForm(previous => ({ ...previous, [field.key]: value }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.muted}
                    keyboardType={field.key === 'phone' || field.key === 'postal_code' ? 'number-pad' : 'default'}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setAddressForm(previous => ({ ...previous, is_default: !previous.is_default }))}
              >
                <Ionicons
                  name={addressForm.is_default ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={addressForm.is_default ? COLORS.primary : COLORS.textSecondary}
                />
                <Text style={styles.checkText}>Jadikan alamat utama</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={() => void saveAddress()} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveText}>Simpan Alamat</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

function StatCard({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={COLORS.white} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  guestHeader: { backgroundColor: COLORS.primary, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  guestLogo: {
    width: 78,
    height: 78,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  guestSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  guestActions: { padding: 24, gap: 12 },
  loginButton: { backgroundColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 14, alignItems: 'center' },
  loginButtonText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  registerButton: { borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.sm, paddingVertical: 13, alignItems: 'center' },
  registerButtonText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  header: { backgroundColor: COLORS.primary, paddingBottom: 18 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarText: { color: COLORS.primary, fontSize: 24, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  userEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 3 },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 5,
  },
  adminText: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  settingsButton: { padding: 6 },
  stats: { flexDirection: 'row', marginHorizontal: 12, marginTop: 18, gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginTop: 4 },
  statLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 11 },
  menuSection: { backgroundColor: COLORS.surface, marginTop: 8, ...SHADOW.card },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    marginTop: 8,
    paddingVertical: 15,
  },
  logoutText: { color: COLORS.danger, fontSize: 13, fontWeight: '700' },
  version: { color: COLORS.muted, fontSize: 11, textAlign: 'center', paddingVertical: 16 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: { maxHeight: '88%', backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  modalScroll: { padding: 16 },
  addressList: { marginBottom: 12 },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  addressInfo: { flex: 1 },
  addressLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  addressDetail: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  addressAction: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  addressDelete: { color: COLORS.danger },
  newAddressButton: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  newAddressText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  field: { marginBottom: 10 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
    color: COLORS.text,
    fontSize: 13,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 6 },
  checkText: { color: COLORS.textSecondary, fontSize: 12 },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  saveText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
})
