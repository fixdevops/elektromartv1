import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { COLORS } from '@/theme'

interface Props {
  title: string
  subtitle?: string
  actionLabel?: string
  onPressAction?: () => void
}

export default function SectionHeader({ title, subtitle, actionLabel, onPressAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onPressAction ? (
        <TouchableOpacity onPress={onPressAction} hitSlop={6} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  textWrap: { flex: 1, marginRight: 8 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center' },
  actionText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
})
