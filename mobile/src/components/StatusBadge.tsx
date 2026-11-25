import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { STATUS_COLORS, STATUS_LABELS } from '@/lib/commerce'
import { COLORS, RADIUS, withAlpha } from '@/theme'
import type { OrderStatus } from '@/types/database'

interface Props {
  status: OrderStatus
  small?: boolean
}

export default function StatusBadge({ status, small = false }: Props) {
  const color = STATUS_COLORS[status] ?? COLORS.muted
  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.12) }, small && styles.small]}>
      <Text style={[styles.text, { color }, small && styles.smallText]}>{STATUS_LABELS[status]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  small: { paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700' },
  smallText: { fontSize: 10 },
})
