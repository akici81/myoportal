'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Building2,
  BookOpen,
  Clock,
  ShieldAlert,
  Search,
  CheckCircle2,
  Sparkles,
  Users,
  Layers
} from 'lucide-react'
import clsx from 'clsx'

export interface Conflict {
  type: 'instructor' | 'classroom' | 'program' | 'capacity' | 'constraint'
  severity: 'error' | 'warning'
  message: string
  details: string
  day: number
  time: string
  entities: string[]
}

export interface ScheduleEntry {
  id: string
  day_of_week: number
  time_slot_id: string
  classroom_id: string
  instructor_id: string
  program_course_id: string
  time_slots: { start_time: string; end_time: string }
  classrooms: { name: string; capacity: number }
  instructors: { full_name: string }
  program_courses: {
    year_number: number
    program_enrollments: { student_count: number }[]
    programs: { name: string; short_code: string }
    courses: { code: string; name: string }
  }
}

export interface Constraint {
  instructor_id: string
  constraint_type: string
  day_of_week: number
  time_slot_id: string
  is_hard: boolean
  instructors: { full_name: string }
}

export default function ConflictsPage() {
  const supabase = createClient()
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [activePeriodId, setActivePeriodId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    errors: 0,
    warnings: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    // Load active period
    const { data: periods } = await supabase
      .from('academic_periods')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!periods) {
      setLoading(false)
      toast.error('Aktif bir akademik dönem bulunamadı.')
      return
    }

    setActivePeriodId(periods.id)

    // Load all schedule entries
    const { data: entries } = await supabase
      .from('schedule_entries')
      .select(
        `
        id, day_of_week, time_slot_id, classroom_id, instructor_id, program_course_id,
        time_slots(start_time, end_time),
        classrooms(name, capacity),
        instructors(full_name),
        program_courses(
          year_number,
          program_enrollments(student_count),
          programs(name, short_code),
          courses(code, name)
        )
      `
      )
      .eq('period_id', periods.id)

    // Load constraints
    const { data: constraints } = await supabase
      .from('instructor_constraints')
      .select('*, instructors(full_name)')
      .eq('is_hard', true)

    analyzeConflicts(
      (entries as any) ?? [],
      (constraints as any) ?? []
    )

    setLoading(false)
  }

  function analyzeConflicts(entries: any[], constraints: any[]) {
    const foundConflicts: Conflict[] = []

    // Group entries by slot
    const slotMap: Record<string, any[]> = {}
    entries.forEach((e) => {
      const key = `${e.day_of_week}_${e.time_slot_id}`
      if (!slotMap[key]) slotMap[key] = []
      slotMap[key].push(e)
    })

    // Check each slot
    Object.entries(slotMap).forEach(([key, slotEntries]) => {
      const [day, slotId] = key.split('_')
      const dayNum = parseInt(day)
      const time = slotEntries[0]?.time_slots?.start_time?.slice(0, 5) || ''

      // 1. Instructor conflicts (same instructor, same time)
      const instructorGroups: Record<string, any[]> = {}
      slotEntries.forEach((e) => {
        if (!e.instructor_id) return
        if (!instructorGroups[e.instructor_id]) instructorGroups[e.instructor_id] = []
        instructorGroups[e.instructor_id].push(e)
      })

      Object.entries(instructorGroups).forEach(([instId, instEntries]) => {
        if (instEntries.length > 1) {
          foundConflicts.push({
            type: 'instructor',
            severity: 'error',
            message: 'Hoca Çakışması',
            details: `${instEntries[0].instructors?.full_name} aynı anda ${instEntries.length} derste bulundu.`,
            day: dayNum,
            time,
            entities: instEntries.map((e) => e.program_courses?.courses?.code || '?'),
          })
        }
      })

      // 2. Classroom conflicts (same classroom, same time)
      const classroomGroups: Record<string, any[]> = {}
      slotEntries.forEach((e) => {
        if (!classroomGroups[e.classroom_id]) classroomGroups[e.classroom_id] = []
        classroomGroups[e.classroom_id].push(e)
      })

      Object.entries(classroomGroups).forEach(([roomId, roomEntries]) => {
        if (roomEntries.length > 1) {
          foundConflicts.push({
            type: 'classroom',
            severity: 'error',
            message: 'Derslik Çakışması',
            details: `${roomEntries[0].classrooms?.name} aynı anda ${roomEntries.length} derste kullanılıyor.`,
            day: dayNum,
            time,
            entities: roomEntries.map((e) => e.program_courses?.courses?.code || '?'),
          })
        }
      })

      // 3. Program conflicts (same program, same year, same time)
      const programGroups: Record<string, any[]> = {}
      slotEntries.forEach((e) => {
        const pCode = e.program_courses?.programs?.short_code
        const pYear = e.program_courses?.year_number
        if (!pCode || !pYear) return
        const key = `${pCode}_${pYear}`
        if (!programGroups[key]) programGroups[key] = []
        programGroups[key].push(e)
      })

      Object.entries(programGroups).forEach(([progKey, progEntries]) => {
        if (progEntries.length > 1) {
          const [shortCode, year] = progKey.split('_')
          foundConflicts.push({
            type: 'program',
            severity: 'error',
            message: 'Program Çakışması',
            details: `${shortCode} ${year}. Sınıf aynı anda ${progEntries.length} derste bulunuyor.`,
            day: dayNum,
            time,
            entities: progEntries.map((e) => e.program_courses?.courses?.code || '?'),
          })
        }
      })
    })

    // 4. Capacity warnings
    entries.forEach((e) => {
      const capacity = e.classrooms?.capacity || 0
      // In V2, student_count is in program_enrollments
      const enrollments = e.program_courses?.program_enrollments
      let studentCount = 30
      if (Array.isArray(enrollments) && enrollments.length > 0) {
        studentCount = enrollments[0].student_count
      }

      if (capacity > 0 && studentCount > capacity) {
        foundConflicts.push({
          type: 'capacity',
          severity: 'warning',
          message: 'Kapasite Aşımı',
          details: `${e.classrooms?.name} mevcut kapasitesi (${capacity} kişi), öğrenci sayısından (${studentCount}) az.`,
          day: e.day_of_week,
          time: e.time_slots?.start_time?.slice(0, 5) || '',
          entities: [e.program_courses?.courses?.code || '?'],
        })
      }
    })

    // 5. Constraint violations
    constraints.forEach((c) => {
      if (c.constraint_type === 'unavailable_slot' || c.constraint_type === 'unavailable_day') {
        const violations = entries.filter((e) => {
          if (e.instructor_id !== c.instructor_id) return false
          if (c.constraint_type === 'unavailable_day') {
            return e.day_of_week === c.day_of_week
          }
          return e.day_of_week === c.day_of_week && e.time_slot_id === c.time_slot_id
        })

        violations.forEach((v) => {
          foundConflicts.push({
            type: 'constraint',
            severity: 'error',
            message: 'Dokunulmazlık İhlali',
            details: `${c.instructors?.full_name} müsait olmadığı saatte ders atamasına sahip.`,
            day: v.day_of_week,
            time: v.time_slots?.start_time?.slice(0, 5) || '',
            entities: [v.program_courses?.courses?.code || '?'],
          })
        })
      }
    })

    // Sort by severity then day/time
    foundConflicts.sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1
      if (a.day !== b.day) return a.day - b.day
      return a.time.localeCompare(b.time)
    })

    setConflicts(foundConflicts)
    setStats({
      total: foundConflicts.length,
      errors: foundConflicts.filter((c) => c.severity === 'error').length,
      warnings: foundConflicts.filter((c) => c.severity === 'warning').length,
    })
  }

  const getTypeIcon = (type: Conflict['type']) => {
    switch (type) {
      case 'instructor': return User
      case 'classroom': return Building2
      case 'program': return BookOpen
      case 'capacity': return Users
      case 'constraint': return Clock
      default: return AlertTriangle
    }
  }

  const getTypeColorClasses = (type: Conflict['type'], severity: 'error' | 'warning') => {
    if (severity === 'warning') {
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-500',
        border: 'border-amber-500/20'
      }
    }
    
    switch (type) {
      case 'instructor':
        return { bg: 'bg-red-600/10', text: 'text-red-600', border: 'border-red-600/20' }
      case 'classroom':
        return { bg: 'bg-red-600/10', text: 'text-red-600', border: 'border-red-600/20' }
      case 'program':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' }
      case 'capacity':
        return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' }
      case 'constraint':
        return { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' }
      default:
        return { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' }
    }
  }
  
  const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']

  const filteredConflicts = conflicts.filter((c) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      c.message.toLowerCase().includes(searchLower) ||
      c.details.toLowerCase().includes(searchLower) ||
      c.entities.some(e => e.toLowerCase().includes(searchLower)) ||
      DAYS[c.day].toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Premium Header Container */}
      <div className={clsx(
        "relative overflow-hidden rounded-2xl p-8 border transition-colors duration-1000",
        stats.errors > 0 
          ? "card border-red-800/30"
          : stats.warnings > 0
            ? "card border-amber-800/30"
            : "card border-emerald-800/30"
      )}>
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none">
          {stats.errors > 0 ? (
            <ShieldAlert className="w-48 h-48 text-red-400" />
          ) : stats.warnings > 0 ? (
            <AlertTriangle className="w-48 h-48 text-amber-400" />
          ) : (
             <CheckCircle2 className="w-48 h-48 text-emerald-400" />
          )}
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className={clsx(
              "text-3xl font-bold text-transparent bg-clip-text flex items-center gap-3",
              stats.errors > 0 ? "bg-cyan-600" 
              : stats.warnings > 0 ? "bg-cyan-600" 
              : "bg-cyan-600"
            )}>
              Çakışma ve İhlal Raporu
            </h1>
            <p className="mt-2 text-gray-400 leading-relaxed">
              Ders programındaki hoca, derslik, program çakışmaları ve kapasite aşımları listelenir. Program onaylanmadan önce <strong className={clsx(
                  stats.errors > 0 ? "text-red-400" : "text-gray-300"
                )}>kritik hataların (KIRMIZI)</strong> mutlaka çözülmesi gerekmektedir.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className={clsx(
              "btn-glow inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 shrink-0",
              stats.errors > 0 ? "bg-cyan-600 hover:shadow-[0_0_20px_rgba(225,29,72,0.4)]"
              : stats.warnings > 0 ? "bg-cyan-600 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              : "bg-cyan-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            )}
          >
            <RefreshCw className={clsx("w-5 h-5 flex-shrink-0", loading && "animate-spin")} />
            <span>{loading ? 'Analiz Ediliyor...' : 'Yeniden Analiz Et'}</span>
          </button>
        </div>
      </div>

      {/* Summary Scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 rounded-2xl border flex items-center gap-4 bg-gradient-to-br from-gray-800/20 to-transparent">
          <div className="w-14 h-14 rounded-full card flex items-center justify-center border text-gray-400 shadow-inner">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Bulgu Toplamı</p>
            <p className="text-3xl font-black text-white mt-1">{stats.total}</p>
          </div>
        </div>

        <div className={clsx(
          "glass-card p-6 rounded-2xl border flex items-center gap-4 transition-colors duration-500",
          stats.errors > 0 
            ? "border-red-500/30 bg-gradient-to-br from-red-900/10 to-transparent shadow-[0_0_15px_rgba(225,29,72,0.1)]" 
            : "border-gray-800 bg-gradient-to-br from-gray-800/10 to-transparent"
        )}>
          <div className={clsx(
            "w-14 h-14 rounded-full flex items-center justify-center border shadow-inner transition-colors duration-500",
            stats.errors > 0 ? "bg-red-500/20 border-red-500/30 text-red-500 relative" : "card text-gray-500"
          )}>
            {stats.errors > 0 && <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>}
            <XCircle className="w-7 h-7 relative z-10" />
          </div>
          <div>
            <p className={clsx(
              "text-xs font-semibold uppercase tracking-wider",
              stats.errors > 0 ? "text-red-400/80" : "text-gray-500"
            )}>Kritik Çakışmalar</p>
            <p className={clsx("text-3xl font-black mt-1", stats.errors > 0 ? "text-red-400" : "text-gray-400")}>{stats.errors}</p>
          </div>
        </div>

        <div className={clsx(
          "glass-card p-6 rounded-2xl border flex items-center gap-4 transition-colors duration-500",
          stats.warnings > 0 
            ? "border-amber-500/30 bg-gradient-to-br from-amber-900/10 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.05)]" 
            : "border-gray-800 bg-gradient-to-br from-gray-800/10 to-transparent"
        )}>
          <div className={clsx(
            "w-14 h-14 rounded-full flex items-center justify-center border shadow-inner transition-colors duration-500",
            stats.warnings > 0 ? "bg-amber-500/20 border-amber-500/30 text-amber-500" : "card text-gray-500"
          )}>
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <p className={clsx(
              "text-xs font-semibold uppercase tracking-wider",
              stats.warnings > 0 ? "text-amber-400/80" : "text-gray-500"
            )}>Kapasite Uyarıları</p>
            <p className={clsx("text-3xl font-black mt-1", stats.warnings > 0 ? "text-amber-400" : "text-gray-400")}>{stats.warnings}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="card rounded-2xl border overflow-hidden card">
        <div className="p-6 border-b flex flex-col sm:flex-row items-center justify-between gap-4 card">
           <h3 className="font-bold text-white text-lg flex items-center gap-2">
             <ShieldAlert className="w-5 h-5 text-gray-400" />
             Ayrıntılı Bulgu Listesi
           </h3>
           <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                className="w-full bg-gray-950/50 border rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-colors shadow-inner placeholder:text-gray-600"
                placeholder="Kod, gün veya hoca ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>

        <div className="p-0">
          {loading ? (
             <div className="p-20 flex flex-col items-center justify-center text-gray-500 animate-pulse">
                <div className="relative">
                  <div className="absolute inset-0 border-4 border-t-red-600 border-r-transparent border-b-red-600 border-l-transparent rounded-full animate-spin"></div>
                  <ShieldAlert className="w-12 h-12 m-4 opacity-50 text-red-600" />
                </div>
                <p className="mt-4 text-lg">Algoritmalar Devrede, Analiz Yapılıyor...</p>
             </div>
          ) : conflicts.length === 0 ? (
             <div className="p-20 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center border-4 border-emerald-500/20 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Tertemiz Ders Programı!</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Sistem herhangi bir derslik, hoca, program çakışması veya kapasite sorunu bulamadı. Ders programınız yayınlanmaya hazır.
                </p>
             </div>
          ) : filteredConflicts.length === 0 ? (
             <div className="p-16 flex flex-col items-center justify-center text-center">
                <Search className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400">Aramanıza uygun bir bulgu bulunamadı.</p>
             </div>
          ) : (
             <div className="divide-y divide-gray-800/60">
               {filteredConflicts.map((conflict, idx) => {
                 const Icon = getTypeIcon(conflict.type)
                 const { bg, text, border } = getTypeColorClasses(conflict.type, conflict.severity)
                 const isError = conflict.severity === 'error'

                 return (
                   <div 
                     key={idx}
                     className="p-6 flex flex-col sm:flex-row sm:items-start gap-5 hover:card/30 transition-colors duration-200 group"
                   >
                     <div className={clsx(
                       "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner",
                       bg, border
                     )}>
                       <Icon className={clsx("w-6 h-6", text)} />
                     </div>
                     
                     <div className="flex-1 min-w-0">
                       <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                         <span className={clsx(
                           "text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border text-center w-max shrink-0",
                           isError 
                             ? "bg-red-500/10 border-red-500/30 text-red-400" 
                             : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                         )}>
                           {isError ? 'KRİTİK HATA' : 'UYARI'}
                         </span>
                         <h4 className="text-base font-bold text-white group-hover:text-gray-200 transition-colors">
                           {conflict.message}
                         </h4>
                       </div>
                       
                       <p className="text-sm text-gray-400 leading-relaxed mb-4">
                         {conflict.details}
                       </p>
                       
                       <div className="flex flex-wrap items-center gap-2">
                         <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-950/60 border text-gray-300">
                           <Clock className="w-3.5 h-3.5 text-gray-500" />
                           {DAYS[conflict.day]} · {conflict.time}
                         </span>
                         
                         {conflict.entities.map((entity, i) => (
                           <span 
                             key={i}
                             className={clsx(
                               "text-xs font-bold px-3 py-1.5 rounded-lg border",
                               bg, border, text
                             )}
                           >
                             {entity}
                           </span>
                         ))}
                       </div>
                     </div>
                   </div>
                 )
               })}
             </div>
          )}
        </div>
      </div>
    </div>
  )
}
