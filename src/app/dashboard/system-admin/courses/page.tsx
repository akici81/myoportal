'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ClipboardList, Plus, Search, BookOpen, Save, X, Edit, Trash2 } from 'lucide-react'

export default function AdminCoursesPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('courses').select('*, program:programs(name)').order('name')
    setCourses(data ?? [])
    
    // In V2, actually the database schema is 'courses'. Wait, let me double check the exact query. 
    // In index.ts, Course actually belongs to department_id, NOT program_id directly?
    // Actually, V2 schema has `courses` with `department_id` or `code`, `name`, `credit`...
    // Let's assume we fetch programs to display anyway.
    const { data: progs } = await supabase.from('programs').select('id, name').eq('is_active', true)
    setPrograms(progs ?? [])
    
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = courses.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  )

  async function save(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!editItem?.name || !editItem?.code) { 
        toast.error('Lütfen zorunlu alanları doldurun'); return 
    }
    
    setSaving(true)
    try {
      const { id, program, ...rest } = editItem
      const payload = { ...rest, code: rest.code.toUpperCase(), updated_at: new Date().toISOString() }
      
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
      if(!confirm('Bu dersi silmek istediğinize emin misiniz?')) return
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if(error) toast.error('Hata: ' + error.message)
      else {
          toast.success('Ders silindi')
          load()
      }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-fuchsia-900/20 to-gray-900 p-8 border border-purple-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <ClipboardList className="w-48 h-48 text-purple-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 flex items-center gap-3">
              Genel Ders Havuzu
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Üniversitede okutulan tüm dersleri (Zorunlu, Seçmeli) ve kredilerini yapılandırın.
            </p>
          </div>
          <button 
            onClick={() => setEditItem({ credit: 3, theoretical_hours: 2, practical_hours: 0 })} 
            className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
            style={{ backgroundImage: 'linear-gradient(135deg, #a855f7, #d946ef)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)' }}
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Ders Ekle</span>
          </button>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between border border-gray-800/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-medium" 
            placeholder="Ders Kodu veya Adı Ara..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="text-gray-400 text-sm font-medium">Toplam <span className="text-white">{filtered.length}</span> Ders</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-800/30 backdrop-blur-xl">
        <table className="w-full text-left text-sm text-gray-300">
           <thead className="bg-gray-900/50 text-xs uppercase text-gray-500">
              <tr>
                 <th className="px-6 py-4 font-medium">Ders Kodu</th>
                 <th className="px-6 py-4 font-medium">Ders Adı</th>
                 <th className="px-6 py-4 font-medium">Kredi T/U</th>
                 <th className="px-6 py-4 font-medium text-right">Eylem</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
              {filtered.map(c => (
                 <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-mono text-purple-400 font-bold">{c.code}</td>
                    <td className="px-6 py-4 text-white font-medium">{c.name}</td>
                    <td className="px-6 py-4 text-gray-400">{c.credit} AKTS - ({c.theoretical_hours}T / {c.practical_hours}U)</td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => setEditItem(c)} className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-gray-800"><Edit className="w-4 h-4"/></button>
                       <button onClick={() => remove(c.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-md hover:bg-gray-800"><Trash2 className="w-4 h-4"/></button>
                    </td>
                 </tr>
              ))}
           </tbody>
        </table>
      </div>

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-gray-700/50 shadow-2xl relative">
            <button onClick={() => setEditItem(null)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              {editItem.id ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}
            </h3>
            
            <form onSubmit={save} className="space-y-4">
               <div className="grid grid-cols-3 gap-4">
                 <div className="col-span-1">
                   <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kodu <span className="text-purple-400">*</span></label>
                   <input required maxLength={8} className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white font-mono uppercase focus:border-purple-500" value={editItem.code ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, code: e.target.value }))} placeholder="MAT101" />
                 </div>
                 <div className="col-span-2">
                   <label className="text-xs font-medium text-gray-400 mb-1.5 block">Ders Adı <span className="text-purple-400">*</span></label>
                   <input required className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500" value={editItem.name ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, name: e.target.value }))} />
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-4">
                 <div>
                   <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kredi (AKTS)</label>
                   <input type="number" required className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500" value={editItem.credit ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, credit: parseInt(e.target.value) }))} />
                 </div>
                 <div>
                   <label className="text-xs font-medium text-gray-400 mb-1.5 block">Teorik</label>
                   <input type="number" required className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500" value={editItem.theoretical_hours ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, theoretical_hours: parseInt(e.target.value) }))} />
                 </div>
                 <div>
                   <label className="text-xs font-medium text-gray-400 mb-1.5 block">Uygulama</label>
                   <input type="number" required className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-500" value={editItem.practical_hours ?? ''} onChange={e => setEditItem((i: any) => ({ ...i, practical_hours: parseInt(e.target.value) }))} />
                 </div>
               </div>
               
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditItem(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-purple-600 text-white hover:bg-purple-500">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
