import React, { useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'

import { useAuth } from '@/contexts/AuthContext'
import { showError, showInfo } from '@/lib/alerts'
import { getErrorMessage } from '@/lib/commerce'
import type { RootStackParamList } from '@/navigation/AppNavigator'
import { COLORS, RADIUS, SHADOW } from '@/theme'

type Nav = StackNavigationProp<RootStackParamList>

export default function LoginScreen() {
  const nav = useNavigation<Nav>()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    const cleanEmail = email.trim()
    if (!cleanEmail || !password) {
      return showError('Data Belum Lengkap', new Error('Email dan password wajib diisi'))
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return showError('Email Tidak Valid', new Error('Masukkan alamat email yang valid'))
    }

    setLoading(true)
    try {
      await signIn(cleanEmail, password)
      showInfo('Selamat Datang', 'Kamu berhasil masuk ke ElektroMart')
    } catch (error) {
      const message = getErrorMessage(error)
      showError(
        'Gagal Masuk',
        new Error(
          /invalid login credentials/i.test(message)
            ? 'Email atau password salah. Periksa kembali dan coba lagi.'
            : message,
        ),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Ionicons name="flash" size={34} color={COLORS.white} />
          </View>
          <Text style={styles.brandName}>ElektroMart</Text>
          <Text style={styles.brandTagline}>Belanja elektronik jadi lebih mudah</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Masuk ke Akunmu</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={17} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@contoh.com"
                placeholderTextColor={COLORS.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={17} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimal 6 karakter"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPass}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPass(value => !value)}
                hitSlop={8}
              >
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => void handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Masuk</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerLink} onPress={() => nav.navigate('Register')}>
            <Text style={styles.registerText}>
              Belum punya akun? <Text style={styles.registerHighlight}>Daftar Sekarang</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Dengan masuk, kamu menyetujui Syarat & Ketentuan ElektroMart</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 36 },
  brand: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOW.raised,
  },
  brandName: { color: COLORS.primary, fontSize: 25, fontWeight: '800' },
  brandTagline: { color: COLORS.textSecondary, fontSize: 12, marginTop: 5 },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    ...SHADOW.card,
  },
  formTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginBottom: 18 },
  field: { marginBottom: 16 },
  label: { color: COLORS.text, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
  },
  inputIcon: { marginLeft: 12 },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  passwordInput: { paddingRight: 44 },
  eyeButton: { position: 'absolute', right: 12, padding: 4 },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.muted, fontSize: 11 },
  registerLink: { alignItems: 'center' },
  registerText: { color: COLORS.textSecondary, fontSize: 13 },
  registerHighlight: { color: COLORS.primary, fontWeight: '800' },
  footer: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
})
