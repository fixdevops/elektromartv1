'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, GuestCartItem } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface CartStore {
  items: GuestCartItem[]
  selectedIds: string[]
  isLoading: boolean
  mergedUserId: string | null
  buyNowBackup: GuestCartItem[] | null
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
  resetLocal: () => void
  totalItems: () => number
  totalPrice: () => number
  selectedItems: () => GuestCartItem[]
  selectedTotal: () => number
}

function syncSelection(items: GuestCartItem[], selected: string[]): string[] {
  const valid = items.map(i => i.product_id)
  const kept = selected.filter(id => valid.includes(id))
  return kept.length || selected.length === 0 ? (kept.length ? kept : valid) : kept
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selectedIds: [],
      isLoading: false,
      mergedUserId: null,
      buyNowBackup: null,

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      selectedItems: () => get().items.filter(i => get().selectedIds.includes(i.product_id)),
      selectedTotal: () => get().selectedItems().reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      addItem: async (product, qty = 1, variant) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const add = Math.max(1, Math.min(qty, Math.max(1, product.stock)))

        set(state => {
          const existing = state.items.find(i => i.product_id === product.id && i.variant === variant)
          const items = existing
            ? state.items.map(i =>
                i === existing
                  ? { ...i, quantity: Math.min(i.quantity + add, product.stock) }
                  : i
              )
            : [...state.items, { product_id: product.id, quantity: add, product, variant }]
          return { items, selectedIds: syncSelection(items, state.selectedIds), buyNowBackup: null }
        })

        if (user) {
          const current = get().items.find(i => i.product_id === product.id && i.variant === variant)
          await supabase.from('cart_items').upsert({
            user_id: user.id,
            product_id: product.id,
            quantity: Math.min(current?.quantity ?? add, product.stock),
          }, { onConflict: 'user_id,product_id' })
        }
      },

      removeItem: async (productId) => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        set(state => {
          const items = state.items.filter(i => i.product_id !== productId)
          return { items, selectedIds: state.selectedIds.filter(id => id !== productId) }
        })

        if (user) {
          await supabase.from('cart_items').delete().eq('user_id', user.id).eq('product_id', productId)
        }
      },

      updateQuantity: async (productId, qty) => {
        if (qty <= 0) return get().removeItem(productId)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        const item = get().items.find(i => i.product_id === productId)
        if (!item) return
        const next = Math.max(1, Math.min(qty, Math.max(1, item.product.stock)))

        set(state => ({
          items: state.items.map(i => i.product_id === productId ? { ...i, quantity: next } : i),
        }))

        if (user) {
          await supabase.from('cart_items').update({ quantity: next })
            .eq('user_id', user.id).eq('product_id', productId)
        }
      },

      clearCart: async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        set({ items: [], selectedIds: [], buyNowBackup: null })
        if (user) await supabase.from('cart_items').delete().eq('user_id', user.id)
      },

      clearItems: async (ids) => {
        if (!ids.length) return
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        set(state => {
          const items = state.items.filter(i => !ids.includes(i.product_id))
          return { items, selectedIds: state.selectedIds.filter(id => !ids.includes(id)) }
        })
        if (user) {
          await supabase.from('cart_items').delete().eq('user_id', user.id).in('product_id', ids)
        }
      },

      loadCart: async (userId) => {
        // `Beli Sekarang` memakai keranjang sementara; jangan timpa dari DB
        // saat halaman checkout mount ulang (Providers memanggil loadCart).
        if (get().buyNowBackup !== null) return

        const supabase = createClient()
        const uid = userId ?? (await supabase.auth.getUser()).data.user?.id
        if (!uid) return

        set({ isLoading: true })
        const state = get()

        // Satu kali merge guest cart saat sesi user dikenali.
        if (state.mergedUserId !== uid && state.items.length > 0) {
          set({ mergedUserId: uid })
          await get().mergeGuestCart(uid)
          return
        }

        const { data, error } = await supabase
          .from('cart_items')
          .select('*, product:products(*)')
          .eq('user_id', uid)

        // Bisa saja buyNow dipicel saat request masih berjalan.
        if (get().buyNowBackup !== null) {
          set({ isLoading: false })
          return
        }

        if (!error && data) {
          const items: GuestCartItem[] = data
            .filter(i => i.product)
            .map(i => ({ product_id: i.product_id, quantity: i.quantity, product: i.product as Product }))
          set(state2 => ({
            items,
            selectedIds: syncSelection(items, state2.selectedIds),
            isLoading: false,
            mergedUserId: uid,
          }))
        } else {
          set({ isLoading: false, mergedUserId: uid })
        }
      },

      mergeGuestCart: async (userId) => {
        const supabase = createClient()
        const { items } = get()
        for (const item of items) {
          if (get().buyNowBackup !== null) return
          const { data: existing } = await supabase
            .from('cart_items')
            .select('quantity')
            .eq('user_id', userId)
            .eq('product_id', item.product_id)
            .maybeSingle()
          await supabase.from('cart_items').upsert({
            user_id: userId,
            product_id: item.product_id,
            quantity: Math.min((existing?.quantity ?? 0) + item.quantity, item.product.stock),
          }, { onConflict: 'user_id,product_id' })
        }
        if (get().buyNowBackup !== null) return
        set({ mergedUserId: userId })
        await get().loadCart(userId)
      },

      toggleSelect: (id) => set(state => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter(x => x !== id)
          : [...state.selectedIds, id],
      })),

      selectAll: (value) => set(state => ({
        selectedIds: value ? state.items.map(i => i.product_id) : [],
      })),

      buyNow: (product, qty = 1, variant) => {
        const state = get()
        set({
          buyNowBackup: state.buyNowBackup ?? state.items,
          items: [{ product_id: product.id, quantity: Math.max(1, Math.min(qty, product.stock)), product, variant }],
          selectedIds: [product.id],
        })
      },

      cancelBuyNow: () => set(state => ({
        items: state.buyNowBackup ?? state.items,
        selectedIds: (state.buyNowBackup ?? state.items).map(i => i.product_id),
        buyNowBackup: null,
      })),

      consumeCheckoutItems: async () => {
        // RPC place_order sudah menghapus item yang dibeli dari database.
        set({ buyNowBackup: null, selectedIds: [] })
        await get().loadCart()
      },

      resetLocal: () => set({ items: [], selectedIds: [], mergedUserId: null, buyNowBackup: null }),
    }),
    {
      name: 'em_cart',
      partialize: state => ({
        items: state.items,
        selectedIds: state.selectedIds,
        mergedUserId: state.mergedUserId,
        buyNowBackup: state.buyNowBackup,
      }),
    }
  )
)
