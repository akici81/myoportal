'use client'

import { useMemo, useRef, useState } from 'react'
import type { ScheduleEntry, TimeSlot } from '@/types'
import clsx from 'clsx'
import { Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

const DAY_MAP: Record<number, string> = {
  1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma',
}

const COLORS = [
  '#0ea5e9', '#06b6d4', '#14b8a6', '#3b82f6', '#6366f1',
  '#8b5cf6', '#f59e0b', '#f97316', '#ec4899', '#10b981',
]

interface ScheduleGridProps {
  entries: ScheduleEntry[]
  timeSlots: TimeSlot[]
  readonly?: boolean
  onDelete?: (id: string) => void
  onCellClick?: (day: number, slotId: string) => void
  onMove?: () => void  // callback after a successful move to reload entries
}

function getInstructor(e: ScheduleEntry) { return (e as any).instructors ?? (e as any).instructor ?? null }
function getProgramCourse(e: ScheduleEntry) { return (e as any).program_courses ?? (e as any).program_course ?? null }
function getCourse(e: ScheduleEntry) { const pc = getProgramCourse(e); return pc?.courses ?? pc?.course ?? null }
function getProgram(e: ScheduleEntry) { const pc = getProgramCourse(e); return pc?.programs ?? pc?.program ?? null }
function getClassroom(e: ScheduleEntry) { return (e as any).classrooms ?? (e as any).classroom ?? null }

export function ScheduleGrid({ entries, timeSlots, readonly, onDelete, onCellClick, onMove }: ScheduleGridProps) {
  const instColors = useMemo(() => {
    const map: Record<string, string> = {}
    let idx = 0
    entries.forEach(e => { if (e.instructor_id && !map[e.instructor_id]) map[e.instructor_id] = COLORS[idx++ % COLORS.length] })
    return map
  }, [entries])

  const grid = useMemo(() => {
    const g: Record<string, ScheduleEntry[]> = {}
    entries.forEach(e => {
      const key = `${e.day_of_week}_${e.time_slot_id}`
      if (!g[key]) g[key] = []
      g[key].push(e)
    })
    return g
  }, [entries])

  const instructorList = useMemo(() => {
    const seen = new Set<string>()
    return entries.filter(e => { if (!e.instructor_id || seen.has(e.instructor_id)) return false; seen.add(e.instructor_id); return true })
  }, [entries])

  // ─── Drag State ──────────────────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<{ day: number; slotId: string } | null>(null)
  const [moving, setMoving] = useState(false)
  const dragDataRef = useRef<{ entryId: string } | null>(null)

  function handleDragStart(e: React.DragEvent, entryId: string) {
    dragDataRef.current = { entryId }
    setDraggingId(entryId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOver(null)
  }

  function handleDragOver(e: React.DragEvent, day: number, slotId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver({ day, slotId })
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  async function handleDrop(e: React.DragEvent, day: number, slotId: string) {
    e.preventDefault()
    setDragOver(null)
    const entryId = dragDataRef.current?.entryId
    if (!entryId) return

    // Don't move to same position
    const currentEntry = entries.find(en => en.id === entryId)
    if (currentEntry && currentEntry.day_of_week === day && currentEntry.time_slot_id === slotId) {
      setDraggingId(null)
      return
    }

    setMoving(true)
    const res = await fetch('/api/schedule/entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, day_of_week: day, time_slot_id: slotId }),
    })
    setMoving(false)
    setDraggingId(null)

    if (res.ok) {
      toast.success('Ders yeni konumuna taşındı')
      onMove?.()
    } else {
      const data = await res.json()
      toast.error(data.error ?? 'Taşıma başarısız')
    }
  }

  return (
    <div className="glass-card rounded-2xl border border-gray-800/60 overflow-hidden shadow-2xl">
      {/* Moving overlay */}
      {moving && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <div className="flex items-center gap-3 bg-gray-900 border border-cyan-700/50 px-6 py-3 rounded-xl shadow-xl text-cyan-300 font-bold text-sm">
            <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            Ders taşınıyor...
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="px-5 py-3 border-b border-gray-800/60 bg-gray-900/60 backdrop-blur-sm flex flex-wrap gap-4 items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Eğitmenler:</span>
        {instructorList.map(e => {
          const color = e.instructor_id ? instColors[e.instructor_id] : '#64748b'
          const inst = getInstructor(e)
          return (
            <div key={e.instructor_id} className="flex items-center gap-2 text-xs font-medium bg-gray-800/50 px-2 py-1 rounded-md border border-gray-700/50 hover:bg-gray-800 transition-colors cursor-default shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
              <span className="text-gray-300">{inst?.title} {inst?.full_name ?? '—'}</span>
            </div>
          )
        })}
        {!entries.length && (
          <span className="text-xs font-medium text-gray-500 bg-gray-800/40 px-3 py-1 rounded-full border border-gray-700/30">
            Ders programı boş
          </span>
        )}
        {!readonly && entries.length > 0 && (
          <span className="ml-auto text-[10px] text-gray-600 font-medium flex items-center gap-1.5">
            <GripVertical className="w-3 h-3" />
            Sürükleyerek taşıyabilirsiniz
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto w-full custom-scrollbar relative">
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
              <tr key={slot.id} className="group/row transition-colors hover:bg-gray-800/20" style={{ background: idx % 2 === 0 ? 'rgba(15,23,42,0.2)' : 'rgba(15,23,42,0.4)' }}>
                {/* Time */}
                <td className="py-3 px-3 text-center border-b border-r border-gray-800/80 font-mono whitespace-nowrap bg-gray-900/90 group-hover/row:bg-gray-800/90 transition-colors sticky left-0 z-10">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-gray-300">{slot.start_time.slice(0, 5)}</span>
                    <span className="text-[10px] font-medium text-gray-600 mt-0.5">{slot.end_time.slice(0, 5)}</span>
                    {slot.is_uzem_slot && (
                      <span className="mt-1 text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 border border-indigo-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> UZEM
                      </span>
                    )}
                  </div>
                </td>

                {/* Day cells */}
                {[1, 2, 3, 4, 5].map(day => {
                  const cells = grid[`${day}_${slot.id}`] ?? []
                  const isEmpty = !cells.length
                  const isDropTarget = dragOver?.day === day && dragOver?.slotId === slot.id

                  return (
                    <td
                      key={day}
                      className={clsx(
                        'p-1.5 border-b border-r border-gray-800/60 align-top transition-all relative',
                        !readonly && isEmpty && 'cursor-pointer hover:bg-cyan-900/10',
                        isDropTarget && isEmpty && 'bg-cyan-900/30 ring-2 ring-inset ring-cyan-500/50',
                        isDropTarget && !isEmpty && 'bg-amber-900/20 ring-2 ring-inset ring-amber-500/40',
                      )}
                      style={{ minWidth: 140 }}
                      onClick={() => !readonly && isEmpty && !draggingId && onCellClick?.(day, slot.id)}
                      onDragOver={!readonly ? (e) => handleDragOver(e, day, slot.id) : undefined}
                      onDragLeave={!readonly ? handleDragLeave : undefined}
                      onDrop={!readonly ? (e) => handleDrop(e, day, slot.id) : undefined}
                    >
                      {/* Empty cell plus button */}
                      {!readonly && isEmpty && !draggingId && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                            <span className="text-cyan-400 text-lg font-light leading-none">+</span>
                          </div>
                        </div>
                      )}

                      {/* Drop indicator for empty cell */}
                      {!readonly && isEmpty && isDropTarget && (
                        <div className="absolute inset-1 rounded-xl border-2 border-dashed border-cyan-500/70 flex items-center justify-center">
                          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Bırak</span>
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
                          const isDragging = draggingId === e.id

                          return (
                            <div
                              key={e.id}
                              draggable={!readonly}
                              onDragStart={!readonly ? (ev) => handleDragStart(ev, e.id) : undefined}
                              onDragEnd={!readonly ? handleDragEnd : undefined}
                              className={clsx(
                                'relative p-2.5 rounded-xl border border-gray-700/50 flex flex-col gap-0.5 transition-all w-full h-full min-h-[90px]',
                                !readonly && 'hover:shadow-lg hover:z-10 group/cell cursor-grab active:cursor-grabbing',
                                isDragging && 'opacity-40 scale-95 ring-2 ring-cyan-500/50',
                              )}
                              style={{
                                background: `linear-gradient(145deg, ${color}15, ${color}0D)`,
                                borderColor: `${color}40`,
                                borderLeftColor: color,
                                borderLeftWidth: 4,
                              }}
                            >
                              {/* Drag handle hint */}
                              {!readonly && (
                                <div className="absolute top-1.5 right-6 opacity-0 group-hover/cell:opacity-40 transition-opacity">
                                  <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                                </div>
                              )}

                              <div className="flex justify-between items-start gap-2">
                                <p className="font-bold text-xs leading-tight" style={{ color }}>
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
                                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                                  {inst?.title} {inst?.full_name?.split(' ').slice(-1)[0] ?? 'Hoca Yok'}
                                </p>
                                <p className="text-[10px] flex items-center gap-1 font-medium text-cyan-300/80">
                                  <span className="w-1 h-1 rounded-full bg-cyan-700/50" />
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
