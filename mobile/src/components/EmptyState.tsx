import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { COLORS, RADIUS } from '@/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

interface Props {
  icon: IconName
  title: string
  description?: string
  actionLabel?: string
  onPressAction?: () => void
}

export default function EmptyState({ icon, title, description, actionLabel, onPressAction }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={54} color={COLORS.muted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onPressAction ? (
        <TouchableOpacity style={styles.button} onPress={onPressAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: COLORS.background,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  description: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  button: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
})
