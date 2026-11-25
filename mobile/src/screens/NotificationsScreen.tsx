import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { showError } from '@/lib/alerts'
import { formatDateID } from '@/lib/commerce'
import { notificationsFrom } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'
import type { AppNotification } from '@/types/database'

type Nav = StackNavigationProp<RootStackParamList>
type IconName = React.ComponentProps<typeof Ionicons>['name']

export default function NotificationsScreen() {
  const nav = useNavigation<Nav>()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (silent = false) => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error && !silent) showError('Gagal Memuat Notifikasi', error)
    setNotifications(notificationsFrom(data))
    if (!silent) setLoading(false)
  }, [user])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => { void load(true) },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user, load])

  const unreadCount = notifications.filter(item => !item.is_read).length

  const markRead = async (id: string, shouldNavigate = true, item?: AppNotification) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    if (error) return showError('Gagal Menandai Notifikasi', error)
    setNotifications(previous => previous.map(entry => (entry.id === id ? { ...entry, is_read: true } : entry)))
    if (shouldNavigate && item) {
      const orderId = typeof item.data?.order_id === 'string' ? item.data.order_id : null
      if (orderId) nav.navigate('OrderDetail', { id: orderId })
      else nav.navigate('Orders')
    }
  }

  const removeNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) return showError('Gagal Menghapus Notifikasi', error)
    setNotifications(previous => previous.filter(entry => entry.id !== id))
  }

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return
    const ids = notifications.filter(item => !item.is_read).map(item => item.id)
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .in('id', ids)
    if (error) return showError('Gagal Menandai Notifikasi', error)
    setNotifications(previous => previous.map(item => ({ ...item, is_read: true })))
    Alert.alert('Berhasil', `${ids.length} notifikasi ditandai sudah dibaca`)
  }

  const iconFor = (type: string): IconName => {
    if (type.includes('order')) return 'receipt-outline'
    if (type.includes('promo')) return 'pricetag-outline'
    return 'notifications-outline'
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="notifications-outline"
          title="Masuk untuk melihat notifikasi"
          description="Info pesanan dan promo akan muncul di sini"
          actionLabel="Masuk"
          onPressAction={() => nav.navigate('Login')}
        />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBar} onPress={() => void markAllRead()}>
          <Ionicons name="checkmark-done-outline" size={16} color={COLORS.primary} />
          <Text style={styles.markAllText}>Tandai semua dibaca ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat notifikasi...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Belum ada notifikasi"
          description="Notifikasi pesanan dan promo akan muncul di sini"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.is_read && styles.cardUnread]}
              onPress={() => void markRead(item.id, true, item)}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={iconFor(item.type)} size={20} color={item.is_read ? COLORS.textSecondary : COLORS.primary} />
              </View>
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  {!item.is_read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.message}>{item.body}</Text>
                <Text style={styles.date}>{formatDateID(item.created_at, true)}</Text>
              </View>
              <TouchableOpacity
                style={styles.readButton}
                onPress={event => {
                  event.stopPropagation()
                  void markRead(item.id, false)
                }}
              >
                <Text style={styles.readButtonText}>{item.is_read ? 'Dibaca' : 'Tandai'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={event => {
                  event.stopPropagation()
                  void removeNotification(item.id)
                }}
              >
                <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  markAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    backgroundColor: COLORS.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primaryBorder,
  },
  markAllText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textSecondary, fontSize: 12 },
  list: { padding: 10, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 8,
    ...SHADOW.card,
  },
  cardUnread: { backgroundColor: COLORS.primaryLight },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '700' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },
  message: { color: COLORS.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  date: { color: COLORS.muted, fontSize: 10, marginTop: 6 },
  readButton: { paddingHorizontal: 4, paddingVertical: 6 },
  readButtonText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  deleteButton: { paddingHorizontal: 4, paddingVertical: 6 },
})
