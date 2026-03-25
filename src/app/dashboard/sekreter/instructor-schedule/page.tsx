'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Clock, BookOpen, Calendar, Search } from 'lucide-react'
import clsx from 'clsx'

interface Instructor {
  id: string
  full_name: string
  title: string
  department_id: string
  departments?: { name: string; short_code: string }
}

interface ScheduleEntry {
  id: string
  day_of_week: number
  time_slot_id: string
  classroom_id: string
  program_course_id: string
  time_slots: { start_time: string; end_time: string; slot_number: number }
  classrooms: { name: string; building: string }
  program_courses: {
    year_number: number
    programs: { name: string; short_code: string }
    courses: { code: string; name: string }
  }
}

interface TimeSlot {
  id: string
  slot_number: number
  start_time: string
  end_time: string
}

const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
const COLORS = [
  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'bg-pink-500/10 text-pink-400 border-pink-500/20'
]

export default function InstructorSchedulePage() {
  const supabase = createClient()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [selectedInstructor, setSelectedInstructor] = useState<string>('')
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [activePeriodId, setActivePeriodId] = useState<string>('')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedInstructor && activePeriodId) {
      loadSchedule()
    }
  }, [selectedInstructor, activePeriodId])

  async function loadInitialData() {
    setLoading(true)
    const { data: periods } = await supabase.from('academic_periods').select('id').eq('is_active', true).single()
    if (periods) setActivePeriodId(periods.id)

    const { data: slots } = await supabase.from('time_slots').select('*').order('slot_number')
    setTimeSlots(slots ?? [])

    // FK join yerine ayrı sorgularla bölüm bilgisi al
    const { data: instructorData } = await supabase
      .from('instructors')
      .select('id, full_name, title, department_id')
      .eq('is_active', true)
      .order('full_name')

    const { data: departments } = await supabase
      .from('departments')
      .select('id, name, short_code')
      .eq('is_active', true)

    const deptMap: Record<string, { name: string; short_code: string }> = {}
    departments?.forEach(d => { deptMap[d.id] = { name: d.name, short_code: d.short_code } })

    const enriched = (instructorData ?? []).map(inst => ({
      ...inst,
      departments: deptMap[inst.department_id] || null,
    }))

    setInstructors(enriched as Instructor[])
    setLoading(false)
  }

  async function loadSchedule() {
    const { data } = await supabase
      .from('schedule_entries')
      .select(`
        id, day_of_week, time_slot_id, classroom_id, program_course_id,
        time_slots(start_time, end_time, slot_number),
        classrooms(name, building),
        program_courses(
          year_number,
          programs(name, short_code),
          courses(code, name)
        )
      `)
      .eq('period_id', activePeriodId)
      .eq('instructor_id', selectedInstructor)
      .order('day_of_week')

    setEntries((data as unknown as ScheduleEntry[]) ?? [])
  }

  const grid = useMemo(() => {
    const g: Record<string, ScheduleEntry> = {}
    entries.forEach((e) => { g[`\${e.day_of_week}_\${e.time_slot_id}`] = e })
    return g
  }, [entries])

  const stats = useMemo(() => {
    const dayHours: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    const programs = new Set<string>()

    entries.forEach((e) => {
      dayHours[e.day_of_week]++
      if (e.program_courses?.programs?.short_code) {
        programs.add(e.program_courses.programs.short_code)
      }
    })

    return {
      totalHours: entries.length,
      dayHours,
      programCount: programs.size,
      workDays: Object.values(dayHours).filter((h) => h > 0).length,
    }
  }, [entries])

  const selectedInstructorInfo = instructors.find((i) => i.id === selectedInstructor)

  return (
    <div className="space-y-6 animate-in">
      {/* Header Container Premium Violet */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-violet-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <User className="w-48 h-48 text-violet-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              Eğitmen Programları
            </h1>
            <p className="mt-2 text-gray-400 max-w-2xl font-medium">
              Öğretim elemanlarının haftalık ders yükünü, program dağılımlarını ve boş zamanlarını inceleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto space-y-6">
        {loading ? (
           <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-gray-800/60">
             <div className="w-12 h-12 rounded-full border-4 border-violet-800 border-t-violet-500 animate-spin mb-4" />
             <h3 className="text-xl font-bold text-white tracking-tight">Veriler Yükleniyor</h3>
           </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            {/* Instructor Selection & Filters */}
            <div className="card p-6 rounded-2xl border border-gray-800/60 shadow-xl flex flex-wrap items-center justify-between gap-6">
              <div className="flex-1 min-w-[300px] relative text-gray-400 focus-within:text-violet-500 transition-colors">
                <Search className="w-5 h-5 absolute left-4 top-[38px]" />
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block pl-1">Kadrolu Eğitmen Seçimi</label>
                <select
                  className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors font-bold shadow-inner"
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                >
                  <option value="">— Akademik Personel Seçin —</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id} className="bg-gray-900">
                      {inst.title} {inst.full_name} — ({inst.departments?.name || 'Bölüm Yok'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInstructorInfo && (
                <div className="flex items-center gap-4 p-3 pr-5 pl-4 rounded-xl bg-violet-900/20 border border-violet-500/30 shadow-inner">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center border border-violet-500/50">
                    <User className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{selectedInstructorInfo.title} {selectedInstructorInfo.full_name}</h4>
                    <p className="text-[11px] font-bold text-violet-300/80 uppercase tracking-widest mt-0.5">
                      {selectedInstructorInfo.departments?.short_code || 'Bölüm Tanımsız'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Overview */}
            {selectedInstructor && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="card p-5 rounded-2xl border border-blue-500/20 bg-cyan-600">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shadow-inner">
                      <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Haftalık Yük</p>
                      <p className="text-2xl font-black text-white">{stats.totalHours} <span className="text-sm font-medium text-gray-500">Saat</span></p>
                    </div>
                  </div>
                </div>

                <div className="card p-5 rounded-2xl border border-emerald-500/20 bg-cyan-600">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
                      <Calendar className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Çalışma Günü</p>
                      <p className="text-2xl font-black text-white">{stats.workDays} <span className="text-sm font-medium text-gray-500">Gün</span></p>
                    </div>
                  </div>
                </div>

                <div className="card p-5 rounded-2xl border border-amber-500/20 bg-cyan-600">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 shadow-inner">
                      <BookOpen className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Farklı Program</p>
                      <p className="text-2xl font-black text-white">{stats.programCount} <span className="text-sm font-medium text-gray-500">Adet</span></p>
                    </div>
                  </div>
                </div>
                
                {/* Gün Bazlı Yük Dağılımı Özeti */}
                <div className="card p-4 rounded-2xl border border-violet-500/20 bg-cyan-600 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-violet-400/80 uppercase tracking-widest mb-2 border-b border-violet-500/20 pb-1">Gündelik Dağılım</p>
                  <div className="flex items-end justify-between gap-1 h-8">
                    {[1, 2, 3, 4, 5].map((d) => {
                      const h = stats.dayHours[d];
                      const max = Math.max(...Object.values(stats.dayHours), 1);
                      const height = Math.max((h / max) * 100, 10);
                      return (
                        <div key={d} className="w-full flex flex-col items-center gap-1 group relative">
                          {h > 0 && <span className="absolute -top-4 text-[9px] font-bold text-white opacity-0 group-hover:opacity-50 transition-opacity">{h}s</span>}
                          <div className={clsx("w-full rounded-sm transition-all duration-500", h > 0 ? "bg-violet-500" : "bg-gray-800")} style={{ height: `${height}%` }}></div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1 px-0.5">
                    {['Pt', 'Sl', 'Ça', 'Pe', 'Cu'].map((name, i) => (
                       <span key={i} className="text-[9px] font-medium text-gray-500">{name}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Grid Table */}
            {selectedInstructor ? (
              <div className="card overflow-hidden rounded-2xl border border-gray-800/60 shadow-2xl">
                <div className="overflow-x-auto w-full custom-scrollbar">
                  <table className="w-full text-sm border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-gray-900/80 border-b border-gray-800/60">
                        <th className="py-4 px-5 text-left font-black text-gray-400 uppercase tracking-wider border-r border-gray-800/60 w-28 bg-gray-950/50">
                          Zaman
                        </th>
                        {[1, 2, 3, 4, 5].map((d) => (
                          <th key={d} className={clsx("py-4 px-4 text-center font-black uppercase tracking-wider border-r border-gray-800/60 w-[calc((100%-7rem)/5)]", stats.dayHours[d] > 0 ? "text-violet-300" : "text-gray-500")}>
                            {DAYS[d]}
                            {stats.dayHours[d] > 0 && <span className="ml-1.5 text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full">{stats.dayHours[d]}s</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-[#050505]">
                      {timeSlots.filter((s) => parseInt(s.start_time) < 18).map((slot, idx) => (
                        <tr key={slot.id} className={clsx("transition-colors hover:bg-gray-900/30", idx % 2 === 0 ? "bg-transparent" : "bg-gray-900/20")}>
                          <td className="py-2.5 px-4 text-center border-b border-r border-gray-800/60 font-mono text-gray-500 font-bold bg-gray-950/20 text-[13px]">
                            {slot.start_time.slice(0, 5)}
                          </td>
                          {[1, 2, 3, 4, 5].map((day) => {
                            const entry = grid[`${day}_${slot.id}`]
                            const colorClass = entry ? COLORS[day % COLORS.length] : '';
                            return (
                              <td key={day} className="p-1.5 border-b border-r border-gray-800/60 align-top relative group">
                                {entry ? (
                                  <div className={clsx("h-full min-h-[76px] p-2.5 rounded-xl border relative flex flex-col justify-center transition-all bg-opacity-5 hover:bg-opacity-10 shadow-lg", colorClass)}>
                                    <p className="font-black text-sm leading-tight mb-1 truncate drop-shadow-sm flex items-center gap-1.5">
                                      <BookOpen className="w-3.5 h-3.5 opacity-70" />
                                      {entry.program_courses?.courses?.code}
                                    </p>
                                    <p className="text-[11px] font-medium leading-tight truncate mb-1 opacity-90">
                                      {entry.program_courses?.courses?.name}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto pt-1 border-t border-current border-opacity-5">
                                      <p className="text-[10px] font-bold truncate opacity-80 flex items-center gap-1">
                                        {entry.classrooms?.name}
                                      </p>
                                      <span className="text-[9px] font-black bg-black/20 px-1.5 py-0.5 rounded ml-1 shrink-0">
                                        {entry.program_courses?.programs?.short_code}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-full min-h-[76px] rounded-xl flex items-center justify-center group-hover:bg-gray-800/20 transition-colors border border-dashed border-transparent group-hover:border-gray-700/50">
                                    <span className="text-xs font-semibold text-gray-700/50 group-hover:text-gray-600 transition-colors tracking-widest uppercase">—</span>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
