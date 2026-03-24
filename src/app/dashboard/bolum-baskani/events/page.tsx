'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CalendarDays, ChevronLeft, ChevronRight,
  MapPin, Clock, X, List, Grid3X3, Tag, CalendarHeart
} from 'lucide-react'
import type { CalendarEvent } from '@/types'
import clsx from 'clsx'

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const DAYS_SHORT = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']

const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  akademik: { label: 'Akademik',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' },
  sosyal:   { label: 'Sosyal',    color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' },
  kurul:    { label: 'Kurul/Toplantı', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' },
  staj:     { label: 'Staj/Kariyer', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' },
  diger:    { label: 'Diğer',     color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)' },
}

export default function EventsReadOnlyPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'list'>('month')
  const [currentDate, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('events').select('*').order('date').order('start_time')
    setEvents(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const calendarDays = useMemo(() => {
    const year  = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const first = new Date(year, month, 1)
    const last  = new Date(year, month + 1, 0)
    let startDow = first.getDay() - 1
    if (startDow < 0) startDow = 6
    const days: (Date | null)[] = Array(startDow).fill(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [currentDate])

  function eventsOnDate(date: Date) {
    const iso = date.toISOString().split('T')[0]
    return events.filter(e => e.date === iso && (filterCat === 'all' || e.category === filterCat))
  }

  const today = new Date().toISOString().split('T')[0]

  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => e.date >= today && (filterCat === 'all' || e.category === filterCat))
      .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
  }, [events, filterCat, today])

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900/40 via-fuchsia-900/20 to-gray-900 p-8 border border-rose-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <CalendarHeart className="w-48 h-48 text-rose-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-fuchsia-400 flex items-center gap-3 tracking-tight">
              Kurum Takvimi
            </h1>
            <p className="mt-2 text-gray-400 max-w-2xl font-medium">
              Aylık akademik planlamaları, görevlendirmeleri, toplantıları ve etkinlikleri buradan takip edin.
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="glass-card p-4 rounded-xl flex flex-col lg:flex-row gap-5 items-center justify-between border border-gray-800/60 shadow-xl">
        <div className="flex items-center gap-1.5 bg-gray-900/50 p-1.5 rounded-xl border border-gray-700/50">
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-black text-white px-2 min-w-[140px] text-center uppercase tracking-widest">
            <span className="text-rose-400">{MONTHS_TR[currentDate.getMonth()]}</span> {currentDate.getFullYear()}
          </div>
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-700 mx-1"></div>
          <button onClick={() => setCurrent(new Date())} className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-all uppercase tracking-wider">
            Bugün
          </button>
        </div>

        <div className="flex gap-2 flex-wrap justify-center flex-1">
          <button onClick={() => setFilterCat('all')} className={clsx('px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all border', filterCat === 'all' ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-[0_0_10px_rgba(225,29,72,0.2)]' : 'border-gray-700/50 bg-gray-900/50 text-gray-400 hover:text-white hover:border-gray-600')}>
            Tümü
          </button>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => (
            <button key={k} onClick={() => setFilterCat(k)} className={clsx('px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5', filterCat === k ? '' : 'opacity-60 hover:opacity-100 hover:border-gray-600 bg-gray-900/50')} style={filterCat === k ? { background: v.bg, color: v.color, borderColor: v.border, boxShadow: `0 0 10px ${v.bg}` } : { color: v.color, borderColor: 'transparent' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }}></div>{v.label}
            </button>
          ))}
        </div>

        <div className="flex rounded-xl overflow-hidden border border-gray-700/80 bg-gray-900/80 p-1">
          <button onClick={() => setView('month')} className={clsx('px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors rounded-lg uppercase tracking-wider', view === 'month' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300')}>
            <Grid3X3 className="w-4 h-4" /> Takvim
          </button>
          <button onClick={() => setView('list')} className={clsx('px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors rounded-lg uppercase tracking-wider', view === 'list' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300')}>
            <List className="w-4 h-4" /> Liste
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card py-20 flex flex-col items-center justify-center rounded-2xl border border-gray-800/60">
          <div className="w-12 h-12 rounded-full border-4 border-rose-900 border-t-rose-500 animate-spin mb-4" />
          <p className="text-gray-400 font-medium tracking-wide">Takvim verileri yükleniyor...</p>
        </div>
      ) : (
        <>
          {view === 'month' && (
            <div className="glass-card rounded-2xl border border-gray-800/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-7 border-b border-gray-800/80 bg-gray-900/90">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="py-3.5 text-center text-xs font-black uppercase tracking-widest text-gray-500">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 bg-gray-900/40">
                {calendarDays.map((date, idx) => {
                  const iso = date?.toISOString().split('T')[0]
                  const isToday = iso === today
                  const dayEvents = date ? eventsOnDate(date) : []
                  return (
                    <div key={idx} className={clsx('min-h-[120px] p-2 border-b border-r border-gray-800/40 transition-colors group', date ? 'hover:bg-gray-800/30' : 'bg-gray-900/20 opacity-40', isToday && 'bg-rose-900/10')}>
                      {date && (
                        <div className="flex flex-col h-full">
                          <div className="flex justify-between items-start mb-2">
                            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-inner transition-all', isToday ? 'bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white shadow-rose-500/30' : 'text-gray-400 group-hover:text-gray-200')}>
                              {date.getDate()}
                            </div>
                            {dayEvents.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50 mt-2 mr-1"></div>}
                          </div>
                          <div className="space-y-1.5 mt-auto">
                            {dayEvents.slice(0, 3).map(ev => {
                              const cat = CATEGORY_MAP[ev.category] ?? CATEGORY_MAP.diger
                              return (
                                <div key={ev.id} onClick={() => setSelected(ev)} className="truncate px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] hover:brightness-110 border" style={{ background: cat.bg, color: cat.color, borderColor: cat.border }}>
                                  <span className="opacity-70 mr-1">{ev.start_time}</span>{ev.title}
                                </div>
                              )
                            })}
                            {dayEvents.length > 3 && <div className="text-[10px] px-2 py-0.5 font-semibold text-gray-500 group-hover:text-gray-300 transition-colors cursor-pointer">+{dayEvents.length - 3} etkinlik daha</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {view === 'list' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {upcomingEvents.length === 0 ? (
                <div className="glass-card py-20 text-center rounded-2xl border border-gray-800/60 border-dashed bg-gray-900/20">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-gray-900/50"><CalendarHeart className="w-10 h-10 text-gray-600" /></div>
                  <h3 className="text-2xl font-black text-gray-200 tracking-tight">Etkinlik Yok</h3>
                  <p className="text-gray-500 mt-2">Geçerli döneme ait bir etkinlik bulunmuyor.</p>
                </div>
              ) : (
                (() => {
                  let lastMonth = ''
                  return upcomingEvents.map(ev => {
                    const d = new Date(ev.date)
                    const monthKey = `${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`
                    const showHeader = monthKey !== lastMonth
                    if (showHeader) lastMonth = monthKey
                    const cat = CATEGORY_MAP[ev.category] ?? CATEGORY_MAP.diger
                    return (
                      <div key={ev.id} className="relative">
                        {showHeader && (
                          <div className="flex items-center gap-4 mt-8 mb-4 pl-2"><h3 className="text-lg font-black text-white uppercase tracking-widest shrink-0">{monthKey}</h3><div className="h-px bg-gradient-to-r from-gray-700 to-transparent flex-1"></div></div>
                        )}
                        <div className="glass-card p-5 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 group overflow-hidden relative mb-3" style={{ borderColor: cat.border, background: `linear-gradient(135deg, ${cat.bg.replace('0.1', '0.03')}, rgba(15, 23, 42, 0.4))` }} onClick={() => setSelected(ev)}>
                          <div className="absolute left-0 top-0 bottom-0 w-1 opacity-50 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: cat.color }}></div>
                          <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-inner" style={{ background: cat.bg, borderColor: cat.border }}>
                            <div className="text-2xl font-black leading-none" style={{ color: cat.color }}>{d.getDate()}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: cat.color }}>{DAYS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border" style={{ background: cat.bg, color: cat.color, borderColor: cat.border }}>{cat.label}</span>
                              {ev.is_public && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-gray-800 text-gray-400 border border-gray-700">Herkese Açık</span>}
                            </div>
                            <h4 className="text-lg font-bold text-white truncate group-hover:text-rose-100 transition-colors mb-2">{ev.title}</h4>
                            <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-400">
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-500" />{ev.start_time} - {ev.end_time}</span>
                              {ev.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-500" />{ev.location}</span>}
                            </div>
                          </div>
                          <div className="hidden sm:flex w-10 h-10 rounded-full border border-gray-700 bg-gray-800/50 items-center justify-center text-gray-500 group-hover:text-white group-hover:border-gray-500 transition-all"><ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></div>
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="glass-card w-full max-w-lg p-0 rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden relative">
            <div className="h-32 w-full absolute top-0 left-0 opacity-20 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${CATEGORY_MAP[selected.category]?.color ?? '#64748b'}, transparent)` }}></div>
            <div className="p-8 relative z-10 text-center">
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors bg-gray-900/50"><X className="w-5 h-5" /></button>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-dashed shadow-2xl rotate-3" style={{ background: CATEGORY_MAP[selected.category]?.bg ?? '#64748b15', borderColor: CATEGORY_MAP[selected.category]?.color ?? '#64748b' }}><Tag className="w-8 h-8" style={{ color: CATEGORY_MAP[selected.category]?.color ?? '#64748b' }} /></div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-3 shadow-inner" style={{ background: CATEGORY_MAP[selected.category]?.bg ?? '#64748b15', color: CATEGORY_MAP[selected.category]?.color ?? '#64748b', borderColor: CATEGORY_MAP[selected.category]?.border ?? '#64748b30' }}>{CATEGORY_MAP[selected.category]?.label ?? 'Diğer'}</span>
              <h3 className="text-2xl font-black text-white px-4 leading-tight mb-6">{selected.title}</h3>
              <div className="grid grid-cols-2 gap-3 text-left bg-gray-900/60 p-4 rounded-2xl border border-gray-800">
                <div className="space-y-1"><div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Tarih</div><div className="text-sm font-semibold text-gray-200">{new Date(selected.date).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })}</div></div>
                <div className="space-y-1"><div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Zaman</div><div className="text-sm font-semibold text-gray-200">{selected.start_time} - {selected.end_time}</div></div>
                {selected.location && (
                  <div className="col-span-2 space-y-1 pt-2 border-t border-gray-800/60 mt-2">
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" /> Konum / Adres</div>
                    <div className="text-sm font-semibold text-gray-200">{selected.location}</div>
                    {selected.address && <div className="text-xs text-gray-500 font-medium mt-0.5">{selected.address}</div>}
                  </div>
                )}
              </div>
              {selected.description && <div className="text-left mt-4 p-4 rounded-2xl bg-gray-900/40 border border-gray-800/40 text-sm text-gray-300 leading-relaxed font-medium">{selected.description}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
