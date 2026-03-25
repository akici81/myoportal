'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus, Trash2, Search, Clock, CalendarOff, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Check, User, Info, Save, X, Settings2
} from 'lucide-react'
import clsx from 'clsx'

const DAYS = [
  { value: 1, label: 'Pazartesi', short: 'Pzt' },
  { value: 2, label: 'Salı', short: 'Sal' },
  { value: 3, label: 'Çarşamba', short: 'Çar' },
  { value: 4, label: 'Perşembe', short: 'Per' },
  { value: 5, label: 'Cuma', short: 'Cum' },
]

const CONSTRAINT_TYPES = [
  { value: 'unavailable_day', label: 'Gün Müsait Değil', icon: CalendarOff, color: '#ef4444', description: 'Tüm gün ders alamaz' },
  { value: 'unavailable_slot', label: 'Saat Müsait Değil', icon: Clock, color: '#f59e0b', description: 'Belirtilen saatlerde ders alamaz' },
  { value: 'max_daily_hours', label: 'Günlük Max Saat', icon: AlertTriangle, color: '#8b5cf6', description: 'Günde maks. X saat girebilir' },
  { value: 'prefer_day', label: 'Tercih Edilen Gün', icon: CheckCircle, color: '#10b981', description: 'Öncelikli tercih edilen günler' },
]

const COMMON_REASONS = ['Akademik izinli', 'Part-time çalışan', 'Başka kampüste görevli', 'İdari görev', 'Sağlık durumu', 'Ulaşım sorunu', 'Diğer']

interface Constraint {
  id: string
  instructor_id: string
  constraint_type: string
  day_of_week: number | null
  time_slot_id: string | null
  value: { max_hours?: number } | null
  is_hard: boolean
  reason: string | null
  created_at: string
  instructors?: { full_name: string; title: string }
  time_slots?: { slot_number: number; start_time: string; end_time: string }
}

interface Instructor {
  id: string; full_name: string; title: string; department_id: string
}

interface TimeSlot {
  id: string; slot_number: number; start_time: string; end_time: string
}

export default function InstructorConstraintsPage() {
  const supabase = createClient()
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  
  const [editForm, setEditForm] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [expandedInstructors, setExpandedInstructors] = useState<string[]>([])
  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null)
  const [departmentName, setDepartmentName] = useState<string>('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('department_id, departments!profiles_department_id_fkey(name)').eq('id', user.id).single()
    if (!profile?.department_id) {
       toast.error('Bağlı olduğunuz bölüm bulunamadı.')
       setLoading(false)
       return
    }

    setUserDepartmentId(profile.department_id)
    const depts = profile.departments as any
    setDepartmentName(depts?.name || '')

    const { data: instData } = await supabase.from('instructors').select('id, full_name, title, department_id').eq('department_id', profile.department_id).eq('is_active', true).order('full_name')

    if (instData) {
      setInstructors(instData)
      const ids = instData.map((i) => i.id)
      if (ids.length > 0) {
        const { data: constData } = await supabase.from('instructor_constraints').select('*, instructors(full_name, title), time_slots(slot_number, start_time, end_time)').in('instructor_id', ids).order('created_at', { ascending: false })
        setConstraints((constData as any) ?? [])
      }
    }

    const { data: slots } = await supabase.from('time_slots').select('*').order('slot_number')
    setTimeSlots(slots ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  const grouped = instructors.map((inst) => ({
      instructor: inst,
      items: constraints.filter((c) => c.instructor_id === inst.id),
  })).filter((g) => !search || g.instructor.full_name.toLowerCase().includes(search.toLowerCase()))

  const stats = {
    total: constraints.length,
    hard: constraints.filter((c) => c.is_hard).length,
    instructors: new Set(constraints.map((c) => c.instructor_id)).size,
  }

  function openModal(instId?: string) {
    setEditForm({ instructor_id: instId || '', constraint_type: 'unavailable_day', selected_days: [], selected_slots: [], max_hours: 6, is_hard: true, reason: '' })
    setShowModal(true)
  }

  function toggleDay(day: number) {
    setEditForm((p: any) => p ? { ...p, selected_days: p.selected_days.includes(day) ? p.selected_days.filter((d: number) => d !== day) : [...p.selected_days, day] } : null)
  }

  function toggleSlot(slotId: string) {
    setEditForm((p: any) => p ? { ...p, selected_slots: p.selected_slots.includes(slotId) ? p.selected_slots.filter((s: string) => s !== slotId) : [...p.selected_slots, slotId] } : null)
  }

  async function save() {
    if (!editForm?.instructor_id || !editForm?.constraint_type) return toast.error('Hoca ve kısıt tipi seçin')
    if ((editForm.constraint_type === 'unavailable_day' || editForm.constraint_type === 'prefer_day') && editForm.selected_days.length === 0) return toast.error('En az bir gün seçin')
    if (editForm.constraint_type === 'unavailable_slot' && (editForm.selected_days.length === 0 || editForm.selected_slots.length === 0)) return toast.error('Gün ve Saat dilimi seçin')

    setSaving(true)
    const payloads: any[] = []

    if (editForm.constraint_type === 'unavailable_day' || editForm.constraint_type === 'prefer_day') {
      editForm.selected_days.forEach((day: number) => {
        payloads.push({ instructor_id: editForm.instructor_id, constraint_type: editForm.constraint_type, day_of_week: day, time_slot_id: null, value: null, is_hard: editForm.constraint_type === 'unavailable_day' ? editForm.is_hard : false, reason: editForm.reason || null })
      })
    } else if (editForm.constraint_type === 'unavailable_slot') {
      editForm.selected_days.forEach((day: number) => {
        editForm.selected_slots.forEach((slotId: string) => {
          payloads.push({ instructor_id: editForm.instructor_id, constraint_type: editForm.constraint_type, day_of_week: day, time_slot_id: slotId, value: null, is_hard: editForm.is_hard, reason: editForm.reason || null })
        })
      })
    } else if (editForm.constraint_type === 'max_daily_hours') {
      payloads.push({ instructor_id: editForm.instructor_id, constraint_type: editForm.constraint_type, day_of_week: null, time_slot_id: null, value: { max_hours: editForm.max_hours }, is_hard: editForm.is_hard, reason: editForm.reason || null })
    }

    const { error } = await supabase.from('instructor_constraints').insert(payloads)
    if (error) toast.error('Kayıt hatası: ' + error.message)
    else { toast.success(`${payloads.length} adet kısıt kuralı eklendi`); setShowModal(false); loadData() }
    setSaving(false)
  }

  async function deleteConstraint(id: string) {
    const { error } = await supabase.from('instructor_constraints').delete().eq('id', id)
    if (error) toast.error('Silinirken hata oluştu')
    else { toast.success('Kısıt silindi'); loadData() }
  }

  return (
    <div className="space-y-6 animate-in">
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-violet-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <Settings2 className="w-48 h-48 text-violet-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20">{departmentName}</span>
            </div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              Öğretim Elemanı Kısıtları
            </h1>
            <p className="mt-2 text-gray-400 max-w-2xl font-medium">
              Bölümünüzdeki hocaların ders alamayacağı gün ve saatleri belirleyin. Bu kısıtlamalar <strong>Akıllı Otomatik Program (Auto-Schedule)</strong> aracı tarafından katı kurallar olarak işlenecektir.
            </p>
          </div>
          <button onClick={() => openModal()} className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, #8b5cf6, #d946ef)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>
            <Plus className="w-5 h-5" /> <span>Yeni Kısıt Kuralı Ekle</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card py-24 flex flex-col items-center justify-center rounded-2xl border border-gray-800/60">
          <div className="w-12 h-12 rounded-full border-4 border-violet-900 border-t-violet-500 animate-spin mb-4" />
          <p className="text-gray-400 font-medium tracking-wide">Kısıt kuralları derleniyor...</p>
        </div>
      ) : (
        <>
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card border border-gray-800/60 rounded-xl p-5 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                <User className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none mb-1">{instructors.length}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hoca</p>
              </div>
            </div>
            <div className="card border border-gray-800/60 rounded-xl p-5 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6 text-fuchsia-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-white leading-none mb-1">{stats.total}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Kısıt</p>
              </div>
            </div>
            <div className="card border border-gray-800/60 rounded-xl p-5 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                <CalendarOff className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-rose-400 leading-none mb-1">{stats.hard}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Zorunlu Kısıt</p>
              </div>
            </div>
            <div className="card border border-gray-800/60 rounded-xl p-5 flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-400 leading-none mb-1">{stats.total - stats.hard}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tercihi Kısıt</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
             <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex gap-3 flex-1">
                <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                <div>
                   <p className="text-sm font-bold text-violet-300 mb-1">Zorunlu ve Tercih Farkı</p>
                   <p className="text-xs text-violet-200/60 font-medium">Zorunlu kısıtlar sisteme kesinlikle işlenir. Tercihi kısıtlar esnektir, algoritma mümkün mertebe hocanın talebine uymaya çalışır ancak gerekirse o saatlere atama yapabilir.</p>
                </div>
             </div>
             <div className="relative min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Eğitmen Ara..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-3 bg-gray-900/50 border border-gray-700/50 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-violet-500 transition-colors" />
             </div>
          </div>

          {/* Accordion List */}
          <div className="space-y-3">
             {grouped.map(({ instructor, items }) => {
                const isExpanded = expandedInstructors.includes(instructor.id)
                const hasItems = items.length > 0

                return (
                   <div key={instructor.id} className="card overflow-hidden rounded-xl border border-gray-800/60 transition-all hover:border-gray-700/80">
                      <div className="p-4 flex flex-wrap items-center justify-between cursor-pointer group" onClick={() => hasItems && setExpandedInstructors(p => p.includes(instructor.id) ? p.filter(id => id !== instructor.id) : [...p, instructor.id])}>
                         
                         <div className="flex items-center gap-4">
                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm", hasItems ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-gray-800 border-gray-700 text-gray-500')}>
                               {instructor.full_name.charAt(0)}
                            </div>
                            <div>
                               <p className="font-bold text-gray-200 text-lg group-hover:text-white transition-colors">{instructor.title} {instructor.full_name}</p>
                               <div className="flex items-center gap-3 mt-1">
                                  {hasItems ? (
                                    <span className="text-xs font-semibold text-violet-400">{items.length} Geçerli Kural</span>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-500">Sınırlama Yok (Tam Müsait)</span>
                                  )}
                               </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-4 mt-3 sm:mt-0">
                            {hasItems && (
                               <div className="flex gap-2 mr-2">
                                  {items.filter(c => c.is_hard).length > 0 && <span className="text-[10px] px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold uppercase tracking-widest">{items.filter(c => c.is_hard).length} Zorunlu</span>}
                                  {items.filter(c => !c.is_hard).length > 0 && <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-widest">{items.filter(c => !c.is_hard).length} Tercih</span>}
                               </div>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); openModal(instructor.id) }} className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800/80 hover:bg-violet-600 hover:text-white text-gray-400 transition-colors border border-gray-700/50">
                               <Plus className="w-5 h-5" />
                            </button>
                            {hasItems && (
                               <div className={clsx("w-6 h-6 flex items-center justify-center rounded-full bg-gray-900/50 transition-transform", isExpanded && "rotate-180")}>
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                               </div>
                            )}
                         </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && hasItems && (
                         <div className="border-t border-gray-800/60 bg-gray-900/30 p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                               {items.map(c => {
                                  const tInfo = CONSTRAINT_TYPES.find(t => t.value === c.constraint_type)
                                  const Icon = tInfo?.icon || Info
                                  const dayLabel = c.day_of_week ? DAYS.find(d => d.value === c.day_of_week)?.label : null
                                  
                                  return (
                                     <div key={c.id} className="relative flex items-start gap-3 p-4 rounded-xl bg-gray-950/50 border border-gray-800/80 hover:border-gray-700 transition-colors group/item">
                                        <div className="mt-0.5 p-2 rounded-lg" style={{ backgroundColor: `${tInfo?.color}15`, color: tInfo?.color }}>
                                           <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 pr-10">
                                           <div className="flex items-center gap-2 mb-1">
                                              <p className="text-sm font-bold text-gray-300">{tInfo?.label}</p>
                                              <span className={clsx("text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider border", c.is_hard ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')}>{c.is_hard ? 'Zorunlu' : 'Tercih'}</span>
                                           </div>
                                           <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 font-medium">
                                              {dayLabel && <span className="text-gray-200"><span className="text-gray-500">Gün:</span> {dayLabel}</span>}
                                              {c.time_slots && <span className="text-indigo-300 bg-indigo-500/10 px-1.5 rounded"><span className="text-indigo-500">Saat:</span> {c.time_slots.start_time?.slice(0,5)} - {c.time_slots.end_time?.slice(0,5)}</span>}
                                              {c.value?.max_hours && <span className="text-fuchsia-300"><span className="text-fuchsia-500">Max Limit:</span> {c.value.max_hours} Saat</span>}
                                           </div>
                                           {c.reason && (
                                              <p className="mt-2 text-[11px] text-gray-500 border-l-2 border-gray-700 pl-2">Sebep: {c.reason}</p>
                                           )}
                                        </div>
                                        <button onClick={() => deleteConstraint(c.id)} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 text-gray-600 hover:text-rose-400 opacity-0 group-hover/item:opacity-50 transition-all">
                                           <Trash2 className="w-4 h-4" />
                                        </button>
                                     </div>
                                  )
                               })}
                            </div>
                         </div>
                      )}
                   </div>
                )
             })}
          </div>
        </>
      )}

      {/* Editor Modal */}
      {showModal && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in zoom-in-95 duration-200">
           <div className="card w-full max-w-2xl p-0 rounded-2xl border border-violet-900/30 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
              
              <div className="px-6 py-5 bg-cyan-600 border-b border-violet-900/40 flex justify-between items-center">
                 <h3 className="text-xl font-black text-white flex items-center gap-2">Yeni Kısıt Kuralı Yarat</h3>
                 <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-lg p-2 transition">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                 
                 <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Öğretim Elemanı Seçimi</label>
                    <select value={editForm.instructor_id} onChange={e => setEditForm((p:any) => ({...p, instructor_id: e.target.value}))} className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-violet-500 transition-colors form-select">
                       <option value="">— Hoca Seçin —</option>
                       {instructors.map((i) => <option key={i.id} value={i.id}>{i.title} {i.full_name}</option>)}
                    </select>
                 </div>

                 <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Kısıtlama Tipi</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {CONSTRAINT_TYPES.map(t => {
                          const isSel = editForm.constraint_type === t.value
                          const Icon = t.icon
                          return (
                             <button key={t.value} type="button" onClick={() => setEditForm((p:any)=>({...p, constraint_type: t.value, selected_days:[], selected_slots:[]}))} 
                                className={clsx("p-4 rounded-xl border text-left transition-all", isSel ? 'bg-violet-900/20 border-violet-500 ring-1 ring-violet-500/50' : 'bg-gray-900/30 border-gray-800 hover:border-gray-700')}>
                                <div className="flex items-center gap-3 mb-1">
                                   <div className="p-1.5 rounded-md" style={{ backgroundColor: `${t.color}20` }}><Icon className="w-4 h-4" style={{ color: t.color }}/></div>
                                   <span className={clsx("font-bold text-sm", isSel ? 'text-white' : 'text-gray-300')}>{t.label}</span>
                                </div>
                                <p className="text-xs text-gray-500 ml-10 leading-tight">{t.description}</p>
                             </button>
                          )
                       })}
                    </div>
                 </div>

                 {/* Day Selection */}
                 {(editForm.constraint_type === 'unavailable_day' || editForm.constraint_type === 'unavailable_slot' || editForm.constraint_type === 'prefer_day') && (
                    <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/80">
                       <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Uygulanacak Günler</label>
                          <button type="button" onClick={() => setEditForm((p:any)=>({...p, selected_days: p.selected_days.length === 5 ? [] : [1,2,3,4,5]}))} className="text-xs font-bold text-violet-400 hover:text-white transition-colors">
                            {editForm.selected_days.length === 5 ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                          </button>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {DAYS.map(d => {
                             const sel = editForm.selected_days.includes(d.value)
                             return (
                                <button key={d.value} type="button" onClick={() => toggleDay(d.value)} className={clsx("flex-1 px-3 py-2.5 rounded-lg border text-sm font-bold transition-all relative", sel ? 'bg-violet-600 border-violet-500 text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white')}>
                                   {d.label}
                                   {sel && <Check className="w-3.5 h-3.5 absolute top-1 right-1 opacity-50" />}
                                </button>
                             )
                          })}
                       </div>
                    </div>
                 )}

                 {/* Slot Selection */}
                 {editForm.constraint_type === 'unavailable_slot' && (
                    <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/80">
                       <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 block">Engellenecek Saat Dilimleri (Bloklar)</label>
                       <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {timeSlots.map(s => {
                             const sel = editForm.selected_slots.includes(s.id)
                             return (
                                <button key={s.id} type="button" onClick={() => toggleSlot(s.id)} className={clsx("px-3 py-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-between", sel ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700')}>
                                   <span>{s.slot_number}. Blok ({s.start_time?.slice(0,5)})</span>
                                   {sel && <Check className="w-3.5 h-3.5" />}
                                </button>
                             )
                          })}
                       </div>
                    </div>
                 )}

                 {/* Max Hours */}
                 {editForm.constraint_type === 'max_daily_hours' && (
                    <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800/80">
                       <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Gün Başına Maksimum Ders Saati</label>
                       <div className="flex items-center gap-4">
                          <input type="number" min={1} max={12} value={editForm.max_hours} onChange={e => setEditForm((p:any)=>({...p, max_hours: parseInt(e.target.value)||6}))} className="w-24 bg-gray-800 border-gray-600 rounded-lg px-4 py-2 text-white font-bold text-lg text-center focus:outline-none focus:border-violet-500"/>
                          <span className="text-sm font-medium text-gray-400">Saat / Gün (Önerilen default limit = 6)</span>
                       </div>
                    </div>
                 )}

                 {/* Type Modifier */}
                 {editForm.constraint_type !== 'prefer_day' && (
                    <div>
                       <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Yaptırım Seviyesi</label>
                       <div className="flex gap-3">
                          <button type="button" onClick={() => setEditForm((p:any)=>({...p, is_hard: true}))} className={clsx("flex-1 p-3 rounded-xl border text-sm font-bold text-center transition-all", editForm.is_hard ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/30' : 'bg-gray-900/50 border-gray-800 text-gray-500')}>
                             🔒 Kesin (Zorunlu Kurallar)
                          </button>
                          <button type="button" onClick={() => setEditForm((p:any)=>({...p, is_hard: false}))} className={clsx("flex-1 p-3 rounded-xl border text-sm font-bold text-center transition-all", !editForm.is_hard ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-gray-900/50 border-gray-800 text-gray-500')}>
                             💚 Öncelik (Tercihi Kurallar)
                          </button>
                       </div>
                    </div>
                 )}

                 {/* Reason */}
                 <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Kural / Kısıt Nedeni (Opsiyonel)</label>
                    <div className="flex gap-2 mb-3 overflow-x-auto custom-scrollbar pb-2">
                       {COMMON_REASONS.map(r => (
                          <button key={r} type="button" onClick={() => setEditForm((p:any)=>({...p, reason: r}))} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-300 whitespace-nowrap border border-gray-700/50 transition-colors">
                             {r}
                          </button>
                       ))}
                    </div>
                    <input type="text" value={editForm.reason} onChange={e => setEditForm((p:any)=>({...p, reason: e.target.value}))} placeholder="Örn: Rektörlük Yönetim Toplantısı" className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors" />
                 </div>
              </div>

              <div className="px-6 py-4 bg-gray-900/80 border-t border-gray-800/80 mt-auto flex gap-3">
                 <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl font-bold text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white transition flex-1">İptal, Sil</button>
                 <button onClick={save} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-[2] flex items-center justify-center gap-2 shadow-lg transition-all bg-cyan-600 hover:brightness-110 disabled:opacity-50">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{saving ? 'Kurallar İşleniyor...' : 'Veritabanına Kuralı Uygula'}</span>
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
