'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateID } from '@/lib/commerce'
import type { Profile } from '@/types/database'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient().from('profiles').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (error) toast.error(error.message)
      setUsers((data as Profile[] | null) ?? [])
      setLoading(false)
    })
  }, [])

  const setRole = async (p: Profile, role: 'customer' | 'admin') => {
    const { error } = await createClient().from('profiles').update({ role }).eq('id', p.id)
    if (error) return toast.error(error.message)
    setUsers(prev => prev.map(u => u.id === p.id ? { ...u, role } : u))
    toast.success(`Role ${p.full_name ?? 'pengguna'} diubah menjadi ${role}`)
  }

  const filtered = users.filter(u => (u.full_name ?? '').toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-16">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand mb-3"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Kelola Pengguna ({users.length})</h1>

      <div className="card">
        <div className="p-3 border-b">
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama pengguna" className="input pl-9" />
          </div>
        </div>
        {loading ? <div className="p-8 text-center text-sm text-gray-400">Memuat...</div> : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">Belum ada pengguna</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr><th className="text-left px-4 py-3">Pengguna</th><th className="text-left px-4 py-3">Bergabung</th><th className="text-right px-4 py-3">Role</th></tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-700">{u.full_name ?? 'Tanpa nama'}</p>
                      <p className="text-xs text-gray-400">{u.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateID(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <select value={u.role} onChange={e => setRole(u, e.target.value as 'customer' | 'admin')} className="input w-auto py-1.5 text-xs">
                        <option value="customer">Pelanggan</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
