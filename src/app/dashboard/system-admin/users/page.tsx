'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Users, Plus, Edit, Search, Shield, Save, X, Mail, Phone, Building, RefreshCw } from 'lucide-react'
import { ROLE_META, type UserRole } from '@/types'

export default function UsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [depts, setDepts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '', password: '', full_name: '', username: '',
    role: 'instructor' as UserRole, department_id: '', title: '', phone: ''
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('profiles')
      .select('*, departments!profiles_department_id_fkey(name)')
      .order('full_name')
    if (error) console.error('profiles query error:', error)
    setUsers(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])
  
  useEffect(() => {
    supabase.from('departments').select('id,name').eq('is_active', true).order('name')
      .then(({ data }) => setDepts(data ?? []))
  }, [supabase])

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
  })

  async function createUser(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!newUser.email || !newUser.password || !newUser.full_name || !newUser.role) {
      toast.error('E-posta, şifre, ad soyad ve rol zorunlu')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, department_id: newUser.department_id || null })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      
      toast.success('Kullanıcı başarıyla oluşturuldu')
      setShowNew(false)
      setNewUser({ email: '', password: '', full_name: '', username: '', role: 'instructor', department_id: '', title: '', phone: '' })
      load()
    } catch (err: any) {
      toast.error('Hata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!editUser?.full_name) { 
      toast.error('Ad Soyad gerekli')
      return 
    }
    setSaving(true)
    try {
      // departments ilişkisel objesini update'e göndermemek için çıkarıyoruz
      const { id, departments: _, created_at, updated_at, ...rest } = editUser
      const { error } = await supabase.from('profiles').update({
        ...rest, updated_at: new Date().toISOString()
      }).eq('id', id)
      
      if (error) throw error
      
      toast.success('Kullanıcı başarıyla güncellendi')
      setEditUser(null)
      load()
    } catch (err: any) {
      toast.error('Güncellenemedi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function syncInstructors() {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/sync-instructors', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success(`${json.synced} yeni hoca eklendi, ${json.linked} kayıt bağlandı.`)
      // Refresh the list to show new data if needed
      load()
    } catch (err: any) {
      toast.error('Senkronizasyon hatası: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  const roleOrder: UserRole[] = ['system_admin','mudur','mudur_yardimcisi','sekreter','bolum_baskani','instructor']

  return (
    <div className="space-y-6 animate-in">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-cyan-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <Users className="w-48 h-48 text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-cyan-600">
              Kullanıcı Yönetimi
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              MYO Portal altyapısındaki tüm kullanıcıları görüntüleyin, yetkilendirin ve yeni kullanıcılar atayın.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={syncInstructors}
              disabled={syncing}
              className="px-4 py-3 rounded-xl card border text-gray-300 hover:text-white hover:bg-gray-700 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Hocaları Senkronize Et</span>
            </button>
            <button 
              onClick={() => setShowNew(true)} 
              className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Kullanıcı Ekle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Summary Cards (Stats) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {roleOrder.map((r, i) => {
          const meta = ROLE_META[r]
          const count = users.filter(u => u.role === r).length
          return (
            <div 
              key={r} 
              className={`stat-card relative overflow-hidden animate-in-delay-${(i % 3) + 1}`}
              style={{ '--topBar': meta.color } as any}
            >
              <div className="text-center py-2">
                <div className="text-3xl font-bold" style={{ color: meta.color }}>
                  {loading ? '...' : count}
                </div>
                <div className="text-xs font-medium text-gray-400 mt-1">
                  {meta.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Table Container */}
      <div className="card overflow-hidden border rounded-xl">
        {/* Toolbar */}
        <div className="p-4 border-b card flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              className="w-full card/50 border rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all font-medium" 
              placeholder="Ad, Soyad, e-posta veya @kullanici_adi..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="text-xs text-gray-500 font-medium px-3">
            Toplam {filtered.length} kullanıcı
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="card/40 text-xs uppercase text-gray-400 border-b">
              <tr>
                <th className="px-6 py-4 font-medium tracking-wider">Kullanıcı</th>
                <th className="px-6 py-4 font-medium tracking-wider">Yetki Rolü</th>
                <th className="px-6 py-4 font-medium tracking-wider">Bağlı Bölüm</th>
                <th className="px-6 py-4 font-medium tracking-wider">Durum</th>
                <th className="px-6 py-4 font-medium tracking-wider text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                Array.from({length: 5}).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 card/50 rounded-lg w-48" /></td>
                    <td className="px-6 py-4"><div className="h-6 card/50 rounded-full w-24" /></td>
                    <td className="px-6 py-4"><div className="h-4 card/50 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-6 card/50 rounded-full w-16" /></td>
                    <td className="px-6 py-4"><div className="h-8 card/50 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="inline-flex items-center justify-center p-4 card/30 rounded-full mb-3">
                      <Search className="h-6 w-6 text-gray-500" />
                    </div>
                    <p className="text-gray-400 font-medium">Böyle bir kullanıcı bulunamadı</p>
                    <p className="text-xs text-gray-500 mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin</p>
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const meta = ROLE_META[u.role as UserRole] ?? ROLE_META.instructor
                  return (
                    <tr key={u.id} className="hover:card/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-inner"
                            style={{ background: `linear-gradient(135deg, ${meta.color}20, ${meta.color}10)`, color: meta.color, border: `1px solid ${meta.color}30` }}
                          >
                            {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-200">
                              {u.title && <span className="text-gray-500 mr-1">{u.title}</span>}
                              {u.full_name || 'İsimsiz'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex flex-col sm:flex-row sm:gap-3">
                              <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {u.email}</span>
                              <span className="flex items-center gap-1.5 font-mono">@{u.username || '—'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border"
                          style={{ background: meta.color+'15', color: meta.color, borderColor: meta.color+'30' }}
                        >
                          <Shield className="w-3 h-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Building className="w-4 h-4 text-gray-500" />
                          <span className="truncate max-w-[200px]">{u.departments?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${u.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                          {u.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setEditUser(u)} 
                          className="p-2 rounded-lg card text-gray-400 hover:text-cyan-400 hover:bg-gray-700 transition duration-200 opacity-0 group-hover:opacity-50"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Yeni Kullanıcı Modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in">
          <div className="card w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative">
            <button onClick={() => setShowNew(false)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:card transition">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <div className="p-2 bg-cyan-600 rounded-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              Yeni Kullanıcı
            </h3>
            <p className="text-sm text-gray-400 mb-6 font-medium">Sisteme yeni bir yetkili veya personel tanımlayın.</p>
            
            <form onSubmit={createUser} className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Unvan</label>
                  <input className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="Dr., Prof." value={newUser.title} onChange={e => setNewUser(u => ({...u, title: e.target.value}))} />
                </div>
                <div className="col-span-8">
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Ad Soyad <span className="text-cyan-400">*</span></label>
                  <input className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="Ahmet Yılmaz" required value={newUser.full_name} onChange={e => setNewUser(u => ({...u, full_name: e.target.value}))} />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kurumsal E-posta <span className="text-cyan-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="email" required className="w-full card border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="ahmet@rumeli.edu.tr" value={newUser.email} onChange={e => setNewUser(u => ({...u, email: e.target.value}))} />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Geçici Şifre <span className="text-cyan-400">*</span></label>
                <input type="password" required className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" placeholder="En az 8 karakter" value={newUser.password} onChange={e => setNewUser(u => ({...u, password: e.target.value}))} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Yetki Rolü <span className="text-cyan-400">*</span></label>
                  <select className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors form-select appearance-none" value={newUser.role} onChange={e => setNewUser(u => ({...u, role: e.target.value as UserRole}))}>
                    {(Object.keys(ROLE_META) as UserRole[]).map(r => (
                      <option key={r} value={r}>{ROLE_META[r].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Bağlı Bölüm</label>
                  <select className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors form-select appearance-none" value={newUser.department_id} onChange={e => setNewUser(u => ({...u, department_id: e.target.value}))}>
                    <option value="">— Genel Merkez / Yok —</option>
                    {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2.5 rounded-lg font-medium text-sm text-gray-400 card hover:bg-gray-700 hover:text-white transition flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-glow px-4 py-2.5 text-sm font-medium flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" /> }
                  {saving ? 'Kaydediliyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in">
          <div className="card w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative">
            <button onClick={() => setEditUser(null)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:card transition">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              Kullanıcıyı Düzenle
            </h3>
            <p className="text-sm text-gray-400 mb-6 font-medium">@{editUser.username || ''} hesabının ayarlarını güncelleyin.</p>
            
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Unvan</label>
                  <input className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" value={editUser.title ?? ''} onChange={e=>setEditUser((u:any)=>({...u,title:e.target.value}))} />
                </div>
                <div className="col-span-8">
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Ad Soyad <span className="text-cyan-400">*</span></label>
                  <input className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" required value={editUser.full_name ?? ''} onChange={e=>setEditUser((u:any)=>({...u,full_name:e.target.value}))} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kullanıcı Adı</label>
                  <input className="w-full font-mono card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" value={editUser.username ?? ''} onChange={e=>setEditUser((u:any)=>({...u,username:e.target.value.toLowerCase()}))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input className="w-full card border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors" value={editUser.phone ?? ''} onChange={e=>setEditUser((u:any)=>({...u,phone:e.target.value}))} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Yetki Rolü</label>
                  <select className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors form-select appearance-none" value={editUser.role ?? 'instructor'} onChange={e=>setEditUser((u:any)=>({...u,role:e.target.value}))}>
                    {(Object.keys(ROLE_META) as UserRole[]).map(r => (
                      <option key={r} value={r}>{ROLE_META[r].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Bölüm</label>
                  <select className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors form-select appearance-none" value={editUser.department_id ?? ''} onChange={e=>setEditUser((u:any)=>({...u,department_id:e.target.value||null}))}>
                    <option value="">— Genel Merkez / Yok —</option>
                    {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={editUser.is_active ?? true} onChange={e=>setEditUser((u:any)=>({...u,is_active:e.target.checked}))} />
                  <div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ms-3 text-sm font-medium text-gray-300">Bu hesap aktif mi? ({editUser.is_active ? 'Evet' : 'Hayır, Pasif'})</span>
                </label>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditUser(null)} className="px-4 py-2.5 rounded-lg font-medium text-sm text-gray-400 card hover:bg-gray-700 hover:text-white transition flex-1">İptal</button>
                <button type="submit" disabled={saving} className="px-4 py-2.5 rounded-lg text-sm font-medium text-white flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:brightness-110 shadow-lg transition-all">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-4 h-4" /> }
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
