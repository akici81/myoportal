'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BookOpen, Plus, Search, Building2, Save, X, Edit, Trash2 } from 'lucide-react'

export default function AdminProgramsPage() {
  const supabase = createClient()
  const [programs, setPrograms] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    
    const { data: depts } = await supabase.from('departments').select('id, name, short_code').eq('is_active', true).order('name')
    setDepartments(depts ?? [])

    const deptMap: Record<string, { name: string; short_code: string }> = {}
    depts?.forEach(d => { deptMap[d.id] = { name: d.name, short_code: d.short_code } })

    const { data } = await supabase.from('programs').select('*').order('name')
    const enriched = (data ?? []).map(p => ({ ...p, department: deptMap[p.department_id] || null }))
    setPrograms(enriched)
    
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = programs.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.short_code?.toLowerCase().includes(search.toLowerCase()) || p.department?.name?.toLowerCase().includes(search.toLowerCase())
  )

  async function save(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!editItem?.name || !editItem?.short_code || !editItem?.department_id) { 
        toast.error('Lütfen zorunlu alanları doldurun'); return 
    }
    
    setSaving(true)
    try {
      const { id, department, ...rest } = editItem
      const payload = { ...rest, short_code: rest.short_code.toUpperCase(), updated_at: new Date().toISOString() }
      
      const { error } = id
        ? await supabase.from('programs').update(payload).eq('id', id)
        : await supabase.from('programs').insert({ ...payload, created_at: new Date().toISOString() })
        
      if (error) throw error
      
      toast.success(id ? 'Program güncellendi' : 'Yeni program eklendi')
      setEditItem(null)
      load()
    } catch (err: any) {
      toast.error('Giriş başarısız: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
      if(!confirm('Bu programı silmek istediğinize emin misiniz?')) return
      const { error } = await supabase.from('programs').delete().eq('id', id)
      if(error) toast.error('Hata: ' + error.message)
      else {
          toast.success('Program silindi')
          load()
      }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-blue-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <BookOpen className="w-48 h-48 text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-cyan-600 flex items-center gap-3">
              Önlisans Programları
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              MYO bünyesindeki bölümlere bağlı programları yönetin.
            </p>
          </div>
          <button 
            onClick={() => setEditItem({ is_active: true })} 
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
            style={{ backgroundImage: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Program Ekle</span>
          </button>
        </div>
      </div>

      <div className="card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            className="w-full card border rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 font-medium" 
            placeholder="Program, Bölüm Ara..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="text-gray-400 text-sm font-medium">Toplam <span className="text-white">{filtered.length}</span> Program</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
         {filtered.map(p => (
            <div key={p.id} className="card p-5 rounded-xl border flex flex-col h-full group">
               <div className="flex items-start gap-4 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-inner bg-cyan-900/20 text-cyan-400 border border-cyan-500/20">
                     {p.short_code}
                  </div>
                  <div className="flex-1">
                     <h3 className="font-bold text-gray-100 text-base">{p.name}</h3>
                     <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {p.department?.name || 'Bölüm Yok'}
                     </div>
                  </div>
               </div>
               
               <div className="mt-auto pt-4 border-t flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                     {p.is_active ? 'Aktif' : 'Pasif'}
                  </span>
                  <div className="flex gap-1">
                     <button onClick={() => setEditItem(p)} className="p-1.5 text-gray-400 hover:text-white rounded-md hover:card transition"><Edit className="w-4 h-4"/></button>
                     <button onClick={() => remove(p.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-md hover:card transition"><Trash2 className="w-4 h-4"/></button>
                  </div>
               </div>
            </div>
         ))}
      </div>

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in">
          <div className="card w-full max-w-md p-6 rounded-2xl border shadow-2xl relative">
            <button onClick={() => setEditItem(null)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:card transition">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              {editItem.id ? 'Programı Düzenle' : 'Yeni Program'}
            </h3>
            
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Program Adı <span className="text-cyan-400">*</span></label>
                <input required className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" value={editItem.name ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kısa Kod <span className="text-cyan-400">*</span></label>
                <input required maxLength={5} className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-cyan-500" value={editItem.short_code ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, short_code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Bağlı Olduğu Bölüm <span className="text-cyan-400">*</span></label>
                <select required className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" value={editItem.department_id ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, department_id: e.target.value }))}>
                  <option value="">— Bölüm Seçin —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="pt-2">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={editItem.is_active ?? true} onChange={e=>setEditItem((i:any)=>({...i,is_active:e.target.checked}))} />
                  <div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  <span className="ms-3 text-sm font-medium text-gray-300">Program Aktif</span>
                </label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditItem(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm card text-gray-400 hover:bg-gray-700 hover:text-white">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-cyan-600 text-white hover:bg-cyan-500">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
