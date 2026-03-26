'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Search,
  Clock,
  CalendarOff,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  ClipboardList,
  Filter,
  UserX,
  ShieldCheck,
  ShieldAlert,
  CalendarDays
} from 'lucide-react'
import clsx from 'clsx'
import type { Instructor, TimeSlot } from '@/types'

const DAYS = [
  { value: 1, label: 'Pazartesi', short: 'Pzt' },
  { value: 2, label: 'Salı', short: 'Sal' },
  { value: 3, label: 'Çarşamba', short: 'Çar' },
  { value: 4, label: 'Perşembe', short: 'Per' },
  { value: 5, label: 'Cuma', short: 'Cum' },
]

const CONSTRAINT_TYPES = [
  { value: 'unavailable_day', label: 'Gün Müsait Değil', icon: CalendarOff, color: '#ef4444' },
  { value: 'unavailable_slot', label: 'Saat Müsait Değil', icon: Clock, color: '#f59e0b' },
  { value: 'max_daily_hours', label: 'Günlük Max Saat', icon: AlertTriangle, color: '#8b5cf6' },
  { value: 'prefer_morning', label: 'Sabah Tercih', icon: CheckCircle, color: '#10b981' },
]

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
  instructors?: { full_name: string; title: string; department_name?: string }
  time_slots?: { slot_number: number; start_time: string; end_time: string }
}

interface EditForm {
  instructor_id: string
  constraint_type: string
  selected_days: number[]
  selected_slots: string[]
  max_hours: number
  is_hard: boolean
  reason: string
}

export default function ConstraintsPage() {
  const supabase = createClient()
  const [constraints, setConstraints] = useState<Constraint[]>([])
  // For UI, we expand Instructor with department_name just for listing
  const [instructors, setInstructors] = useState<Array<Instructor & { department_name?: string }>>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterInstructor, setFilterInstructor] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedInstructors, setExpandedInstructors] = useState<string[]>([])

  const loadConstraints = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('instructor_constraints')
      .select('*, instructors(full_name, title), time_slots(slot_number, start_time, end_time)')
      .order('created_at', { ascending: false })
    if (error) toast.error('Kısıtlar yüklenemedi: ' + error.message)
    else setConstraints((data as unknown as Constraint[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadConstraints()

    supabase
      .from('instructors')
      .select(
        'id, full_name, title, department_id, is_active, created_at, user_id, email, departments!instructors_department_id_fkey(name)'
      )
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            email: row.email,
            created_at: row.created_at,
            is_active: row.is_active,
            full_name: row.full_name,
            title: row.title,
            department_id: row.department_id,
            department_name: row.departments?.name || 'Bölüm Yok',
          }))
          setInstructors(mapped)
        }
      })

    supabase
      .from('time_slots')
      .select('*')
      .order('slot_number')
      .then(({ data }) => setTimeSlots((data as unknown as TimeSlot[]) ?? []))
  }, [loadConstraints, supabase])

  const grouped = instructors
    .map((inst) => ({
      instructor: inst,
      items: constraints.filter((c) => c.instructor_id === inst.id),
    }))
    // We want to list all instructors if they have items or if they exactly match the filter.
    // However, usually we just show those WITH items unless filtering
    .filter((g) => g.items.length > 0 || filterInstructor === g.instructor.id)
    .filter((g) => !search || g.instructor.full_name.toLowerCase().includes(search.toLowerCase()))
    .filter((g) => !filterType || g.items.some((c) => c.constraint_type === filterType))

  const stats = {
    total: constraints.length,
    hard: constraints.filter((c) => c.is_hard).length,
    instructors: new Set(constraints.map((c) => c.instructor_id)).size,
  }

  function openModal(instructorId?: string) {
    setEditForm({
      instructor_id: instructorId || '',
      constraint_type: 'unavailable_day',
      selected_days: [],
      selected_slots: [],
      max_hours: 6,
      is_hard: true,
      reason: '',
    })
    setShowModal(true)
  }

  function toggleDay(day: number) {
    if (!editForm) return
    setEditForm((prev) => {
      if (!prev) return null
      const days = prev.selected_days.includes(day)
        ? prev.selected_days.filter((d) => d !== day)
        : [...prev.selected_days, day]
      return { ...prev, selected_days: days }
    })
  }

  function toggleSlot(slotId: string) {
    if (!editForm) return
    setEditForm((prev) => {
      if (!prev) return null
      const slots = prev.selected_slots.includes(slotId)
        ? prev.selected_slots.filter((s) => s !== slotId)
        : [...prev.selected_slots, slotId]
      return { ...prev, selected_slots: slots }
    })
  }

  function selectAllDays() {
    if (!editForm) return
    const allSelected = editForm.selected_days.length === 5
    setEditForm((prev) =>
      prev ? { ...prev, selected_days: allSelected ? [] : [1, 2, 3, 4, 5] } : null
    )
  }

  function selectAllSlots() {
    if (!editForm) return
    const allSelected = editForm.selected_slots.length === timeSlots.length
    setEditForm((prev) =>
      prev ? { ...prev, selected_slots: allSelected ? [] : timeSlots.map((s) => s.id) } : null
    )
  }

  async function save() {
    if (!editForm?.instructor_id || !editForm?.constraint_type) {
      toast.error('Hoca ve kısıt tipi seçin')
      return
    }

    if (editForm.constraint_type === 'unavailable_day' && editForm.selected_days.length === 0) {
      toast.error('En az bir gün seçin')
      return
    }
    if (editForm.constraint_type === 'unavailable_slot') {
      if (editForm.selected_days.length === 0) {
        toast.error('En az bir gün seçin')
        return
      }
      if (editForm.selected_slots.length === 0) {
        toast.error('En az bir saat dilimi seçin')
        return
      }
    }

    setSaving(true)

    const payloads: Array<{
      instructor_id: string
      constraint_type: string
      day_of_week: number | null
      time_slot_id: string | null
      value: { max_hours: number } | null
      is_hard: boolean
      reason: string | null
    }> = []

    if (editForm.constraint_type === 'unavailable_day') {
      for (const day of editForm.selected_days) {
        payloads.push({
          instructor_id: editForm.instructor_id,
          constraint_type: editForm.constraint_type,
          day_of_week: day,
          time_slot_id: null,
          value: null,
          is_hard: editForm.is_hard,
          reason: editForm.reason || null,
        })
      }
    } else if (editForm.constraint_type === 'unavailable_slot') {
      for (const day of editForm.selected_days) {
        for (const slotId of editForm.selected_slots) {
          payloads.push({
            instructor_id: editForm.instructor_id,
            constraint_type: editForm.constraint_type,
            day_of_week: day,
            time_slot_id: slotId,
            value: null,
            is_hard: editForm.is_hard,
            reason: editForm.reason || null,
          })
        }
      }
    } else if (editForm.constraint_type === 'max_daily_hours') {
      payloads.push({
        instructor_id: editForm.instructor_id,
        constraint_type: editForm.constraint_type,
        day_of_week: null,
        time_slot_id: null,
        value: { max_hours: editForm.max_hours },
        is_hard: editForm.is_hard,
        reason: editForm.reason || null,
      })
    } else {
      payloads.push({
        instructor_id: editForm.instructor_id,
        constraint_type: editForm.constraint_type,
        day_of_week: null,
        time_slot_id: null,
        value: null,
        is_hard: editForm.is_hard,
        reason: editForm.reason || null,
      })
    }

    const { error } = await supabase.from('instructor_constraints').insert(payloads)

    if (error) {
      toast.error('Kaydedilemedi: ' + error.message)
    } else {
      toast.success(`Sisteme başarıyla ${payloads.length} kısıt kuralı eklendi`)
      setShowModal(false)
      setEditForm(null)
      loadConstraints()
    }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('DİKKAT: Bu kısıtı silmek istediğinizden emin misiniz?')) return
    const { error } = await supabase.from('instructor_constraints').delete().eq('id', id)
    if (error) toast.error('Silinemedi')
    else {
      toast.success('Kısıt kuralı sistemden kaldırıldı')
      loadConstraints()
    }
  }

  function getLabel(c: Constraint) {
    const day = DAYS.find((d) => d.value === c.day_of_week)
    if (c.constraint_type === 'unavailable_day') return `${day?.label || '?'} günleri tamamen kapalı`
    if (c.constraint_type === 'unavailable_slot')
      return `${day?.short || '?'} ${c.time_slots?.start_time?.slice(0, 5) || '?'}-${c.time_slots?.end_time?.slice(0, 5) || '?'} arası bloklu`
    if (c.constraint_type === 'max_daily_hours')
      return `Bir günde en fazla ${c.value?.max_hours || '?'} saat ders verebilir`
    return CONSTRAINT_TYPES.find((t) => t.value === c.constraint_type)?.label || c.constraint_type
  }

  function getType(type: string) {
    return CONSTRAINT_TYPES.find((t) => t.value === type) || CONSTRAINT_TYPES[0]
  }

  const noConstraints = instructors.filter(
    (i) => !constraints.some((c) => c.instructor_id === i.id)
  )

  function getRecordCount(): number {
    if (!editForm) return 0
    if (editForm.constraint_type === 'unavailable_day') {
      return editForm.selected_days.length
    }
    if (editForm.constraint_type === 'unavailable_slot') {
      return editForm.selected_days.length * editForm.selected_slots.length
    }
    return 1
  }

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-violet-800/30">
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none">
          <ClipboardList className="w-48 h-48 text-violet-400" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Öğretim Elemanı Kısıtları Özeti
            </h1>
            <p className="mt-2 text-gray-400 leading-relaxed">
              Tüm bölümlerdeki öğretim görevlilerinin ders verebilme (kapalı gün/saat, maksimum saat vd.) kuralları buradan incelenip yönetilebilir. Yalnızca kısıt tanımlanan hocalar analiz motoru tarafından dikkate alınır.
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="btn-glow inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50 shrink-0"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>Merkezi Kısıt Ekle</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 rounded-2xl border flex items-center gap-4 bg-gradient-to-br from-gray-800/20 to-transparent">
          <div className="w-14 h-14 rounded-full card flex items-center justify-center border text-gray-400 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Aktif Kural Sayısı</p>
            <p className="text-3xl font-black text-white mt-1">{stats.total}</p>
          </div>
        </div>

        <div className="card p-6 rounded-2xl border flex items-center gap-4 border-red-500/10 bg-gradient-to-br from-red-900/10 to-transparent">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <p className="text-red-400/80 text-xs font-semibold uppercase tracking-wider">Zorunlu Kurallar</p>
            <p className="text-3xl font-black text-white mt-1">{stats.hard}</p>
          </div>
        </div>

        <div className="card p-6 rounded-2xl border flex items-center gap-4 border-blue-500/10 bg-gradient-to-br from-blue-900/10 to-transparent">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <UserX className="w-7 h-7" />
          </div>
          <div>
            <p className="text-blue-400/80 text-xs font-semibold uppercase tracking-wider">Kısıtlı Eğitmen</p>
            <p className="text-3xl font-black text-white mt-1">{stats.instructors}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Data view */}
        <div className="lg:w-2/3 space-y-6">
          <div className="card p-4 rounded-2xl border card flex flex-wrap gap-4 items-center justify-between">
             <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  className="w-full bg-gray-950/50 border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors shadow-inner placeholder:text-gray-600"
                  placeholder="Eğitmen adına göre hızla ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             
             <div className="flex items-center gap-3">
               <div className="relative">
                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                 <select
                    className="w-48 bg-gray-950/50 border rounded-xl pl-10 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors shadow-inner appearance-none cursor-pointer"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">Tüm Kısıt Tipleri</option>
                    {CONSTRAINT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
               </div>
               <select
                  className="w-48 bg-gray-950/50 border rounded-xl pl-4 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors shadow-inner appearance-none cursor-pointer"
                  value={filterInstructor}
                  onChange={(e) => setFilterInstructor(e.target.value)}
                >
                  <option value="">Spesifik Arama (Yok)</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>{i.title} {i.full_name}</option>
                  ))}
               </select>
             </div>
          </div>

          <div className="space-y-4">
            {loading ? (
               <div className="card border rounded-2xl p-16 flex flex-col items-center justify-center text-gray-500 animate-pulse">
                 <ClipboardList className="w-12 h-12 mb-4 opacity-50" />
                 <p>Kısıtlar veritabanından getiriliyor...</p>
               </div>
            ) : grouped.length === 0 ? (
               <div className="card border border-dashed card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                 <div className="w-20 h-20 card/80 rounded-full flex items-center justify-center mb-6 shadow-inner">
                   <CalendarOff className="w-10 h-10 text-gray-500" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">
                   {search || filterInstructor || filterType ? 'Bulgu Yok' : 'Henüz Kısıt Bulunmuyor'}
                 </h3>
                 <p className="text-gray-400 max-w-sm mb-6">
                   {search || filterInstructor || filterType 
                     ? 'Arama / filtreleme kriterlerinize uygun hiçbir sonuç bulunamadı.' 
                     : 'Veritabanında herhangi bir eğitmene ait öğretim kısıtı veya ajanda tanımlı değil.'}
                 </p>
                 {!(search || filterInstructor || filterType) && (
                    <button onClick={() => openModal()} className="btn-glow inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600/20 border border-violet-500/30 px-5 py-2 text-sm font-semibold text-violet-300 transition-all hover:bg-violet-600/30">
                      <Plus className="w-4 h-4" /> Kural Oluştur
                    </button>
                 )}
               </div>
            ) : (
               <div className="space-y-3">
                 {grouped.map(({ instructor, items }) => {
                   const open = expandedInstructors.includes(instructor.id)
                   const hardCount = items.filter((c) => c.is_hard).length
                   
                   return (
                     <div key={instructor.id} className="card rounded-2xl border overflow-hidden transition-all duration-300 group hover:border-violet-500/30">
                       <div 
                         onClick={() => setExpandedInstructors((p) =>
                           p.includes(instructor.id) ? p.filter((x) => x !== instructor.id) : [...p, instructor.id]
                         )}
                         className={clsx(
                           "w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors",
                           open ? "card/20" : "hover:card/10"
                         )}
                       >
                         <div className="flex items-center gap-4">
                           <div className="shrink-0 flex items-center justify-center">
                              <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300",
                                open ? "bg-violet-500/20 text-violet-400 rotate-180" : "card text-gray-500 group-hover:bg-gray-700"
                              )}>
                                <ChevronDown className="w-5 h-5" />
                              </div>
                           </div>
                           
                           <div className="w-12 h-12 rounded-xl bg-cyan-600 border border-violet-500/30 flex items-center justify-center shrink-0 shadow-inner">
                             <span className="text-xl font-black text-violet-400">
                               {instructor.full_name?.charAt(0)}
                             </span>
                           </div>
                           
                           <div>
                             <p className="text-base font-bold text-white group-hover:text-violet-200 transition-colors">
                               {instructor.title} {instructor.full_name}
                             </p>
                             <p className="text-xs text-gray-400 mt-0.5">{instructor.department_name}</p>
                           </div>
                         </div>
                         
                         <div className="flex items-center gap-3 pl-16 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0">
                            {hardCount > 0 && (
                               <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                                 <ShieldAlert className="w-3.5 h-3.5" /> {hardCount} Zorunlu
                               </span>
                            )}
                            <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded card border text-gray-300">
                               {items.length} Kural
                            </span>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openModal(instructor.id)
                              }}
                              title="Bu Hocaya Yeni Kısıt Ekle"
                              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-violet-500/20 text-violet-400 border border-transparent hover:border-violet-500/30 transition-colors shrink-0 outline-none"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                         </div>
                       </div>
                       
                       {/* Expanded Content */}
                       <div className={clsx(
                         "grid grid-rows-[0fr] transition-all duration-300",
                         open ? "grid-rows-[1fr] opacity-50" : "opacity-0"
                       )}>
                          <div className="overflow-hidden">
                             <div className="p-4 border-t card space-y-2">
                               {items.map((c) => {
                                 const t = getType(c.constraint_type)
                                 const Icon = t.icon
                                 return (
                                   <div
                                     key={c.id}
                                     className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border card shadow-inner hover:border-gray-700 transition-colors gap-4"
                                   >
                                     <div className="flex items-start sm:items-center gap-4">
                                       <div 
                                         className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border"
                                         style={{ background: t.color + '10', borderColor: t.color + '30' }}
                                       >
                                         <Icon className="w-5 h-5 flex-shrink-0" style={{ color: t.color }} />
                                       </div>
                                       <div>
                                         <h4 className="text-sm font-semibold text-gray-200">{getLabel(c)}</h4>
                                         {c.reason && (
                                            <p className="text-xs text-gray-500 mt-0.5">{c.reason}</p>
                                         )}
                                       </div>
                                     </div>
                                     
                                     <div className="flex items-center gap-3 pl-14 sm:pl-0">
                                        <span className={clsx(
                                          "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1",
                                          c.is_hard 
                                            ? "bg-red-500/10 border-red-500/20 text-red-400" 
                                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        )}>
                                          {c.is_hard ? 'ZORUNLU' : 'TERCİH'}
                                        </span>
                                        <button
                                          onClick={() => remove(c.id)}
                                          title="Kısıtı Kaldır"
                                          className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                     </div>
                                   </div>
                                 )
                               })}
                             </div>
                          </div>
                       </div>
                     </div>
                   )
                 })}
               </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Insights & Quick Add */}
        <div className="lg:w-1/3 space-y-6">
          <div className="card p-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-700"></div>
            
            <div className="flex flex-col gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30 shadow-inner">
                <CheckCircle className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Müsait Hocalar</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Zaman çizelgesine veya gün planlamasına dair sisteme herhangi bir kısıt veya tercih bildirmemiş, tamamen müsait görünen hocalar.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {!loading && noConstraints.length === 0 ? (
                <div className="p-4 rounded-xl card border text-center text-sm text-gray-500">
                  Şu anda sistemdeki tüm eğitmenlerin en az 1 kısıtı var.
                </div>
              ) : (
                noConstraints.slice(0, 8).map((i) => (
                  <button
                    key={i.id}
                    onClick={() => openModal(i.id)}
                    className="w-full text-left relative overflow-hidden flex items-center justify-between p-3 rounded-xl border card hover:bg-violet-500/10 hover:border-violet-500/30 transition-all group/btn"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-300 group-hover/btn:text-white transition-colors">
                        {i.title} {i.full_name}
                      </span>
                    </div>
                    <Plus className="w-4 h-4 text-gray-600 group-hover/btn:text-violet-400 transition-colors" />
                  </button>
                ))
              )}
              {!loading && noConstraints.length > 8 && (
                <p className="text-xs text-center text-gray-500 mt-3 italic">
                  + {noConstraints.length - 8} hoca daha
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Modal */}
      {showModal && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !saving && setShowModal(false)}></div>
          
          <div className="card w-full max-w-2xl card rounded-2xl border shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b card flex items-center justify-between shrink-0">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                </div>
                Merkezi Yeni Kural Ekle
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:card transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Instructor Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Kural Kimin İçin Eğitmen Seçin</label>
                <select
                  className="w-full bg-gray-950/50 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors appearance-none cursor-pointer"
                  value={editForm.instructor_id}
                  disabled={saving}
                  onChange={(e) =>
                    setEditForm((p) => (p ? { ...p, instructor_id: e.target.value } : null))
                  }
                >
                  <option value="">— Eğitmen Seçimi Yapın —</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title} {i.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Constraint Type */}
              <div className="space-y-2 border-t pt-6">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Uygulanacak Kısıt/Kural Türü</label>
                <div className="grid grid-cols-2 gap-3">
                  {CONSTRAINT_TYPES.map((t) => {
                    const Icon = t.icon
                    const isSelected = editForm.constraint_type === t.value
                    return (
                      <button
                        key={t.value}
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          setEditForm((p) =>
                            p ? { ...p, constraint_type: t.value, selected_days: [], selected_slots: [] } : null
                          )
                        }
                        className={clsx(
                          'p-3 rounded-xl border flex flex-col items-start gap-2 transition-all h-20 justify-center group',
                          isSelected
                            ? 'bg-violet-500/10 border-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                            : 'card hover:border-gray-600'
                        )}
                      >
                        <Icon className="w-5 h-5" style={{ color: isSelected ? t.color : '#64748b' }} />
                        <span className={clsx("text-sm font-semibold", isSelected ? "text-white" : "text-gray-400 group-hover:text-gray-300")}>{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Dynamic Day/Slot Selection */}
              {(editForm.constraint_type === 'unavailable_day' || editForm.constraint_type === 'unavailable_slot') && (
                <div className="space-y-2 border-t pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Hangi Günler Uygulanacak?
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={selectAllDays}
                      className="text-xs font-semibold text-violet-400 hover:text-violet-300 px-2 py-1 rounded bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                    >
                      {editForm.selected_days.length === 5 ? 'Hiçbirini Seçme' : 'Haftanın Tümü'}
                    </button>
                  </div>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    {DAYS.map((d) => {
                      const selected = editForm.selected_days.includes(d.value)
                      return (
                        <button
                          key={d.value}
                          type="button"
                          disabled={saving}
                          onClick={() => toggleDay(d.value)}
                          className={clsx(
                            'flex-1 min-w-[60px] py-2.5 rounded-xl border text-sm font-medium transition-all relative',
                            selected
                              ? 'border-violet-500 bg-violet-500/20 text-white shadow-inner'
                              : 'border-gray-800 card text-gray-400 hover:border-gray-600 hover:card'
                          )}
                        >
                          {d.label}
                          {selected && <Check className="w-3.5 h-3.5 absolute top-1.5 right-1.5 text-violet-400" />}
                        </button>
                      )
                    })}
                  </div>
                  {editForm.selected_days.length > 0 && (
                    <p className="text-xs mt-2 text-violet-400 px-1">
                      Algoritma seçili {editForm.selected_days.length} gün boyunca kural işletecektir.
                    </p>
                  )}
                </div>
              )}

              {editForm.constraint_type === 'unavailable_slot' && (
                <div className="space-y-2 border-t pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Hangi Saat Dilimleri (Seçili Günlerde) Bloklu?
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={selectAllSlots}
                      className="text-xs font-semibold text-violet-400 hover:text-violet-300 px-2 py-1 rounded bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
                    >
                      {editForm.selected_slots.length === timeSlots.length ? 'Hiçbirini Seçme' : 'Tüm Slotlar'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                    {timeSlots.map((s) => {
                      const selected = editForm.selected_slots.includes(s.id)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={saving}
                          onClick={() => toggleSlot(s.id)}
                          className={clsx(
                            'p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between group',
                            selected
                              ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                              : 'border-gray-800 card hover:border-gray-600 hover:card'
                          )}
                        >
                          <span className={selected ? "text-amber-400" : "text-gray-400"}>
                            {s.slot_number}. Blok <span className="opacity-60 text-xs ml-1">({s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)})</span>
                          </span>
                          <div className={clsx(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            selected ? "bg-amber-500 border-amber-500 text-gray-900" : "border-gray-600 group-hover:border-gray-500"
                          )}>
                             {selected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {editForm.constraint_type === 'max_daily_hours' && (
                <div className="space-y-2 border-t pt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Günlük En Çok Girilebilecek Toplam Saat</label>
                  <input
                    type="number"
                    className="w-full bg-gray-950/50 border rounded-xl px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors shadow-inner w-[120px]"
                    min={1}
                    max={10}
                    disabled={saving}
                    value={editForm.max_hours}
                    onChange={(e) =>
                      setEditForm((p) => p ? { ...p, max_hours: parseInt(e.target.value) || 6 } : null)
                    }
                  />
                </div>
              )}

              {/* Constraint Nature (Hard/Soft) & Reason */}
              <div className="space-y-2 border-t pt-6">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Zorunluluk Seviyesi</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setEditForm((p) => (p ? { ...p, is_hard: true } : null))}
                    className={clsx(
                      'flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all',
                      editForm.is_hard
                        ? 'border-red-500 bg-red-500/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                        : 'border-gray-800 card text-gray-400 hover:border-gray-600'
                    )}
                  >
                    <ShieldAlert className="w-4 h-4" /> Mutlaka Uyulmalı (Kesin Blok)
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setEditForm((p) => (p ? { ...p, is_hard: false } : null))}
                    className={clsx(
                      'flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all',
                      !editForm.is_hard
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'border-gray-800 card text-gray-400 hover:border-gray-600'
                    )}
                  >
                     <ShieldCheck className="w-4 h-4" /> Yumuşak Kural (Tercih)
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 ml-1">Kısa Açıklama <span className="text-gray-600 normal-case">(Opsiyonel, sadece gösterim)</span></label>
                <input
                  className="w-full bg-gray-950/50 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-colors shadow-inner"
                  placeholder="Yönetim Kurulu Üyeliği Sebebiyle..."
                  value={editForm.reason}
                  disabled={saving}
                  onChange={(e) =>
                    setEditForm((p) => (p ? { ...p, reason: e.target.value } : null))
                  }
                />
              </div>

            </div>

            <div className="p-5 border-t card flex gap-3 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-gray-300 card hover:bg-gray-700 transition-colors"
              >
                İptal Et
              </button>
              <button
                onClick={save}
                disabled={saving || getRecordCount() === 0 || !editForm.instructor_id}
                className="flex-1 btn-glow py-3 px-4 rounded-xl text-sm font-bold text-white bg-cyan-600 hover:brightness-110 transition-all shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving
                  ? 'Kural Motoruna İşleniyor...'
                  : getRecordCount() > 1
                    ? `${getRecordCount()} Algoritma Kuralı Kaydet`
                    : 'Kuralı Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
