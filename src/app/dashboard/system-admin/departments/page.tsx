'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { GraduationCap, Plus, Edit, ToggleLeft, ToggleRight, Search, Users, BookOpen, Building2, Save, X } from 'lucide-react'

export default function DepartmentsPage() {
  const supabase = createClient()
  const [departments, setDepts] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [instrCounts, setInstrCounts] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('departments').select('*, head:profiles!fk_dept_head(id, full_name)').order('name')
    if (!showInactive) q.eq('is_active', true)
    const { data } = await q
    setDepts(data ?? [])
    
    const { data: progs } = await supabase.from('programs').select('*').eq('is_active', true).order('name')
    setPrograms(progs ?? [])
    
    const { data: instrs } = await supabase.from('instructors').select('department_id').eq('is_active', true)
    const counts: Record<string, number> = {}
    instrs?.forEach((i: any) => { counts[i.department_id] = (counts[i.department_id] ?? 0) + 1 })
    setInstrCounts(counts)
    
    setLoading(false)
  }, [showInactive, supabase])

  useEffect(() => { load() }, [load])
  
  useEffect(() => {
    supabase.from('profiles').select('id, full_name').in('role', ['bolum_baskani', 'mudur', 'mudur_yardimcisi']).order('full_name')
      .then(({ data }) => setProfiles(data ?? []))
  }, [supabase])

  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.short_code?.toLowerCase().includes(search.toLowerCase())
  )

  async function save(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!editItem?.name) { toast.error('Bölüm adı gerekli'); return }
    if (!editItem?.short_code) { toast.error('Kısa kod gerekli'); return }
    
    setSaving(true)
    try {
      const { id, head, ...rest } = editItem
      const payload = { ...rest, short_code: rest.short_code.toUpperCase(), updated_at: new Date().toISOString() }
      
      const { error } = id
        ? await supabase.from('departments').update(payload).eq('id', id)
        : await supabase.from('departments').insert({ ...payload, created_at: new Date().toISOString() })
        
      if (error) throw error
      
      toast.success(id ? 'Bölüm başarıyla güncellendi' : 'Yeni bölüm eklendi')
      setEditItem(null)
      load()
    } catch (err: any) {
      toast.error('Giriş başarısız: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(id: string, current: boolean) {
    const { error } = await supabase.from('departments').update({ is_active: !current }).eq('id', id)
    if (error) {
      toast.error('Durum değiştirilemedi')
    } else {
      toast.success(!current ? 'Bölüm aktif edildi' : 'Bölüm pasif edildi')
      load()
    }
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-900/40 via-orange-900/20 to-gray-900 p-8 border border-red-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <Building2 className="w-48 h-48 text-red-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 flex items-center gap-3">
              Bölüm Yönetimi
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Üniversitedeki akademik bölümleri tanımlayın, başkan atayın ve bölüm bazlı istatistikleri takip edin.
            </p>
          </div>
          <button 
            onClick={() => setEditItem({ is_active: true })} 
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
            style={{ backgroundImage: 'linear-gradient(135deg, #ef4444, #ea580c)', boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)' }}
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Bölüm Ekle</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between border border-gray-800/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all font-medium" 
            placeholder="Bölüm adı veya kısa kod ara..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${showInactive ? 'bg-red-500/50' : 'bg-gray-700'}`}>
              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${showInactive ? 'translate-x-5' : ''}`}></div>
            </div>
            <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Pasifleri Göster</span>
          </label>
          <div className="hidden sm:block w-px h-6 bg-gray-800"></div>
          <div className="text-gray-400 font-medium">Toplam <span className="text-white">{filtered.length}</span> Bölüm</div>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="glass-card h-48 rounded-xl border border-gray-800 p-5 flex flex-col justify-between animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800/50 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-8 bg-gray-800/40 rounded w-full" />
                <div className="flex justify-between">
                  <div className="h-8 bg-gray-800 rounded w-1/3" />
                  <div className="h-8 bg-gray-800 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card py-20 text-center rounded-xl border border-gray-800/60 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Bölüm Bulunamadı</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Arama kriterlerinize uyan bir bölüm bulunamadı veya henüz hiç bölüm eklenmemiş.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d, i) => {
            const deptPrograms = programs.filter(p => p.department_id === d.id)
            return (
              <div 
                key={d.id} 
                className={`glass-card p-5 rounded-xl border transition-all duration-300 group hover:shadow-xl hover:shadow-black/20 animate-in-delay-${(i % 3) + 1} flex flex-col h-full
                  ${d.is_active ? 'border-gray-700/50 hover:border-gray-600' : 'border-red-900/30 bg-red-900/5 opacity-70 grayscale-[30%] hover:grayscale-0'}`}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-inner"
                    style={{ background: d.is_active ? 'linear-gradient(135deg, #ef444420, #ea580c10)' : '#1f2937', color: d.is_active ? '#ef4444' : '#6b7280', border: '1px solid ' + (d.is_active ? '#ef444430' : '#374151') }}
                  >
                    {d.short_code}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-bold text-gray-100 text-base leading-tight truncate group-hover:text-white transition-colors" title={d.name}>
                      {d.name}
                    </h3>
                    <div className="text-xs font-medium text-gray-500 mt-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Yönetici: {d.head?.full_name || <span className="text-red-400/80 italic">Atanmamış</span>}
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  {/* Program Tags */}
                  {deptPrograms.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {deptPrograms.slice(0, 3).map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded bg-gray-800/60 text-gray-300 border border-gray-700/50">
                          <BookOpen className="w-3 h-3 text-cyan-500" />
                          {p.name}
                        </span>
                      ))}
                      {deptPrograms.length > 3 && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-gray-800/30 text-gray-500">
                          +{deptPrograms.length - 3} program
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 text-[11px] text-gray-600 italic px-2">Kayıtlı program yok</div>
                  )}
                </div>

                {/* Footer Stats & Actions */}
                <div className="pt-4 mt-auto border-t border-gray-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400" title="Öğretim Elemanları">
                      <Users className="w-4 h-4 text-gray-500" />
                      {instrCounts[d.id] ?? 0}
                    </div>
                    <span className={`badge ${d.is_active ? 'badge-emerald' : 'badge-amber'} scale-90 origin-left`}>
                      {d.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-900/80 rounded-lg p-1 border border-gray-800/60 translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    <button 
                      onClick={() => setEditItem(d)} 
                      className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                      title="Bölümü Düzenle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggle(d.id, d.is_active)} 
                      className={`p-1.5 rounded-md transition-colors ${d.is_active ? 'hover:bg-amber-900/30 text-gray-400 hover:text-amber-400' : 'hover:bg-emerald-900/30 text-gray-400 hover:text-emerald-400'}`}
                      title={d.is_active ? "Bölümü Pasife Al" : "Bölümü Aktif Et"}
                    >
                      {d.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit/Add Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-gray-700/50 shadow-2xl relative">
            <button onClick={() => setEditItem(null)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${editItem.id ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-red-500 to-orange-600'}`}>
                {editItem.id ? <Edit className="w-5 h-5 text-white" /> : <Building2 className="w-5 h-5 text-white" />}
              </div>
              {editItem.id ? 'Bölümü Düzenle' : 'Yeni Bölüm'}
            </h3>
            <p className="text-sm text-gray-400 mb-6">{editItem.id ? 'Mevcut bölüm ayarlarını güncelleyin.' : 'Üniversiteye yeni bir akademik bölüm tanımlayın.'}</p>
            
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Bölüm Adı <span className="text-red-400">*</span></label>
                <input 
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors" 
                  placeholder="Bilgisayar Teknolojileri" 
                  required
                  value={editItem.name ?? ''} 
                  onChange={e => setEditItem((i: any) => ({ ...i, name: e.target.value }))} 
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kısa Kod <span className="text-red-400">*</span></label>
                <input 
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-red-500 transition-colors" 
                  placeholder="BLG" 
                  required
                  maxLength={5} 
                  value={editItem.short_code ?? ''} 
                  onChange={e => setEditItem((i: any) => ({ ...i, short_code: e.target.value.toUpperCase() }))} 
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Bölüm Başkanı</label>
                <select 
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors form-select appearance-none" 
                  value={editItem.head_id ?? ''} 
                  onChange={e => setEditItem((i: any) => ({ ...i, head_id: e.target.value || null }))}
                >
                  <option value="">— Atanmamış —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              
              <div className="pt-2">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={editItem.is_active ?? true} onChange={e=>setEditItem((i:any)=>({...i,is_active:e.target.checked}))} />
                  <div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  <span className="ms-3 text-sm font-medium text-gray-300">Bölüm aktif kayıt alıyor mu?</span>
                </label>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2.5 rounded-lg font-medium text-sm text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-white transition flex-1">İptal</button>
                <button type="submit" disabled={saving} className={`px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-1 flex items-center justify-center gap-2 shadow-lg transition-all ${editItem.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20' : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-red-500/20'}`}>
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" /> }
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
