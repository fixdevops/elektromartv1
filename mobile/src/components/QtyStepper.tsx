import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { COLORS, RADIUS } from '@/theme'

interface Props {
  value: number
  max: number
  onChange: (value: number) => void
  compact?: boolean
}

export default function QtyStepper({ value, max, onChange, compact = false }: Props) {
  const atMin = value <= 1
  const atMax = value >= Math.max(1, max)

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <TouchableOpacity
        style={[styles.button, atMin && styles.buttonDisabled]}
        onPress={() => onChange(value - 1)}
        disabled={atMin}
        hitSlop={4}
      >
        <Ionicons name="remove" size={compact ? 13 : 16} color={atMin ? COLORS.muted : COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.value}>{value}</Text>
      <TouchableOpacity
        style={[styles.button, atMax && styles.buttonDisabled]}
        onPress={() => onChange(value + 1)}
        disabled={atMax}
        hitSlop={4}
      >
        <Ionicons name="add" size={compact ? 13 : 16} color={atMax ? COLORS.muted : COLORS.primary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  compact: {},
  button: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  buttonDisabled: { backgroundColor: COLORS.surface },
  value: {
    minWidth: 30,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
})
