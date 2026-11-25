'use client'

import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/stores/cartStore'

interface AuthStore {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  profile: null,
  isLoading: false,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  signIn: async (email, password) => {
    set({ isLoading: true })
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ isLoading: false })
    if (error) throw error
    await get().fetchProfile()
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true })
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    set({ isLoading: false })
    if (error) throw error
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, profile: null })
    useCartStore.getState().resetLocal()
  },

  fetchProfile: async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    set({ user })
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    set({ profile: (data as Profile | null) ?? null })
  },
}))
