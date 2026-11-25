import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { showError, showInfo } from '@/lib/alerts'
import { formatRupiah, getErrorMessage } from '@/lib/commerce'
import { COLORS, RADIUS } from '@/theme'
import { useCart } from '@/contexts/CartContext'

export default function VoucherField() {
  const { voucher, voucherCode, applyVoucher, clearVoucher, selectedTotal, discountAmount } = useCart()
  const [code, setCode] = useState(voucherCode)
  const [loading, setLoading] = useState(false)

  useEffect(() => setCode(voucherCode), [voucherCode])

  const handleApply = async () => {
    setLoading(true)
    try {
      await applyVoucher(code)
      showInfo('Voucher Dipakai', 'Voucher berhasil diterapkan pada pesanan kamu')
    } catch (error) {
      showError('Voucher Tidak Valid', getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <View style={styles.inputRow}>
        <Ionicons name="pricetag-outline" size={17} color={COLORS.primary} style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Masukkan kode voucher"
          placeholderTextColor={COLORS.muted}
          value={code}
          onChangeText={value => setCode(value.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!voucher && !loading}
        />
        {voucher ? (
          <TouchableOpacity style={styles.removeButton} onPress={() => void clearVoucher()}>
            <Text style={styles.removeText}>Hapus</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => void handleApply()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.applyText}>Pakai</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {voucher ? (
        <View style={styles.appliedCard}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <View style={styles.appliedText}>
            <Text style={styles.appliedCode}>{voucher.code}</Text>
            <Text style={styles.appliedDesc} numberOfLines={2}>{voucher.description}</Text>
          </View>
          <Text style={styles.discount}>-{formatRupiah(discountAmount())}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          Min. belanja {formatRupiah(100000)} • Subtotal saat ini {formatRupiah(selectedTotal())}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    backgroundColor: COLORS.surface,
  },
  icon: { marginRight: 6 },
  input: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 10 },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  applyText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  removeButton: { paddingHorizontal: 8, paddingVertical: 8 },
  removeText: { color: COLORS.danger, fontSize: 12, fontWeight: '700' },
  hint: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6 },
  appliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.successLight,
  },
  appliedText: { flex: 1 },
  appliedCode: { color: COLORS.success, fontSize: 12, fontWeight: '800' },
  appliedDesc: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  discount: { color: COLORS.success, fontSize: 12, fontWeight: '800' },
})
