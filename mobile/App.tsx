import 'react-native-gesture-handler'
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StyleSheet, Text, View } from 'react-native'

import { AuthProvider } from './src/contexts/AuthContext'
import { CartProvider } from './src/contexts/CartContext'
import { supabaseEnvReady } from './src/lib/supabase'
import AppNavigator from './src/navigation/AppNavigator'
import { COLORS } from './src/theme'

export default function App() {
  return (
    <SafeAreaProvider>
      {!supabaseEnvReady ? (
        <View style={styles.envWarning}>
          <Text style={styles.envText}>
            Konfigurasi Supabase belum ada. Isi mobile/.env lalu restart Expo.
          </Text>
        </View>
      ) : null}
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" backgroundColor={COLORS.primary} />
          <AppNavigator />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  envWarning: {
    padding: 8,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  envText: { color: COLORS.white, fontSize: 11, fontWeight: '700', textAlign: 'center' },
})
