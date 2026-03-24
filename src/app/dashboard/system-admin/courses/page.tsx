'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ClipboardList, Plus, Search, Save, X, Edit, Trash2 } from 'lucide-react'

export default function AdminCoursesPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('courses').select('*').order('code')
    setCourses(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = courses.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.code?.toLowerCase().includes(search.toLowerCase())
  )

  const weeklyHours = (item: any) => (item?.theoretical_hours ?? 0) + (item?.practical_hours ?? 0)

  async function save(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!editItem?.name || !editItem?.code) {
      toast.error('Lütfen zorunlu alanları doldurun'); return
    }
    setSaving(true)
    try {
      const { id, ...rest } = editItem
      const payload = {
        ...rest,
        code: rest.code.toUpperCase(),
        weekly_hours: weeklyHours(rest),
        updated_at: new Date().toISOString(),
      }

      const { error } = id
        ? await supabase.from('courses').update(payload).eq('id', id)
        : await supabase.from('courses').insert({ ...payload, created_at: new Date().toISOString() })

      if (error) throw error
      toast.success(id ? 'Ders güncellendi' : 'Yeni ders eklendi')
      setEditItem(null)
      load()
    } catch (err: any) {
      toast.error('Giriş başarısız: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Bu dersi silmek istediğinize emin misiniz?')) return
    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) toast.error('Hata: ' + error.message)
    else { toast.success('Ders silindi'); load() }
  }

  function newItem() {
    setEditItem({ code: '', name: '', credit: 2, theoretical_hours: 2, practical_hours: 0, course_type: 'theoretical', requires_lab: false, requires_kitchen: false, needs_projector: false, needs_smartboard: false, needs_computer: false, is_common: false, is_elective: false })
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-fuchsia-900/20 to-gray-900 p-8 border border-purple-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <ClipboardList className="w-48 h-48 text-purple-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">
              Genel Ders Havuzu
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Tüm dersleri ve haftalık ders saatlerini yapılandırın. Haftalık saat = Teorik + Uygulama.
            </p>
          </div>
          <button
            onClick={newItem}
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
            style={{ backgroundImage: 'linear-gradient(135deg, #a855f7, #d946ef)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' }}
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Ders Ekle</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between border border-gray-800/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            placeholder="Ders Kodu veya Adı Ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="text-gray-400 text-sm">Toplam <span className="text-white font-bold">{filtered.length}</span> Ders</div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-800/30 backdrop-blur-xl">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-900/50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-4">Ders Kodu</th>
              <th className="px-5 py-4">Ders Adı</th>
              <th className="px-5 py-4">AKTS</th>
              <th className="px-5 py-4">Teorik</th>
              <th className="px-5 py-4">Uygulama</th>
              <th className="px-5 py-4 text-center text-purple-400">⏱ Haftalık</th>
              <th className="px-5 py-4 text-right">Eylem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-500">Yükleniyor...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center text-gray-500">Henüz ders eklenmemiş.</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-4 font-mono text-purple-400 font-bold">{c.code}</td>
                <td className="px-5 py-4 text-white font-medium">{c.name}</td>
                <td className="px-5 py-4 text-gray-400">{c.credit ?? '—'}</td>
                <td className="px-5 py-4 text-gray-400">{c.theoretical_hours ?? 0}T</td>
                <td className="px-5 py-4 text-gray-400">{c.practical_hours ?? 0}U</td>
                <td className="px-5 py-4 text-center">
                  <span className="inline-flex items-center justify-center min-w-[2.5rem] h-9 px-3 rounded-xl font-black text-base bg-purple-500/15 text-purple-300 border border-purple-500/20">
                    {(c.theoretical_hours ?? 0) + (c.practical_hours ?? 0)} s
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <button onClick={() => setEditItem(c)} className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-md hover:bg-gray-800"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in">
          <div className="glass-card w-full max-w-lg p-6 rounded-2xl border border-gray-700/50 shadow-2xl relative">
            <button onClick={() => setEditItem(null)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              {editItem.id ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}
            </h3>

            <form onSubmit={save} className="space-y-4">
              {/* Code + Name */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kodu <span className="text-purple-400">*</span></label>
                  <input required maxLength={10} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono uppercase focus:border-purple-500 focus:outline-none" value={editItem.code ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, code: e.target.value }))} placeholder="BLG101" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Ders Adı <span className="text-purple-400">*</span></label>
                  <input required className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none" value={editItem.name ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, name: e.target.value }))} placeholder="Algoritma ve Programlama" />
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Teorik (T)</label>
                  <input type="number" min={0} max={20} required className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none" value={editItem.theoretical_hours ?? 0} onChange={e => setEditItem((i: any) => ({ ...i, theoretical_hours: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Uygulama (U)</label>
                  <input type="number" min={0} max={20} required className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none" value={editItem.practical_hours ?? 0} onChange={e => setEditItem((i: any) => ({ ...i, practical_hours: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-purple-400 mb-1.5 block font-bold">⏱ Haftalık Toplam</label>
                  <div className="w-full bg-purple-900/20 border border-purple-500/30 rounded-lg px-3 py-2.5 text-purple-300 font-black text-center text-lg">
                    {weeklyHours(editItem)} saat
                  </div>
                </div>
              </div>

              {/* AKTS + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kredi (AKTS)</label>
                  <input type="number" min={1} max={10} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none" value={editItem.credit ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, credit: parseInt(e.target.value) || null }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Ders Türü</label>
                  <select className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none" value={editItem.course_type ?? 'theoretical'} onChange={e => setEditItem((i: any) => ({ ...i, course_type: e.target.value }))}>
                    <option value="theoretical">Teorik</option>
                    <option value="practical">Uygulama</option>
                    <option value="mixed">Karma (T+U)</option>
                  </select>
                </div>
              </div>

              {/* Flags */}
              <div className="flex flex-wrap gap-3 pt-1">
                {[
                  { key: 'requires_lab', label: 'Lab Gerekir' },
                  { key: 'requires_kitchen', label: 'Mutfak Gerekir' },
                  { key: 'needs_projector', label: 'Projeksiyon' },
                  { key: 'needs_computer', label: 'Bilgisayar' },
                  { key: 'is_common', label: 'Ortak Ders' },
                  { key: 'is_elective', label: 'Seçmeli' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-purple-500" checked={!!editItem[key]} onChange={e => setEditItem((i: any) => ({ ...i, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditItem(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-purple-600 text-white hover:bg-purple-500 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
