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

export default function RegisterScreen() {
  const nav = useNavigation<Nav>()
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    const cleanName = fullName.trim()
    const cleanEmail = email.trim()

    if (!cleanName || !cleanEmail || !password) {
      return showError('Data Belum Lengkap', new Error('Nama, email, dan password wajib diisi'))
    }
    if (cleanName.length < 2) {
      return showError('Nama Tidak Valid', new Error('Nama lengkap minimal 2 karakter'))
    }
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      return showError('Email Tidak Valid', new Error('Masukkan alamat email yang valid'))
    }
    if (password.length < 6) {
      return showError('Password Terlalu Pendek', new Error('Password minimal 6 karakter'))
    }

    setLoading(true)
    try {
      const session = await signUp(cleanEmail, password, cleanName)
      if (session) {
        showInfo('Akun Berhasil Dibuat', 'Akunmu langsung aktif. Selamat belanja!')
        nav.navigate('Tabs', { screen: 'Akun' })
      } else {
        showInfo('Akun Berhasil Dibuat', 'Silakan cek email untuk konfirmasi, lalu masuk ke akunmu')
        nav.navigate('Login')
      }
    } catch (error) {
      showError('Gagal Membuat Akun', getErrorMessage(error))
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
            <Ionicons name="flash" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.brandName}>Daftar Akun</Text>
          <Text style={styles.brandTagline}>Buat akun dan mulai belanja elektronik terbaik</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={17} color={COLORS.muted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nama sesuai identitas"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          </View>

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
            <Text style={styles.hint}>Gunakan minimal 6 karakter untuk keamanan akunmu</Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => void handleRegister()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Buat Akun</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => nav.navigate('Login')}>
            <Text style={styles.loginText}>
              Sudah punya akun? <Text style={styles.loginHighlight}>Masuk</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 20, paddingTop: 30 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...SHADOW.raised,
  },
  brandName: { color: COLORS.primary, fontSize: 23, fontWeight: '800' },
  brandTagline: { color: COLORS.textSecondary, fontSize: 12, marginTop: 5, textAlign: 'center' },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 18,
    ...SHADOW.card,
  },
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
  input: { flex: 1, color: COLORS.text, fontSize: 14, paddingHorizontal: 10, paddingVertical: 12 },
  passwordInput: { paddingRight: 44 },
  eyeButton: { position: 'absolute', right: 12, padding: 4 },
  hint: { color: COLORS.muted, fontSize: 10, marginTop: 5 },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  loginLink: { alignItems: 'center', paddingTop: 18 },
  loginText: { color: COLORS.textSecondary, fontSize: 13 },
  loginHighlight: { color: COLORS.primary, fontWeight: '800' },
})
