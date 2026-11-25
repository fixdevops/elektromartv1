import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { showError } from '@/lib/alerts'
import { computeVoucherDiscount } from '@/lib/commerce'
import { asRows, normalizeProduct, normalizeVoucher } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { CartItem, Product, Voucher } from '@/types/database'
import { useAuth } from './AuthContext'

interface StoredCart {
  items: CartItem[]
  selectedIds: string[]
  mergedUserId: string | null
}

interface CartContextType {
  items: CartItem[]
  selectedIds: string[]
  isLoading: boolean
  voucher: Voucher | null
  voucherCode: string
  addItem: (product: Product, qty?: number, variant?: string) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  updateQuantity: (productId: string, qty: number) => Promise<void>
  clearCart: () => Promise<void>
  clearItems: (ids: string[]) => Promise<void>
  loadCart: (userId?: string) => Promise<void>
  mergeGuestCart: (userId: string) => Promise<void>
  toggleSelect: (id: string) => void
  selectAll: (value: boolean) => void
  buyNow: (product: Product, qty?: number, variant?: string) => void
  cancelBuyNow: () => void
  consumeCheckoutItems: () => Promise<void>
  applyVoucher: (code: string) => Promise<void>
  clearVoucher: () => Promise<void>
  totalItems: () => number
  totalPrice: () => number
  selectedItems: () => CartItem[]
  selectedCount: () => number
  selectedTotal: () => number
  discountAmount: () => number
}

const CartContext = createContext<CartContextType>({} as CartContextType)
const CART_KEY = 'em_cart'
const VOUCHER_KEY = 'em_voucher'

const EMPTY_CART: StoredCart = { items: [], selectedIds: [], mergedUserId: null }

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Partial<CartItem>
  return typeof row.product_id === 'string' && typeof row.quantity === 'number' && !!row.product
}

function syncSelection(items: CartItem[], selected: string[]): string[] {
  const valid = items.map(item => item.product_id)
  const kept = selected.filter(id => valid.includes(id))
  return kept.length > 0 ? kept : valid
}

async function readLocalCart(): Promise<StoredCart> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY)
    if (!raw) return EMPTY_CART
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const items = parsed.filter(isCartItem)
      return { items, selectedIds: items.map(i => i.product_id), mergedUserId: null }
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const stored = parsed as Partial<StoredCart>
      const items = Array.isArray(stored.items) ? stored.items.filter(isCartItem) : []
      const selectedIds = Array.isArray(stored.selectedIds)
        ? stored.selectedIds.filter((id): id is string => typeof id === 'string')
        : []
      return {
        items,
        selectedIds,
        mergedUserId: typeof stored.mergedUserId === 'string' ? stored.mergedUserId : null,
      }
    }
  } catch {
    // Data lokal rusak: mulai dari keranjang kosong.
  }
  return EMPTY_CART
}

async function saveLocalCart(cart: StoredCart): Promise<void> {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [voucherCode, setVoucherCode] = useState('')

  // Ref dipakai agar fungsi async tidak membaca state lama setelah await.
  const mergedUserIdRef = useRef<string | null>(null)
  const buyNowBackupRef = useRef<CartItem[] | null>(null)

  const persist = async (nextItems: CartItem[], nextSelected: string[]) => {
    await saveLocalCart({
      items: nextItems,
      selectedIds: nextSelected,
      mergedUserId: mergedUserIdRef.current,
    })
  }

  const totalItems = () => items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const selectedItems = () => items.filter(item => selectedIds.includes(item.product_id))
  const selectedCount = () => selectedItems().reduce((sum, item) => sum + item.quantity, 0)
  const selectedTotal = () => selectedItems().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const discountAmount = () => computeVoucherDiscount(voucher, selectedTotal())

  const fetchDbCart = async (userId: string) => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('cart_items')
      .select('product_id, quantity, product:products(*)')
      .eq('user_id', userId)

    if (error) {
      showError('Gagal Memuat Keranjang', error)
      const local = await readLocalCart()
      const nextSelected = syncSelection(local.items, local.selectedIds)
      setItems(local.items)
      setSelectedIds(nextSelected)
      setIsLoading(false)
      return
    }

    const mapped: CartItem[] = asRows(data).flatMap(row => {
      const product = normalizeProduct(row.product)
      const productId = typeof row.product_id === 'string' ? row.product_id : product.id
      if (!product.id || !productId) return []
      const quantity = Math.max(1, Math.round(Number(row.quantity ?? 1)))
      return [{ product_id: productId, quantity, product }]
    })

    const nextSelected = syncSelection(mapped, selectedIds)
    mergedUserIdRef.current = userId
    setItems(mapped)
    setSelectedIds(nextSelected)
    setIsLoading(false)
    await persist(mapped, nextSelected)
  }

  const mergeGuestCartInternal = async (userId: string, guestItems: CartItem[]) => {
    setIsLoading(true)
    for (const item of guestItems) {
      const { data: existing, error: lookupError } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', userId)
        .eq('product_id', item.product_id)
        .maybeSingle()

      if (lookupError) showError('Gagal Menggabungkan Keranjang', lookupError)

      const current = existing && typeof existing.quantity === 'number' ? existing.quantity : 0
      const nextQuantity = Math.min(current + item.quantity, Math.max(1, item.product.stock))
      const { error } = await supabase.from('cart_items').upsert(
        { user_id: userId, product_id: item.product_id, quantity: nextQuantity },
        { onConflict: 'user_id,product_id' },
      )
      if (error) {
        showError('Gagal Menggabungkan Keranjang', error)
        setIsLoading(false)
        return
      }
    }
    mergedUserIdRef.current = userId
    await fetchDbCart(userId)
  }

  const loadCart = async (userId?: string) => {
    const uid = userId ?? user?.id ?? null
    const local = await readLocalCart()

    if (!uid) {
      mergedUserIdRef.current = null
      buyNowBackupRef.current = null
      const nextSelected = syncSelection(local.items, local.selectedIds)
      setItems(local.items)
      setSelectedIds(nextSelected)
      setIsLoading(false)
      await persist(local.items, nextSelected)
      return
    }

    if (mergedUserIdRef.current !== uid && local.items.length > 0) {
      await mergeGuestCartInternal(uid, local.items)
      return
    }

    await fetchDbCart(uid)
  }

  const mergeGuestCart = async (userId: string) => {
    const local = await readLocalCart()
    await mergeGuestCartInternal(userId, local.items)
  }

  useEffect(() => {
    void loadCart(user?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(VOUCHER_KEY)
        if (!raw) return
        const found = normalizeVoucher(JSON.parse(raw) as unknown)
        setVoucher(found)
        setVoucherCode(found.code)
      } catch {
        await AsyncStorage.removeItem(VOUCHER_KEY)
      }
    })()
  }, [])

  const addItem = async (product: Product, qty = 1, variant?: string) => {
    if (product.stock <= 0) {
      showError('Stok Habis', new Error('Produk ini sedang tidak tersedia.'))
      return
    }

    const add = Math.max(1, Math.round(qty))
    const existing = items.find(item => item.product_id === product.id && item.variant === variant)
    const quantity = Math.min((existing?.quantity ?? 0) + add, product.stock)
    const nextItems = existing
      ? items.map(item => (item === existing ? { ...item, quantity } : item))
      : [...items, { product_id: product.id, quantity, product, variant }]

    if (user) {
      const { error } = await supabase.from('cart_items').upsert(
        { user_id: user.id, product_id: product.id, quantity },
        { onConflict: 'user_id,product_id' },
      )
      if (error) {
        showError('Gagal Menambah Keranjang', error)
        return
      }
    }

    buyNowBackupRef.current = null
    const nextSelected = syncSelection(nextItems, selectedIds)
    setItems(nextItems)
    setSelectedIds(nextSelected)
    await persist(nextItems, nextSelected)
  }

  const removeItem = async (productId: string) => {
    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
      if (error) {
        showError('Gagal Menghapus Item', error)
        return
      }
    }

    const nextItems = items.filter(item => item.product_id !== productId)
    const nextSelected = selectedIds.filter(id => id !== productId)
    setItems(nextItems)
    setSelectedIds(nextSelected)
    await persist(nextItems, nextSelected)
  }

  const updateQuantity = async (productId: string, qty: number) => {
    const item = items.find(entry => entry.product_id === productId)
    if (!item) return
    if (qty <= 0) {
      await removeItem(productId)
      return
    }

    const next = Math.max(1, Math.min(Math.round(qty), Math.max(1, item.product.stock)))
    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: next })
        .eq('user_id', user.id)
        .eq('product_id', productId)
      if (error) {
        showError('Gagal Memperbarui Jumlah', error)
        return
      }
    }

    const nextItems = items.map(entry => (entry.product_id === productId ? { ...entry, quantity: next } : entry))
    setItems(nextItems)
    await persist(nextItems, selectedIds)
  }

  const clearCart = async () => {
    if (user) {
      const { error } = await supabase.from('cart_items').delete().eq('user_id', user.id)
      if (error) {
        showError('Gagal Mengosongkan Keranjang', error)
        return
      }
    }
    buyNowBackupRef.current = null
    setItems([])
    setSelectedIds([])
    await persist([], [])
  }

  const clearItems = async (ids: string[]) => {
    if (ids.length === 0) return
    if (user) {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id)
        .in('product_id', ids)
      if (error) {
        showError('Gagal Menghapus Item', error)
        return
      }
    }

    const nextItems = items.filter(item => !ids.includes(item.product_id))
    const nextSelected = selectedIds.filter(id => !ids.includes(id))
    setItems(nextItems)
    setSelectedIds(nextSelected)
    await persist(nextItems, nextSelected)
  }

  const toggleSelect = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]
    setSelectedIds(next)
    void persist(items, next)
  }

  const selectAll = (value: boolean) => {
    const next = value ? items.map(item => item.product_id) : []
    setSelectedIds(next)
    void persist(items, next)
  }

  /** buyNow hanya mengganti keranjang lokal; database tidak diubah. */
  const buyNow = (product: Product, qty = 1, variant?: string) => {
    if (product.stock <= 0) {
      showError('Stok Habis', new Error('Produk ini sedang tidak tersedia.'))
      return
    }
    const quantity = Math.max(1, Math.min(Math.round(qty), product.stock))
    if (!buyNowBackupRef.current) buyNowBackupRef.current = items
    const nextItems: CartItem[] = [{ product_id: product.id, quantity, product, variant }]
    setItems(nextItems)
    setSelectedIds([product.id])
    void persist(nextItems, [product.id])
  }

  const cancelBuyNow = () => {
    const backup = buyNowBackupRef.current ?? items
    const nextSelected = syncSelection(backup, selectedIds)
    buyNowBackupRef.current = null
    setItems(backup)
    setSelectedIds(nextSelected)
    void persist(backup, nextSelected)
  }

  const clearVoucher = async () => {
    setVoucher(null)
    setVoucherCode('')
    await AsyncStorage.removeItem(VOUCHER_KEY)
  }

  const consumeCheckoutItems = async () => {
    buyNowBackupRef.current = null
    await clearVoucher()
    await loadCart(user?.id)
  }

  const applyVoucher = async (code: string) => {
    const formatted = code.trim().toUpperCase()
    if (!formatted) throw new Error('Masukkan kode voucher terlebih dahulu')

    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('code', formatted)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Kode voucher tidak ditemukan')

    const found = normalizeVoucher(data)
    if (!found.is_active) throw new Error('Voucher ini tidak aktif')
    if (new Date(found.expires_at).getTime() < Date.now()) throw new Error('Voucher ini sudah kedaluwarsa')
    if (computeVoucherDiscount(found, selectedTotal()) <= 0) {
      throw new Error('Voucher tidak bisa dipakai untuk transaksi ini')
    }

    setVoucher(found)
    setVoucherCode(found.code)
    await AsyncStorage.setItem(VOUCHER_KEY, JSON.stringify(found))
  }

  return (
    <CartContext.Provider
      value={{
        items,
        selectedIds,
        isLoading,
        voucher,
        voucherCode,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        clearItems,
        loadCart,
        mergeGuestCart,
        toggleSelect,
        selectAll,
        buyNow,
        cancelBuyNow,
        consumeCheckoutItems,
        applyVoucher,
        clearVoucher,
        totalItems,
        totalPrice,
        selectedItems,
        selectedCount,
        selectedTotal,
        discountAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
