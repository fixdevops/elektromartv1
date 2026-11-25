import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { COLORS, SPACING } from '@/theme'

interface Props {
  title: string
  subtitle?: string
  right?: React.ReactNode
  onBack?: () => void
}

export default function ScreenHeader({ title, subtitle, right, onBack }: Props) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
        )}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  backButton: { marginRight: SPACING.sm },
  titleWrap: { flex: 1 },
  title: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 2 },
})
