'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Building2, Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight,
  Projector, Monitor, Laptop, ChefHat, Hammer, Library, Save, X, DoorOpen
} from 'lucide-react'

const TYPE_MAP: Record<string, any> = {
  classroom: { label: 'Standart Derslik', color: '#3b82f6', icon: DoorOpen },
  normal: { label: 'Standart Derslik', color: '#3b82f6', icon: DoorOpen },
  lab: { label: 'Laboratuvar', color: '#10b981', icon: Monitor },
  kitchen: { label: 'Mutfak / Aşçılık', color: '#f59e0b', icon: ChefHat },
  amfi: { label: 'Amfi', color: '#8b5cf6', icon: Library },
  atolye: { label: 'Atölye', color: '#ec4899', icon: Hammer },
}

const DEFAULT_TYPE = { label: 'Derslik', color: '#64748b', icon: DoorOpen }

export default function ClassroomsPage() {
  const supabase = createClient()
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editItem, setEditItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('classrooms').select('*').order('name')
    if (!showInactive) q.eq('is_active', true)
    const { data } = await q
    setClassrooms(data ?? [])
    setLoading(false)
  }, [showInactive, supabase])

  useEffect(() => {
    load()
  }, [load])

  const filtered = classrooms.filter(
    (c: any) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.building?.toLowerCase().includes(search.toLowerCase())
  )

  async function save(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!editItem?.name) {
      toast.error('Derslik adı gerekli')
      return
    }
    setSaving(true)
    try {
      const { id, ...rest } = editItem
      const { error } = id
        ? await supabase.from('classrooms').update(rest).eq('id', id)
        : await supabase.from('classrooms').insert(rest)
        
      if (error) throw error
      
      toast.success(id ? 'Derslik güncellendi' : 'Yeni derslik eklendi')
      setEditItem(null)
      load()
    } catch (err: any) {
      toast.error('Giriş başarısız: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggle(id: string, current: boolean) {
    const { error } = await supabase.from('classrooms').update({ is_active: !current }).eq('id', id)
    if (error) toast.error('Durum değiştirilemedi')
    else {
      toast.success(!current ? 'Derslik aktif edildi' : 'Derslik pasif edildi')
      load()
    }
  }

  async function remove(id: string) {
    if (!confirm('Derslik kalıcı olarak silinsin mi?')) return
    const { error } = await supabase.from('classrooms').delete().eq('id', id)
    if (error) toast.error('Silinemedi: ' + error.message)
    else {
      toast.success('Derslik silindi')
      load()
    }
  }

  const buildings = Array.from(new Set(filtered.map((c: any) => c.building ?? 'Diğer'))).sort()

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900/40 via-teal-900/20 to-gray-900 p-8 border border-emerald-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <Building2 className="w-48 h-48 text-emerald-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Derslik Yönetimi
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Yerleşke genelindeki tüm derslikleri, laboratuvarları ve atölyeleri donanım envanterleriyle birlikte yönetin.
            </p>
          </div>
          <button 
            onClick={() => setEditItem({ is_active: true, type: 'classroom' })} 
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
            style={{ backgroundImage: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Derslik Ekle</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(TYPE_MAP).map(([type, info], i) => {
          const count = classrooms.filter((c: any) => (c.type === type || (type === 'classroom' && c.type === 'normal')) && c.is_active).length
          const totalCap = classrooms
            .filter((c: any) => (c.type === type || (type === 'classroom' && c.type === 'normal')) && c.is_active && c.capacity)
            .reduce((s: number, c: any) => s + (c.capacity ?? 0), 0)
            
          if (type === 'normal') return null
          const IconObj = info.icon
          
          return (
            <div key={type} className={`glass-card p-4 rounded-xl border border-gray-800/60 relative overflow-hidden animate-in-delay-${(i % 3) + 1}`}>
              <div className="absolute -right-4 -top-4 opacity-[0.03]">
                <IconObj className="w-24 h-24" style={{ color: info.color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: info.color }}>
                {loading ? '...' : count}
              </div>
              <div className="text-xs font-semibold text-gray-300 mt-1 flex items-center gap-1.5">
                <IconObj className="w-3 h-3 truncate" style={{ color: info.color }} />
                {info.label}
              </div>
              {totalCap > 0 && (
                <div className="text-[10px] mt-2 font-medium text-gray-500 bg-gray-900/50 inline-block px-2 py-0.5 rounded border border-gray-800">
                  Kapasite: {totalCap}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between border border-gray-800/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/50" />
          <input 
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all font-medium" 
            placeholder="Derslik ID veya Bina adı ara..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${showInactive ? 'bg-emerald-500/50' : 'bg-gray-700'}`}>
              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${showInactive ? 'translate-x-5' : ''}`}></div>
            </div>
            <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Pasifleri Göster</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 animate-pulse">
          <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Yerleşke bilgileri yükleniyor...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 text-center rounded-xl border border-gray-800/60">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Derslik Bulunamadı</h3>
          <p className="text-gray-500 text-sm">Kriterlerinize uygun bir derslik kaydı yok.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {buildings.map((bldg: any) => {
            const bldgRooms = filtered.filter((c: any) => (c.building ?? 'Diğer') === bldg)
            const bldgColor = bldg.startsWith('A') ? '#3b82f6' : bldg.startsWith('B') ? '#10b981' : bldg.startsWith('C') ? '#f59e0b' : bldg.startsWith('D') ? '#8b5cf6' : '#64748b'
            
            return (
              <div key={bldg} className="animate-in-delay-1">
                <div className="flex items-center gap-3 mb-4 pl-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner" style={{ background: `linear-gradient(135deg, ${bldgColor}20, ${bldgColor}10)`, border: `1px solid ${bldgColor}30` }}>
                    <Building2 className="w-4 h-4" style={{ color: bldgColor }} />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {bldg} <span className="text-gray-500 font-normal text-sm ml-2">({bldgRooms.length} Kayıt)</span>
                  </h3>
                  <div className="h-px bg-gray-800/60 flex-1 ml-4 shadow-[0_1px_0_0_rgba(255,255,255,0.02)]"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {bldgRooms.map((c: any) => {
                    const typeInfo = TYPE_MAP[c.type === 'normal' ? 'classroom' : c.type] ?? DEFAULT_TYPE
                    const IconObj = typeInfo.icon
                    
                    return (
                      <div 
                        key={c.id} 
                        className={`glass-card rounded-xl border transition-all duration-300 flex flex-col group hover:shadow-xl hover:shadow-black/20 ${c.is_active ? 'border-gray-700/50 hover:border-gray-600' : 'border-red-900/20 bg-gray-900/50 opacity-60 grayscale-[50%] hover:grayscale-0'}`}
                      >
                        <div className="h-1 w-full rounded-t-xl" style={{ backgroundColor: typeInfo.color }}></div>
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg text-white group-hover:text-cyan-100 transition-colors uppercase tracking-wider">{c.name}</h4>
                              </div>
                              <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border" style={{ background: typeInfo.color + '10', color: typeInfo.color, borderColor: typeInfo.color + '30' }}>
                                <IconObj className="w-3 h-3" />
                                {typeInfo.label}
                              </span>
                            </div>
                            {c.capacity && (
                              <div className="text-center bg-gray-900/80 rounded-lg px-2 py-1 border border-gray-800/80 shadow-inner">
                                <div className="text-xs font-bold text-white">{c.capacity}</div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Kapasite</div>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 mb-4">
                            <h5 className="text-[10px] uppercase font-bold text-gray-600 mb-2 tracking-wider">Donanımlar</h5>
                            <div className="flex flex-wrap gap-2">
                              {c.has_projector ? (
                                <span title="Projeksiyon" className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center gap-1 text-[11px] font-medium text-blue-400">
                                  <Projector className="w-3 h-3" /> Projeksiyon
                                </span>
                              ) : null}
                              {c.has_smartboard ? (
                                <span title="Akıllı Tahta" className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center gap-1 text-[11px] font-medium text-purple-400">
                                  <Monitor className="w-3 h-3" /> Akıllı Tahta
                                </span>
                              ) : null}
                              {c.has_computer ? (
                                <span title={`${c.computer_count || 'Var'} Bilgisayar`} className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                  <Laptop className="w-3 h-3" /> {c.computer_count ? `${c.computer_count} Pc` : 'Pc'}
                                </span>
                              ) : null}
                              {!c.has_projector && !c.has_smartboard && !c.has_computer && (
                                <span className="text-xs text-gray-600 italic">Kayıtlı donanım yok</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-auto pt-3 border-t border-gray-800/60 flex items-center justify-between">
                            <span className={`badge ${c.is_active ? 'badge-emerald' : 'badge-amber'} scale-90 origin-left`}>
                              {c.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                            
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditItem(c)} className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors" title="Düzenle">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => toggle(c.id, c.is_active)} className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white transition-colors" title="Durumu Değiştir">
                                {c.is_active ? <ToggleLeft className="w-3.5 h-3.5 text-amber-500" /> : <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />}
                              </button>
                              <button onClick={() => remove(c.id)} className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors" title="Sil">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in">
          <div className="card w-full max-w-lg p-0 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden">
            <div className={`px-6 py-4 border-b border-gray-800/80 flex justify-between items-center ${editItem.id ? 'bg-gradient-to-r from-blue-900/40 to-indigo-900/40' : 'bg-gradient-to-r from-emerald-900/40 to-teal-900/40'}`}>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editItem.id ? <Edit className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                {editItem.id ? 'Derslik Düzenle' : 'Yeni Derslik Ekle'}
              </h3>
              <button type="button" onClick={() => setEditItem(null)} className="text-gray-400 hover:text-white bg-gray-900/50 hover:bg-gray-800 rounded-lg p-1.5 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={save} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Derslik ID / İsim <span className="text-emerald-500">*</span></label>
                  <input className="w-full bg-gray-900/70 border border-gray-700/80 rounded-lg px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors uppercase tracking-widest placeholder:normal-case placeholder:font-normal placeholder:tracking-normal" placeholder="Örn: B122-123" required value={editItem.name || ''} onChange={(e) => setEditItem({ ...editItem, name: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Blok / Bina</label>
                  <input className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="D Blok" value={editItem.building || ''} onChange={(e) => setEditItem({ ...editItem, building: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Kapasite</label>
                  <input className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" type="number" min="1" max="1000" placeholder="Örn: 40" value={editItem.capacity || ''} onChange={(e) => setEditItem({ ...editItem, capacity: parseInt(e.target.value) || undefined })} />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Kullanım Türü</label>
                  <select className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors form-select appearance-none" value={editItem.type || 'classroom'} onChange={(e) => setEditItem({ ...editItem, type: e.target.value })}>
                    {Object.entries(TYPE_MAP).map(([k, v]) => k !== 'normal' && (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Bulunduğu Kat</label>
                  <input className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors" placeholder="1. Kat" value={editItem.floor || ''} onChange={(e) => setEditItem({ ...editItem, floor: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 block">Derslik İçi Donanımlar</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editItem.has_projector ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-gray-900/30 border-gray-700/50 hover:border-gray-600'}`}>
                    <input type="checkbox" checked={editItem.has_projector || false} onChange={(e) => setEditItem({ ...editItem, has_projector: e.target.checked })} className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 bg-gray-800 border-gray-600" />
                    <Projector className={`w-5 h-5 ${editItem.has_projector ? 'text-blue-400' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${editItem.has_projector ? 'text-blue-100' : 'text-gray-400'}`}>Projeksiyon</span>
                  </label>
                  
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${editItem.has_smartboard ? 'bg-purple-900/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-gray-900/30 border-gray-700/50 hover:border-gray-600'}`}>
                    <input type="checkbox" checked={editItem.has_smartboard || false} onChange={(e) => setEditItem({ ...editItem, has_smartboard: e.target.checked })} className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 bg-gray-800 border-gray-600" />
                    <Monitor className={`w-5 h-5 ${editItem.has_smartboard ? 'text-purple-400' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${editItem.has_smartboard ? 'text-purple-100' : 'text-gray-400'}`}>Akıllı Tahta</span>
                  </label>
                  
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all col-span-2 ${editItem.has_computer ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-gray-900/30 border-gray-700/50 hover:border-gray-600'}`}>
                    <input type="checkbox" checked={editItem.has_computer || false} onChange={(e) => setEditItem({ ...editItem, has_computer: e.target.checked })} className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-gray-800 border-gray-600" />
                    <Laptop className={`w-5 h-5 ${editItem.has_computer ? 'text-emerald-400' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium flex-1 ${editItem.has_computer ? 'text-emerald-100' : 'text-gray-400'}`}>Bilgisayar Sistemi / Lab</span>
                    {editItem.has_computer && (
                      <input type="number" min="1" max="100" className="w-20 bg-gray-900/80 border border-emerald-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500" placeholder="Adet" value={editItem.computer_count || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => setEditItem({ ...editItem, computer_count: parseInt(e.target.value) || null })} />
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5 block">Varsa Ek Notlar</label>
                <input className="w-full bg-gray-900/50 border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-600" placeholder="Örn: Klima arızalı, geçici depo olarak kullanılıyor..." value={editItem.notes || ''} onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })} />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={editItem.is_active ?? true} onChange={(e) => setEditItem({ ...editItem, is_active: e.target.checked })} />
                  <div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ms-3 text-sm font-medium text-gray-300">Derslik atamalara açık (Aktif)</span>
                </label>
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-800/80 mt-6">
                <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2.5 rounded-lg font-medium text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white transition flex-1">İptal Et</button>
                <button type="submit" disabled={saving} className={`px-4 py-2.5 rounded-lg text-sm font-bold text-white flex-[2] flex items-center justify-center gap-2 shadow-lg transition-all ${editItem.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110'}`}>
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" /> }
                  {saving ? 'Kaydediliyor...' : (editItem.id ? 'Değişiklikleri Kaydet' : 'Dersliği Oluştur')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
