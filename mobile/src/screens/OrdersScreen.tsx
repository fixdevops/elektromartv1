import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import { showError } from '@/lib/alerts'
import { formatDateID, formatRupiah, orderCode } from '@/lib/commerce'
import { asRows, normalizeProduct, orderItemsFrom, ordersFrom, statusEventsFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { Order, OrderItem, OrderStatus, OrderStatusEvent } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>
type TabKey = 'all' | OrderStatus

const TABS: { id: TabKey; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'pending', label: 'Menunggu' },
  { id: 'paid', label: 'Dibayar' },
  { id: 'processing', label: 'Diproses' },
  { id: 'shipped', label: 'Dikirim' },
  { id: 'delivered', label: 'Selesai' },
  { id: 'cancelled', label: 'Dibatalkan' },
]

export default function OrdersScreen() {
  const nav = useNavigation<Nav>()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [loading, setLoading] = useState(true)

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      showError('Gagal Memuat Pesanan', error)
      setLoading(false)
      return
    }

    let rows = ordersFrom(data)
    if (rows.length > 0) {
      const ids = rows.map(order => order.id)
      const [itemsResult, historyResult] = await Promise.all([
        supabase.from('order_items').select('*, product:products(*)').in('order_id', ids),
        supabase.from('order_status_history').select('*').in('order_id', ids).order('created_at', { ascending: true }),
      ])

      const itemsByOrder = new Map<string, OrderItem[]>()
      if (!itemsResult.error) {
        orderItemsFrom(itemsResult.data).forEach(item => {
          const productRow = asRows(itemsResult.data).find(row => row.id === item.id)?.product
          const enriched = { ...item, product: item.product ?? (productRow ? normalizeProduct(productRow) : undefined) }
          itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), enriched])
        })
      }

      const historyByOrder = new Map<string, OrderStatusEvent[]>()
      if (!historyResult.error) {
        statusEventsFrom(historyResult.data).forEach(event => {
          historyByOrder.set(event.order_id, [...(historyByOrder.get(event.order_id) ?? []), event])
        })
      }

      rows = rows.map(order => ({
        ...order,
        order_items: itemsByOrder.get(order.id) ?? [],
        order_status_history: historyByOrder.get(order.id) ?? [],
      }))
    }

    setOrders(rows)
    setLoading(false)
  }, [user])

  useFocusEffect(useCallback(() => { void loadOrders() }, [loadOrders]))

  const filtered = activeTab === 'all' ? orders : orders.filter(order => order.status === activeTab)

  if (!user) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="person-outline"
          title="Masuk untuk melihat pesanan"
          description="Riwayat pesanan kamu akan muncul di sini setelah masuk"
          actionLabel="Masuk"
          onPressAction={() => nav.navigate('Login')}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar} contentContainerStyle={styles.tabsContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat pesanan...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="Belum ada pesanan"
          description="Pesanan yang kamu buat akan muncul di sini"
          actionLabel="Mulai Belanja"
          onPressAction={() => nav.navigate('Tabs', { screen: 'Produk' })}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const firstItem = item.order_items?.[0]
            const itemCount = item.order_items?.length ?? 0
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.storeRow}>
                    <Ionicons name="storefront-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.storeName}>ElektroMart</Text>
                    <Text style={styles.orderCode}>{orderCode(item.id)}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <TouchableOpacity
                  style={styles.cardBody}
                  onPress={() => nav.navigate('OrderDetail', { id: item.id })}
                >
                  <View style={styles.summaryRow}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>{formatDateID(item.created_at, true)}</Text>
                  </View>
                  {firstItem ? (
                    <Text style={styles.itemPreview} numberOfLines={2}>
                      {firstItem.product?.name ?? 'Produk'} {itemCount > 1 ? `+${itemCount - 1} produk` : ''}
                    </Text>
                  ) : null}
                  {item.tracking_number ? (
                    <View style={styles.summaryRow}>
                      <Ionicons name="bus-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.infoText}>Resi: {item.tracking_number}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.footerLabel}>Total Pembayaran</Text>
                    <Text style={styles.footerTotal}>{formatRupiah(item.total_amount)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => nav.navigate('OrderDetail', { id: item.id })}
                  >
                    <Text style={styles.detailButtonText}>
                      {item.status === 'pending' ? 'Bayar / Detail' : 'Detail'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabsBar: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 46 },
  tabsContent: { paddingHorizontal: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontSize: 12 },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 12 },
  list: { padding: 10, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    marginBottom: 10,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  storeName: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  orderCode: { color: COLORS.muted, fontSize: 10 },
  cardBody: { padding: 12, gap: 7 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { color: COLORS.textSecondary, fontSize: 11 },
  itemPreview: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  footerLabel: { color: COLORS.textSecondary, fontSize: 10 },
  footerTotal: { color: COLORS.primary, fontSize: 15, fontWeight: '800' },
  detailButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  detailButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
})
