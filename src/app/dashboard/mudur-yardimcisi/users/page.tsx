'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserCog, Plus, Search, Shield, Mail, Edit, X, Save } from 'lucide-react'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  system_admin: { label: 'Sistem Admin', color: '#ef4444' },
  mudur: { label: 'Müdür', color: '#8b5cf6' },
  mudur_yardimcisi: { label: 'Müdür Yrd.', color: '#a855f7' },
  sekreter: { label: 'Sekreter', color: '#3b82f6' },
  bolum_baskani: { label: 'Bölüm Bşk.', color: '#10b981' },
  instructor: { label: 'Öğretim El.', color: '#f59e0b' },
}

export default function MYUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u =>
    !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function saveRole() {
    if (!editItem) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ role: editItem.role }).eq('id', editItem.id)
    if (error) toast.error('Hata: ' + error.message)
    else { toast.success('Rol güncellendi'); setEditItem(null); load() }
    setSaving(false)
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-red-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12"><UserCog className="w-48 h-48 text-red-400" /></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white">Kullanıcı Yönetimi</h1>
          <p className="mt-2 text-gray-400">Sistemdeki tüm kullanıcılar ve rol atamaları</p>
        </div>
      </div>

      <div className="card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input className="w-full card border rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 font-medium" placeholder="Ad veya e-posta ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="text-gray-400 text-sm font-medium">Toplam <span className="text-white">{filtered.length}</span> Kullanıcı</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 card/30">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="card text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-4">Ad Soyad</th>
              <th className="px-6 py-4">E-posta</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Durum</th>
              <th className="px-6 py-4 text-right">Eylem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(u => {
              const r = ROLE_LABELS[u.role] || { label: u.role, color: '#64748b' }
              return (
                <tr key={u.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4 font-medium text-white">{u.full_name}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: r.color + '15', color: r.color }}>
                      {r.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {u.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setEditItem({...u})} className="p-1.5 text-gray-400 hover:text-white rounded-md hover:card"><Edit className="w-4 h-4" /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in">
          <div className="card w-full max-w-sm p-6 rounded-2xl border shadow-2xl relative">
            <button onClick={() => setEditItem(null)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:card"><X className="w-5 h-5" /></button>
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Shield className="w-5 h-5 text-red-400" /> Rol Değiştir</h3>
            <p className="text-sm text-gray-400 mb-5">{editItem.full_name}</p>
            <select className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white mb-4" value={editItem.role} onChange={e => setEditItem((i: any) => ({...i, role: e.target.value}))}>
              {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setEditItem(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm card text-gray-400 hover:bg-gray-700">İptal</button>
              <button onClick={saveRole} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-500">{saving ? '...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
