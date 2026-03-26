'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Users, Clock, CheckCircle, XCircle, LayoutGrid, Maximize2, Sparkles, BookOpen } from 'lucide-react'
import clsx from 'clsx'

interface Classroom {
  id: string
  name: string
  building: string
  capacity: number
  type: string
  is_active: boolean
}

interface ScheduleEntry {
  id: string
  day_of_week: number
  time_slot_id: string
  instructor_id: string
  program_course_id: string
  time_slots: { start_time: string; end_time: string; slot_number: number }
  instructors: { full_name: string; title: string }
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

const TYPE_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  lab: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  atolye: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  normal: { bg: 'bg-red-600/10', text: 'text-red-400', border: 'border-red-600/20' },
  amfi: { bg: 'bg-red-600/10', text: 'text-red-400', border: 'border-red-600/20' },
}

export default function ClassroomSchedulePage() {
  const supabase = createClient()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [activePeriodId, setActivePeriodId] = useState<string>('')
  const [viewMode, setViewMode] = useState<'single' | 'overview'>('overview')
  const [allUsage, setAllUsage] = useState<Record<string, number>>({})

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedClassroom && activePeriodId) {
      loadSchedule()
    }
  }, [selectedClassroom, activePeriodId])

  useEffect(() => {
    if (activePeriodId && viewMode === 'overview') {
      loadAllUsage()
    }
  }, [activePeriodId, viewMode])

  async function loadInitialData() {
    setLoading(true)
    const { data: periods } = await supabase.from('academic_periods').select('id').eq('is_active', true).single()
    if (periods) setActivePeriodId(periods.id)

    const { data: slots } = await supabase.from('time_slots').select('*').order('slot_number')
    setTimeSlots(slots ?? [])

    const { data: classroomData } = await supabase.from('classrooms').select('*').eq('is_active', true).order('name')
    setClassrooms(classroomData ?? [])
    setLoading(false)
  }

  async function loadSchedule() {
    const { data } = await supabase
      .from('schedule_entries')
      .select(`
        id, day_of_week, time_slot_id, instructor_id, program_course_id,
        time_slots(start_time, end_time, slot_number),
        instructors(full_name, title),
        program_courses(
          year_number,
          programs(name, short_code),
          courses(code, name)
        )
      `)
      .eq('period_id', activePeriodId)
      .eq('classroom_id', selectedClassroom)
      .order('day_of_week')

    setEntries((data as unknown as ScheduleEntry[]) ?? [])
  }

  async function loadAllUsage() {
    const { data } = await supabase.from('schedule_entries').select('classroom_id').eq('period_id', activePeriodId)
    const usage: Record<string, number> = {}
    data?.forEach((e) => { usage[e.classroom_id] = (usage[e.classroom_id] || 0) + 1 })
    setAllUsage(usage)
  }

  const grid = useMemo(() => {
    const g: Record<string, ScheduleEntry> = {}
    entries.forEach((e) => { g[`${e.day_of_week}_${e.time_slot_id}`] = e })
    return g
  }, [entries])

  const stats = useMemo(() => {
    const totalSlots = 8 * 5 // 8 slots per day, 5 days
    const usedSlots = entries.length
    const utilizationRate = totalSlots > 0 ? Math.round((usedSlots / totalSlots) * 100) : 0
    return { usedSlots, freeSlots: totalSlots - usedSlots, utilizationRate }
  }, [entries])

  const selectedClassroomInfo = classrooms.find((c) => c.id === selectedClassroom)

  return (
    <div className="space-y-6 animate-in">
      {/* Header Container Premium Blue */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-blue-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <Building2 className="w-48 h-48 text-red-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              Derslik İzleme Merkezi
            </h1>
            <p className="mt-2 text-gray-400 max-w-2xl font-medium">
              Fiziksel alanların kapasite optimizasyonu, doluluk oranları ve haftalık program takibi.
            </p>
          </div>
          
          {/* View Mode Switcher */}
          <div className="flex card p-1.5 rounded-xl border shadow-inner">
            <button
              onClick={() => setViewMode('overview')}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all',
                viewMode === 'overview'
                  ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:card/50 transparent border border-transparent'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
              Genel Durum
            </button>
            <button
              onClick={() => {
                setViewMode('single')
                if (!selectedClassroom && classrooms.length > 0) setSelectedClassroom(classrooms[0].id)
              }}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all',
                viewMode === 'single'
                  ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:card/50 transparent border border-transparent'
              )}
            >
              <Maximize2 className="w-4 h-4" />
              Derslik Detayı
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto space-y-6">
        {loading ? (
           <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border">
             <div className="w-12 h-12 rounded-full border-4 border-blue-800 border-t-red-600 animate-spin mb-4" />
             <h3 className="text-xl font-bold text-white tracking-tight">Derslik Verileri Yükleniyor</h3>
           </div>
        ) : viewMode === 'overview' ? (
          /* Overview - All Classrooms */
          <div className="card overflow-hidden rounded-2xl border shadow-xl">
            <div className="px-6 py-5 border-b card flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-red-400" />
                  Kapasite ve Doluluk Haritası
                </h3>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  Tüm dersliklerin haftalık performans raporu (Maksimum kapasite 40 ders saati)
                </p>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 bg-[#050505]">
              {classrooms.map((room) => {
                const used = allUsage[room.id] || 0
                const rate = Math.round((used / 40) * 100)
                const styling = TYPE_COLORS[room.type] || TYPE_COLORS.normal

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedClassroom(room.id)
                      setViewMode('single')
                    }}
                    className="p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-600/10 card border hover:border-red-600/30 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full opacity-50 group-hover:opacity-50 transition-opacity" />
                    
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <h4 className="font-black text-gray-100 text-lg group-hover:text-red-400 transition-colors dropdown-title truncate pr-2">{room.name}</h4>
                      <span className={clsx('text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider border', styling.bg, styling.text, styling.border)}>
                        {room.type}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-5 relative z-10 text-gray-400 group-hover:text-gray-300 transition-colors">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {room.capacity} Öğrenci Kapasitesi
                      </span>
                    </div>
                    
                    <div className="h-2.5 rounded-full bg-gray-950/80 overflow-hidden relative z-10 border">
                      <div
                        className={clsx(
                          "h-full transition-all duration-1000 ease-out shadow-inner",
                          rate > 80 ? 'bg-cyan-600' : rate > 50 ? 'bg-cyan-600' : 'bg-cyan-600'
                        )}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between mt-2.5 relative z-10">
                      <span className="text-xs font-medium text-gray-500">
                        {used}/40 Saat Kullanım
                      </span>
                      <span className={clsx(
                        'text-[11px] font-black px-1.5 py-0.5 rounded-md text-white shadow-sm',
                        rate > 80 ? 'bg-red-500/80' : rate > 50 ? 'bg-amber-500/80' : 'bg-emerald-500/80'
                      )}>
                        %{rate} Dolu
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Single Classroom View */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            {/* Classroom Selection Glass Card */}
            <div className="card p-6 rounded-2xl border shadow-xl flex items-center justify-between gap-6 flex-wrap">
              <div className="flex-1 min-w-[300px]">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block pl-1">İncelenen Derslik</label>
                <select
                  className="w-full card border rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600/50 transition-colors font-bold shadow-inner"
                  value={selectedClassroom}
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                >
                  <option value="">— Cihaz Tipi / Derslik Seçin —</option>
                  {classrooms.map((room) => (
                    <option key={room.id} value={room.id} className="card">
                      {room.name} — ({room.building} Binası, {room.capacity} Kişilik)
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedClassroomInfo && (
                <div className="flex gap-4 p-4 rounded-xl card border shadow-inner">
                   <div className="text-center px-4 border-r">
                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Bina</p>
                     <p className="font-bold text-gray-200">{selectedClassroomInfo.building}</p>
                   </div>
                   <div className="text-center px-4 border-r">
                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Kapasite</p>
                     <p className="font-bold text-red-400">{selectedClassroomInfo.capacity} Kişi</p>
                   </div>
                   <div className="text-center px-4">
                     <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tür</p>
                     <p className="font-bold text-white capitalize">{selectedClassroomInfo.type}</p>
                   </div>
                </div>
              )}
            </div>

            {/* Stats Cards */}
            {selectedClassroom && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="card p-5 rounded-2xl border border-red-600/20 bg-cyan-600">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-600/10 border border-red-600/20 shadow-inner">
                      <BookOpen className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Haftalık Ders</p>
                      <p className="text-2xl font-black text-white">{stats.usedSlots} <span className="text-sm font-medium text-gray-500">Saat</span></p>
                    </div>
                  </div>
                </div>

                <div className="card p-5 rounded-2xl border border-emerald-500/20 bg-cyan-600">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Kullanılabilir</p>
                      <p className="text-2xl font-black text-white">{stats.freeSlots} <span className="text-sm font-medium text-gray-500">Saat</span></p>
                    </div>
                  </div>
                </div>

                <div className="card p-5 rounded-2xl border border-red-500/20 bg-cyan-600">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20 shadow-inner">
                      <XCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Boş Olmayan</p>
                      <p className="text-2xl font-black text-white">{stats.usedSlots} <span className="text-sm font-medium text-gray-500">Saat</span></p>
                    </div>
                  </div>
                </div>

                <div className="card p-5 rounded-2xl border border-amber-500/20 bg-cyan-600">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 shadow-inner">
                      <Clock className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Doluluk Oranı</p>
                      <p className="text-2xl font-black text-white">%{stats.utilizationRate}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Grid Table */}
            {selectedClassroom ? (
              <div className="card overflow-hidden rounded-2xl border shadow-2xl">
                <div className="overflow-x-auto w-full custom-scrollbar">
                  <table className="w-full text-sm border-collapse min-w-[900px]">
                    <thead>
                      <tr className="card border-b">
                        <th className="py-4 px-5 text-left font-black text-gray-400 uppercase tracking-wider border-r w-28 bg-gray-950/50">
                          Zaman
                        </th>
                        {[1, 2, 3, 4, 5].map((d) => (
                          <th key={d} className="py-4 px-4 text-center font-black text-gray-300 uppercase tracking-wider border-r w-[calc((100%-7rem)/5)]">
                            {DAYS[d]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-[#050505]">
                      {timeSlots.filter((s) => parseInt(s.start_time) < 18).map((slot, idx) => (
                        <tr key={slot.id} className={clsx("transition-colors hover:card", idx % 2 === 0 ? "bg-transparent" : "card")}>
                          <td className="py-2.5 px-4 text-center border-b border-r font-mono text-gray-500 font-bold bg-gray-950/20 text-[13px]">
                            {slot.start_time.slice(0, 5)}
                          </td>
                          {[1, 2, 3, 4, 5].map((day) => {
                            const entry = grid[`${day}_${slot.id}`]
                            return (
                              <td key={day} className="p-1.5 border-b border-r align-top relative group">
                                {entry ? (
                                  <div className="h-full min-h-[76px] p-2.5 rounded-xl border relative overflow-hidden flex flex-col justify-center transition-all bg-red-600/10 border-red-600/20 hover:bg-red-600/20 hover:border-red-600/40">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                                    <p className="font-black text-red-400 text-sm leading-tight mb-1 truncate">
                                      {entry.program_courses?.courses?.code}
                                    </p>
                                    <p className="text-[11px] text-gray-300 font-medium leading-tight truncate mb-1">
                                      {entry.program_courses?.courses?.name}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto pt-1">
                                      <p className="text-[10px] text-gray-500 font-bold truncate">
                                        {entry.instructors?.title} {entry.instructors?.full_name?.split(' ').slice(-1)[0]}
                                      </p>
                                      <span className="text-[9px] font-black bg-indigo-950/50 text-red-300 px-1.5 py-0.5 rounded ml-1 border border-red-600/20 shrink-0">
                                        {entry.program_courses?.programs?.short_code}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-full min-h-[76px] rounded-xl flex items-center justify-center group-hover:card/20 transition-colors border border-dashed border-transparent group-hover:border-gray-700/50">
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
