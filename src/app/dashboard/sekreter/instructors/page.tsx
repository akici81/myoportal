'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  GraduationCap, Plus, Edit, Search, ToggleLeft, ToggleRight,
  Mail, Phone, BookOpen, Trash2, ShieldCheck, UserCircle, X, Save
} from 'lucide-react'

// Unvanlara göre farklı renk/ikon kombinasyonları
const TITLE_STYLES: Record<string, { color: string; badge: string }> = {
  'Prof. Dr.': { color: '#f59e0b', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  'Doç. Dr.': { color: '#f97316', badge: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  'Dr. Öğr. Üyesi': { color: '#8b5cf6', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  'Dr.': { color: '#a855f7', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  'Öğr. Gör. Dr.': { color: '#0ea5e9', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  'Öğr. Gör.': { color: '#3b82f6', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  'Arş. Gör.': { color: '#10b981', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  'Uzman': { color: '#64748b', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
}

const TITLES = Object.keys(TITLE_STYLES)
const DEFAULT_STYLE = { color: '#8b5cf6', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' }

export default function InstructorsPage() {
  const supabase = createClient()
  const [instructors, setInstructors] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  
  // Editor
  const [editItem, setEditItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('instructors')
      .select(`
        *,
        departments:instructors_department_id_fkey(id, name, short_code)
      `)
      .order('full_name')
      
    if (!showInactive) q.eq('is_active', true)
    
    const { data, error } = await q
    if (error) {
      toast.error('Veri çekilemedi: ' + error.message)
    } else {
      setInstructors(data ?? [])
    }
    setLoading(false)
  }, [showInactive, supabase])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const fetchDeps = async () => {
      const { data } = await supabase.from('departments').select('id, name, short_code').eq('is_active', true).order('name')
      setDepartments(data ?? [])
    }
    fetchDeps()
  }, [supabase])

  const filtered = instructors.filter(i => {
    const q = search.toLowerCase()
    return (!q || i.full_name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q)) &&
           (!filterDept || i.department_id === filterDept)
  })

  // Group by Departments
  const deptGroups = [
    ...departments.map(d => ({
      dept: d,
      items: filtered.filter(i => i.department_id === d.id)
    })).filter(g => g.items.length > 0),
    ...(filtered.filter(i => !i.department_id).length > 0
      ? [{ dept: { id: 'none', name: 'Ortak Havuz / Bölüm Atanmamış', short_code: 'ORT' }, items: filtered.filter(i => !i.department_id) }]
      : [])
  ]

  async function save(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!editItem?.full_name) { 
      toast.error('Ad Soyad gerekli')
      return 
    }
    
    setSaving(true)
    try {
      const { id, departments: _, ...rest } = editItem
      const { error } = id
        ? await supabase.from('instructors').update(rest).eq('id', id)
        : await supabase.from('instructors').insert(rest)
        
      if (error) throw error
      
      toast.success(id ? 'Bilgiler güncellendi' : 'Öğretim elemanı eklendi')
      setEditItem(null)
      load()
    } catch (err: any) {
      toast.error('Kayıt başarısız: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(id: string, current: boolean) {
    const { error } = await supabase.from('instructors').update({ is_active: !current }).eq('id', id)
    if (error) toast.error('Durum değiştirilemedi')
    else {
      toast.success(!current ? 'Personel aktif edildi' : 'Personel pasif edildi')
      load()
    }
  }

  async function remove(id: string) {
    if (!confirm('Öğretim elemanı sistemden tamamen silinsin mi? (Geri alınamaz)')) return
    const { error } = await supabase.from('instructors').delete().eq('id', id)
    if (error) toast.error('Silinemedi: ' + error.message)
    else {
      toast.success('Kayıt silindi')
      load()
    }
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-violet-900/20 to-gray-900 p-8 border border-indigo-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <GraduationCap className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Akademik Personel
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Yerleşkemizdeki tüm bölümlere ait öğretim görevlileri, doktora üyeleri ve profesörlerin yönetim paneli.
            </p>
          </div>
          <button 
            onClick={() => setEditItem({ is_active: true, title: 'Öğr. Gör.' })} 
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
            style={{ backgroundImage: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 20px rgba(79, 70, 229, 0.3)' }}
          >
            <Plus className="w-5 h-5" />
            <span>Personel Ekle</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-800/60">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600/50" />
            <input 
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-medium" 
              placeholder="İsim veya e-posta ara..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <select 
            className="w-full sm:w-60 bg-gray-900/50 border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">🏫 Tüm Bölümler ({instructors.length})</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-6 text-sm whitespace-nowrap">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${showInactive ? 'bg-indigo-500/50' : 'bg-gray-700'}`}>
              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${showInactive ? 'translate-x-5' : ''}`}></div>
            </div>
            <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Pasifleri Göster</span>
          </label>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="text-center py-20 animate-pulse">
          <GraduationCap className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Akademik kadro yükleniyor...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 text-center rounded-xl border border-gray-800/60">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Kayıt Bulunamadı</h3>
          <p className="text-gray-500 text-sm">Arama kriterlerinize veya seçili bölüme uyan öğretim elemanı yok.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {deptGroups.map(({ dept, items }) => (
            <div key={dept.id} className="animate-in-delay-1">
              {/* Department Separator / Header */}
              <div className="flex items-center gap-3 mb-5 pl-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-inner" style={{ background: `linear-gradient(135deg, #4f46e520, #4f46e510)`, border: `1px solid #4f46e530` }}>
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {dept.name}
                  </h3>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-0.5">
                    {items.length} Personel
                  </p>
                </div>
                <div className="h-px bg-gradient-to-r from-indigo-800/40 to-transparent flex-1 ml-4"></div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(i => {
                  const style = TITLE_STYLES[i.title || ''] || DEFAULT_STYLE
                  const initials = i.full_name?.substring(0,2).toUpperCase() || 'ÖE'
                  
                  return (
                    <div 
                      key={i.id} 
                      className={`glass-card rounded-2xl border transition-all duration-300 flex flex-col group hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-900/20
                        ${i.is_active ? 'border-gray-700/50 hover:border-indigo-500/30' : 'border-red-900/20 bg-gray-900/50 opacity-60 grayscale hover:grayscale-0'}`}
                    >
                      {/* Top Gradient Bar */}
                      <div className="h-1.5 w-full rounded-t-2xl opacity-80" style={{ backgroundColor: style.color }}></div>
                      
                      <div className="p-5 flex-1 flex flex-col relative overflow-hidden">
                        {/* Status absolute badge */}
                        <div className="absolute right-4 top-4">
                          <div className={`w-2 h-2 rounded-full shadow-md ${i.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        </div>

                        {/* User Avatar & Identity */}
                        <div className="flex items-center gap-4 mb-4">
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ring-2 ring-offset-2 ring-offset-[#0f1523]"
                            style={{ background: `${style.color}15`, color: style.color }}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 pr-4">
                            <h4 className="font-bold text-md text-white group-hover:text-indigo-200 transition-colors truncate">
                              {i.full_name}
                            </h4>
                            <div className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] uppercase font-bold tracking-wider border ${style.badge}`}>
                              {i.title || 'Belirtilmemiş'}
                            </div>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-2.5 mt-2 bg-gray-900/40 rounded-xl p-3 border border-gray-800/40">
                          <div className="flex items-center gap-2.5 text-xs text-gray-400">
                            <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span className="truncate group-hover:text-gray-300 transition-colors">{i.email || <span className="text-gray-600 italic">E-posta yok</span>}</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-gray-400">
                            <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span className="truncate group-hover:text-gray-300 transition-colors">{i.phone || <span className="text-gray-600 italic">Telefon yok</span>}</span>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-auto pt-4 flex gap-2">
                          <button onClick={() => setEditItem(i)} className="flex-1 py-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 rounded-lg text-xs font-semibold text-gray-300 transition-all flex items-center justify-center gap-1.5 hover:text-white" title="Düzenle">
                            <Edit className="w-3.5 h-3.5" /> Düzenle
                          </button>
                          
                          <button onClick={() => toggle(i.id, i.is_active)} className="p-1.5 bg-gray-800/50 hover:bg-gray-700 border border-gray-700/50 rounded-lg text-gray-400 transition-all flex items-center justify-center" title="Durumu Değiştir">
                            {i.is_active ? <ToggleLeft className="w-4 h-4 text-emerald-500" /> : <ToggleRight className="w-4 h-4 text-gray-500" />}
                          </button>

                          <button onClick={() => remove(i.id)} className="p-1.5 bg-gray-800/50 hover:bg-red-900/30 border border-gray-700/50 hover:border-red-900/50 rounded-lg text-gray-400 hover:text-red-400 transition-all flex items-center justify-center" title="Sil">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in">
          <div className="card w-full max-w-lg p-0 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-5 border-b border-gray-800/80 flex justify-between items-center ${editItem.id ? 'bg-gradient-to-r from-indigo-900/50 to-purple-900/50' : 'bg-gradient-to-r from-violet-900/50 to-indigo-900/50'}`}>
              <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
                  {editItem.id ? <Edit className="w-4 h-4 text-indigo-300" /> : <Plus className="w-4 h-4 text-violet-300" />}
                </div>
                {editItem.id ? 'Personel Bilgilerini Düzenle' : 'Yeni Akademik Personel Ekle'}
              </h3>
              <button type="button" onClick={() => setEditItem(null)} className="text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-800 rounded-lg p-1.5 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={save} className="p-6 space-y-5">
              <div className="space-y-4">
                {/* İsim */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    Tam Ad Soyad <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      className="w-full bg-gray-900/70 border border-gray-700/80 rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors placeholder:text-gray-600" 
                      placeholder="Örn: Dr. Ahmet Yılmaz" 
                      required 
                      value={editItem.full_name || ''} 
                      onChange={(e) => setEditItem({ ...editItem, full_name: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Grid 2 Columns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Akademik Unvan</label>
                    <select 
                      className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors form-select appearance-none font-medium" 
                      value={editItem.title || 'Öğr. Gör.'} 
                      onChange={(e) => setEditItem({ ...editItem, title: e.target.value })}
                    >
                      {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">Bağlı Olduğu Bölüm</label>
                    <select 
                      className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors form-select appearance-none" 
                      value={editItem.department_id || ''} 
                      onChange={(e) => setEditItem({ ...editItem, department_id: e.target.value || null })}
                    >
                      <option value="">— Ortak Havuz —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* İletişim */}
                <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/40 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> İletişim Bilgileri
                  </h4>
                  
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors" 
                        type="email" 
                        placeholder="Kurumsal e-posta adresi (Opsiyonel)" 
                        value={editItem.email || ''} 
                        onChange={(e) => setEditItem({ ...editItem, email: e.target.value })} 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors" 
                        placeholder="Dahili veya Cep Telefonu (Opsiyonel)" 
                        value={editItem.phone || ''} 
                        onChange={(e) => setEditItem({ ...editItem, phone: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>

                {/* Aktiflik Durumu */}
                <div className="pt-2 px-1">
                  <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={editItem.is_active ?? true} onChange={(e) => setEditItem({ ...editItem, is_active: e.target.checked })} />
                    <div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    <span className="ms-3 text-sm font-medium text-gray-300">Sistemde Aktif (Ders atanabilir)</span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex gap-3 border-t border-gray-800/80 mt-6">
                <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2.5 rounded-lg font-medium text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white transition flex-1">
                  Vazgeç
                </button>
                <button type="submit" disabled={saving} className={`px-4 py-2.5 rounded-lg text-sm font-bold text-white flex-[2] flex items-center justify-center gap-2 shadow-lg transition-all ${editItem.id ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:brightness-110' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110'}`}>
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" /> }
                  {saving ? 'Kayıt Yapılıyor...' : (editItem.id ? 'Değişiklikleri Kaydet' : 'Personeli Sisteme Ekle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
