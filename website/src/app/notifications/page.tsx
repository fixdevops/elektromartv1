'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck, Package, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { formatDateID } from '@/lib/commerce'
import type { AppNotification } from '@/types/database'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(() => {
    if (!user) return
    createClient()
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error('Gagal memuat notifikasi')
        setItems((data as AppNotification[] | null) ?? [])
      })
  }, [user])

  const markAll = async () => {
    if (!user) return
    const { error } = await createClient().from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    if (error) return toast.error(error.message)
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    toast.success('Semua notifikasi ditandai dibaca')
  }

  const markOne = async (n: AppNotification) => {
    if (n.is_read) return
    await createClient().from('notifications').update({ is_read: true }).eq('id', n.id)
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Bell className="w-5 h-5 text-brand" /> Notifikasi</h1>
        {items.some(i => !i.is_read) && (
          <button onClick={markAll} className="text-xs text-brand font-semibold flex items-center gap-1"><CheckCheck className="w-4 h-4" /> Tandai semua dibaca</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card py-20 text-center">
          <Bell className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Belum ada notifikasi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <Link
              key={n.id}
              href={n.data?.order_id ? '/account' : n.data?.url ?? '/'}
              onClick={() => markOne(n)}
              className={`card block p-4 ${n.is_read ? '' : 'border-l-4 border-l-brand bg-orange-50/40'}`}
            >
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-50 text-brand flex items-center justify-center flex-shrink-0">
                  {n.type === 'promo' ? <Tag className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 break-words [overflow-wrap:anywhere]">{n.body}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{formatDateID(n.created_at, true)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
