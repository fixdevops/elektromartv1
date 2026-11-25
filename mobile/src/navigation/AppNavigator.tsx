import React from 'react'
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { Ionicons } from '@expo/vector-icons'

import AdminScreen from '@/screens/AdminScreen'
import CartScreen from '@/screens/CartScreen'
import CheckoutScreen from '@/screens/CheckoutScreen'
import HomeScreen from '@/screens/HomeScreen'
import LoginScreen from '@/screens/LoginScreen'
import NotificationsScreen from '@/screens/NotificationsScreen'
import OrderDetailScreen from '@/screens/OrderDetailScreen'
import OrdersScreen from '@/screens/OrdersScreen'
import ProductDetailScreen from '@/screens/ProductDetailScreen'
import ProductsScreen from '@/screens/ProductsScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import RegisterScreen from '@/screens/RegisterScreen'
import SearchScreen from '@/screens/SearchScreen'
import WishlistScreen from '@/screens/WishlistScreen'
import { useCart } from '@/contexts/CartContext'
import { COLORS } from '@/theme'

export type TabParamList = {
  Beranda: undefined
  Produk: { q?: string; category?: string; promo?: 'flash' | 'gratis-ongkir' } | undefined
  Keranjang: undefined
  Akun: undefined
}

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined
  ProductDetail: { slug: string }
  Checkout: undefined
  Login: undefined
  Register: undefined
  Orders: undefined
  OrderDetail: { id: string }
  Wishlist: undefined
  Notifications: undefined
  Admin: undefined
  Search: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()
const Stack = createStackNavigator<RootStackParamList>()

type IconName = React.ComponentProps<typeof Ionicons>['name']

function TabNavigator() {
  const { totalItems } = useCart()

  const icons: Record<keyof TabParamList, { active: IconName; inactive: IconName; label: string }> = {
    Beranda: { active: 'home', inactive: 'home-outline', label: 'Beranda' },
    Produk: { active: 'grid', inactive: 'grid-outline', label: 'Produk' },
    Keranjang: { active: 'cart', inactive: 'cart-outline', label: 'Keranjang' },
    Akun: { active: 'person', inactive: 'person-outline', label: 'Akun' },
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabel: icons[route.name].label,
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? icons[route.name].active : icons[route.name].inactive}
            size={size}
            color={color}
          />
        ),
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
      })}
    >
      <Tab.Screen name="Beranda" component={HomeScreen} />
      <Tab.Screen name="Produk" component={ProductsScreen} />
      <Tab.Screen
        name="Keranjang"
        component={CartScreen}
        options={{
          tabBarBadge: totalItems() > 0 ? totalItems() : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.primary,
            color: COLORS.white,
            fontSize: 10,
          },
        }}
      />
      <Tab.Screen name="Akun" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.white,
          headerTitleStyle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
          headerBackTitleVisible: false,
          cardStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Detail Produk' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Masuk' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Daftar Akun' }} />
        <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Pesanan Saya' }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Detail Pesanan' }} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ title: 'Wishlist Saya' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifikasi' }} />
        <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Panel Admin' }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Cari Produk' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
