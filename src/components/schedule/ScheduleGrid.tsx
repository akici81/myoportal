'use client'

import { useMemo } from 'react'
import type { ScheduleEntry, TimeSlot } from '@/types'
import clsx from 'clsx'
import { Trash2 } from 'lucide-react'

// Constants for Map
const DAY_MAP: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
}

// Vibrant Cyan / Sky / Teal palettes for schedule blocks
const COLORS = [
  '#0ea5e9', // Sky 500
  '#06b6d4', // Cyan 500
  '#14b8a6', // Teal 500
  '#3b82f6', // Blue 500
  '#6366f1', // Indigo 500
  '#8b5cf6', // Violet 500
  '#f59e0b', // Amber 500
  '#f97316', // Orange 500
  '#ec4899', // Pink 500
  '#10b981', // Emerald 500
]

interface ScheduleGridProps {
  entries: ScheduleEntry[]
  timeSlots: TimeSlot[]
  readonly?: boolean
  onDelete?: (id: string) => void
  onCellClick?: (day: number, slotId: string) => void
}

function getInstructor(e: ScheduleEntry) {
  return (e as any).instructors ?? (e as any).instructor ?? null
}

function getProgramCourse(e: ScheduleEntry) {
  return (e as any).program_courses ?? (e as any).program_course ?? null
}

function getCourse(e: ScheduleEntry) {
  const pc = getProgramCourse(e)
  return pc?.courses ?? pc?.course ?? null
}

function getProgram(e: ScheduleEntry) {
  const pc = getProgramCourse(e)
  return pc?.programs ?? pc?.program ?? null
}

function getClassroom(e: ScheduleEntry) {
  return (e as any).classrooms ?? (e as any).classroom ?? null
}

export function ScheduleGrid({ entries, timeSlots, readonly, onDelete, onCellClick }: ScheduleGridProps) {
  // Atama Renkleri
  const instColors = useMemo(() => {
    const map: Record<string, string> = {}
    let idx = 0
    entries.forEach(e => {
      if (e.instructor_id && !map[e.instructor_id]) map[e.instructor_id] = COLORS[idx++ % COLORS.length]
    })
    return map
  }, [entries])

  // Hücre Gruplama
  const grid = useMemo(() => {
    const g: Record<string, ScheduleEntry[]> = {}
    entries.forEach(e => {
      const key = `${e.day_of_week}_${e.time_slot_id}`
      if (!g[key]) g[key] = []
      g[key].push(e)
    })
    return g
  }, [entries])

  // Hoca listesi
  const instructorList = useMemo(() => {
    const seen = new Set<string>()
    return entries.filter(e => {
      if (!e.instructor_id) return false
      if (seen.has(e.instructor_id)) return false
      seen.add(e.instructor_id)
      return true
    })
  }, [entries])

  return (
    <div className="glass-card rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl">
      {/* Legend / Info Bar */}
      <div className="px-5 py-3 border-b border-gray-800/60 bg-gray-900/60 backdrop-blur-sm flex flex-wrap gap-4 items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Eğitmenler:</span>
        {instructorList.map(e => {
          const color = e.instructor_id ? instColors[e.instructor_id] : '#64748b'
          const inst = getInstructor(e)
          const name = inst?.full_name ?? '—'
          const title = inst?.title ?? ''
          return (
            <div key={e.instructor_id} className="flex items-center gap-2 text-xs font-medium bg-gray-800/50 px-2 py-1 rounded-md border border-gray-700/50 hover:bg-gray-800 transition-colors cursor-default shadow-sm" style={{ color: 'var(--muted)' }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
              <span className="text-gray-300">{title} {name}</span>
            </div>
          )
        })}
        {!entries.length && (
          <span className="text-xs font-medium text-gray-500 bg-gray-800/40 px-3 py-1 rounded-full border border-gray-700/30">
            Ders programı boş
          </span>
        )}
      </div>

      {/* Actual Grid Grid Table */}
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-sm border-collapse" style={{ minWidth: 800 }}>
          <thead>
            <tr>
              <th className="py-4 px-3 text-center font-bold border-b border-r border-gray-800/80 w-24 bg-gray-900/90 text-gray-500 uppercase tracking-widest text-[10px] sticky left-0 z-10 backdrop-blur-md">
                Zaman
              </th>
              {[1, 2, 3, 4, 5].map(d => (
                <th key={d} className="py-4 px-4 text-center font-black tracking-wide border-b border-r border-gray-800/80 bg-gray-900/50 text-gray-200">
                  {DAY_MAP[d]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, idx) => (
              <tr key={slot.id} className="group/row transition-colors hover:bg-gray-800/20" style={{ background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.2)' : 'rgba(15, 23, 42, 0.4)' }}>
                {/* Time Column (Sticky) */}
                <td className="py-3 px-3 text-center border-b border-r border-gray-800/80 font-mono whitespace-nowrap bg-gray-900/90 group-hover/row:bg-gray-800/90 transition-colors sticky left-0 z-10">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-gray-300">{slot.start_time.slice(0, 5)}</span>
                    <span className="text-[10px] font-medium text-gray-600 mt-0.5">{slot.end_time.slice(0, 5)}</span>
                    {slot.is_uzem_slot && (
                      <span className="mt-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 border border-indigo-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span> UZEM
                      </span>
                    )}
                  </div>
                </td>
                
                {/* Day Cells */}
                {[1, 2, 3, 4, 5].map(day => {
                  const cells = grid[`${day}_${slot.id}`] ?? []
                  const isEmpty = !cells.length
                  return (
                    <td 
                      key={day}
                      className={clsx(
                        'p-1.5 border-b border-r border-gray-800/60 align-top transition-colors relative',
                        !readonly && isEmpty && 'cursor-pointer hover:bg-cyan-900/10'
                      )}
                      style={{ minWidth: 140 }}
                      onClick={() => !readonly && isEmpty && onCellClick?.(day, slot.id)}
                    >
                      {!readonly && isEmpty && (
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                           <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                             <span className="text-cyan-400 text-lg font-light leading-none">+</span>
                           </div>
                         </div>
                      )}
                      
                      <div className="h-full flex flex-col gap-1.5">
                        {cells.map(e => {
                          const color = (e.instructor_id ? instColors[e.instructor_id] : null) ?? '#64748b'
                          const course = getCourse(e)
                          const program = getProgram(e)
                          const inst = getInstructor(e)
                          const classroom = getClassroom(e)
                          const pc = getProgramCourse(e)
                          
                          return (
                            <div 
                              key={e.id}
                              className={clsx('relative p-2.5 rounded-xl border border-gray-700/50 flex flex-col gap-0.5 transition-all w-full h-full min-h-[90px]', !readonly && 'hover:shadow-lg hover:z-10 group/cell')}
                              style={{
                                background: `linear-gradient(145deg, ${color}15, ${color}0D)`,
                                borderColor: `${color}40`,
                                borderLeftColor: color,
                                borderLeftWidth: 4,
                              }}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <p className="font-bold text-xs leading-tight" style={{ color: color }}>
                                  {course?.code ?? 'Kod Yok'}
                                </p>
                                {program && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-900/50 border border-gray-700 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                                    {program.short_code}-{pc?.year_number}
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-[11px] font-semibold text-gray-200 leading-snug line-clamp-2 mt-0.5">
                                {course?.name ?? 'Ders Adı Yok'}
                              </p>
                              
                              <div className="mt-auto pt-2 flex flex-col gap-0.5">
                                <p className="text-[10px] flex items-center gap-1 font-medium" style={{ color: 'var(--faint)' }}>
                                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                  {inst?.title} {inst?.full_name?.split(' ').slice(-1)[0] ?? 'Hoca Yok'}
                                </p>
                                <p className="text-[10px] flex items-center gap-1 font-medium text-cyan-300/80">
                                  <span className="w-1 h-1 rounded-full bg-cyan-700/50"></span>
                                  {classroom?.name ?? 'Derslik Yok'}
                                </p>
                              </div>

                              {!readonly && onDelete && (
                                <button
                                  onClick={ev => { ev.stopPropagation(); onDelete(e.id) }}
                                  title="Dersi Sil"
                                  className="absolute -top-2 -right-2 opacity-0 group-hover/cell:opacity-100 scale-90 group-hover/cell:scale-100 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center transition-all shadow-lg hover:bg-red-600 focus:outline-none z-20 border-2 border-gray-900"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
