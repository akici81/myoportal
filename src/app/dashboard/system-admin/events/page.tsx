'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight,
  MapPin, Clock, X, List, Grid3X3, Trash2, Tag, Info, CalendarHeart
} from 'lucide-react'
import type { CalendarEvent } from '@/types'
import clsx from 'clsx'

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const DAYS_SHORT = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']

// Yeni Premium Renk Kodlamaları
const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  akademik: { label: 'Akademik',  color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)' }, // Blue
  sosyal:   { label: 'Sosyal',    color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' }, // Emerald
  kurul:    { label: 'Kurul/Toplantı', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)' }, // Violet
  staj:     { label: 'Staj/Kariyer', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' }, // Amber
  diger:    { label: 'Diğer',     color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)' }, // Slate
}

interface EventForm {
  title: string
  description: string
  category: string
  date: string
  start_time: string
  end_time: string
  location: string
  address: string
  is_public: boolean
}

const EMPTY_FORM: EventForm = {
  title: '', description: '', category: 'akademik',
  date: new Date().toISOString().split('T')[0],
  start_time: '09:00', end_time: '10:00',
  location: '', address: '', is_public: true,
}

export default function EventsPage() {
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  
  const [view, setView] = useState<'month' | 'list'>('month')
  const [currentDate, setCurrent] = useState(new Date())
  
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  
  const [filterCat, setFilterCat] = useState<string>('all')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const adminRoles = ['system_admin', 'mudur', 'mudur_yardimcisi', 'sekreter', 'bolum_baskani']
      setIsAdmin(adminRoles.includes(data?.role ?? ''))
    })
  }, [supabase])

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('events').select('*').order('date').order('start_time')
    setEvents(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Takvim Matrisi Hesaplama
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

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('events').insert({
        ...form,
        created_by: user!.id,
      })
      if (error) throw error
      toast.success('Etkinlik takvime eklendi')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err: any) {
      toast.error('Kayıt edilemedi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteEvent(id: string) {
    if (!confirm('Etkinlik kalıcı olarak silinsin mi?')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) toast.error('Silinemedi: ' + error.message)
    else {
      toast.success('Etkinlik silindi')
      setSelected(null)
      load()
    }
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900/40 via-fuchsia-900/20 to-gray-900 p-8 border border-rose-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <CalendarHeart className="w-48 h-48 text-rose-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              Etkinlik Takvimi
            </h1>
            <p className="mt-2 text-gray-400 max-w-2xl font-medium">
              MYO içerisindeki tüm akademik kurul toplantıları, sosyal etkinlikler, staj başvuruları ve seminerleri takip edin.
            </p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowForm(true)} 
              className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
              style={{ backgroundImage: 'linear-gradient(135deg, #e11d48, #c026d3)', boxShadow: '0 0 20px rgba(225, 29, 72, 0.3)' }}
            >
              <Plus className="w-5 h-5" />
              <span>Yeni Etkinlik Oluştur</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="card p-4 rounded-xl flex flex-col lg:flex-row gap-5 items-center justify-between border border-gray-800/60 shadow-xl">
        
        {/* Month Navigation */}
        <div className="flex items-center gap-1.5 bg-gray-900/50 p-1.5 rounded-xl border border-gray-700/50">
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-black text-white px-2 min-w-[140px] text-center uppercase tracking-widest">
            <span className="text-rose-400">{MONTHS_TR[currentDate.getMonth()]}</span> {currentDate.getFullYear()}
          </div>
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
                  className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-gray-700 mx-1"></div>
          <button onClick={() => setCurrent(new Date())}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-all uppercase tracking-wider">
            Bugün
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 flex-wrap justify-center flex-1">
          <button onClick={() => setFilterCat('all')}
                  className={clsx('px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all border', filterCat === 'all' ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-[0_0_10px_rgba(225,29,72,0.2)]' : 'border-gray-700/50 bg-gray-900/50 text-gray-400 hover:text-white hover:border-gray-600')}>
            Tümü
          </button>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => (
            <button key={k} onClick={() => setFilterCat(k)}
                    className={clsx('px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all border flex items-center gap-1.5', filterCat === k ? '' : 'opacity-60 hover:opacity-100 hover:border-gray-600 bg-gray-900/50')}
                    style={filterCat === k ? { background: v.bg, color: v.color, borderColor: v.border, boxShadow: `0 0 10px ${v.bg}` } : { color: v.color, borderColor: 'transparent' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }}></div>
              {v.label}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700/80 bg-gray-900/80 p-1">
          <button onClick={() => setView('month')}
                  className={clsx('px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors rounded-lg uppercase tracking-wider', view === 'month' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300')}>
            <Grid3X3 className="w-4 h-4" /> Takvim
          </button>
          <button onClick={() => setView('list')}
                  className={clsx('px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors rounded-lg uppercase tracking-wider', view === 'list' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300')}>
            <List className="w-4 h-4" /> Liste
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card py-20 flex flex-col items-center justify-center rounded-2xl border border-gray-800/60">
          <div className="w-12 h-12 rounded-full border-4 border-rose-900 border-t-rose-500 animate-spin mb-4" />
          <p className="text-gray-400 font-medium tracking-wide">Takvim verileri yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* ── MONTH VIEW ── */}
          {view === 'month' && (
            <div className="card rounded-2xl border border-gray-800/60 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-800/80 bg-gray-900/90">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="py-3.5 text-center text-xs font-black uppercase tracking-widest text-gray-500">
                    {d}
                  </div>
                ))}
              </div>
              
              {/* Days Grid */}
              <div className="grid grid-cols-7 bg-gray-900/40">
                {calendarDays.map((date, idx) => {
                  const iso = date?.toISOString().split('T')[0]
                  const isToday = iso === today
                  const dayEvents = date ? eventsOnDate(date) : []
                  
                  return (
                    <div key={idx}
                         className={clsx(
                           'min-h-[120px] p-2 border-b border-r border-gray-800/40 transition-colors group',
                           date ? 'hover:bg-gray-800/30' : 'bg-gray-900/20 opacity-40',
                           isToday && 'bg-rose-900/10'
                         )}>
                      {date && (
                        <div className="flex flex-col h-full">
                          {/* Date Number */}
                          <div className="flex justify-between items-start mb-2">
                            <div className={clsx(
                              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-inner transition-all',
                              isToday ? 'bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white' : 'text-gray-400 group-hover:text-gray-200'
                            )}>
                              {date.getDate()}
                            </div>
                            {dayEvents.length > 0 && (
                              <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50 mt-2 mr-1"></div>
                            )}
                          </div>
                          
                          {/* Events List */}
                          <div className="space-y-1.5 mt-auto">
                            {dayEvents.slice(0, 3).map(ev => {
                              const cat = CATEGORY_MAP[ev.category] ?? CATEGORY_MAP.diger
                              return (
                                <div key={ev.id}
                                     onClick={() => setSelected(ev)}
                                     className="truncate px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] hover:brightness-110 border"
                                     style={{ background: cat.bg, color: cat.color, borderColor: cat.border }}>
                                  <span className="opacity-70 mr-1">{ev.start_time}</span>
                                  {ev.title}
                                </div>
                              )
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] px-2 py-0.5 font-semibold text-gray-500 group-hover:text-gray-300 transition-colors cursor-pointer">
                                +{dayEvents.length - 3} etkinlik daha
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {upcomingEvents.length === 0 ? (
                <div className="card py-20 text-center rounded-2xl border border-gray-800/60 border-dashed bg-gray-900/20">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-gray-900/50">
                    <CalendarHeart className="w-10 h-10 text-gray-600" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-200 tracking-tight">Yaklaşan Etkinlik Yok</h3>
                  <p className="text-gray-500 mt-2">Görünüşe göre yakın zamanda planlanmış bir etkinlik bulunmuyor.</p>
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
                          <div className="flex items-center gap-4 mt-8 mb-4 pl-2">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest shrink-0">{monthKey}</h3>
                            <div className="h-px bg-gradient-to-r from-gray-700 to-transparent flex-1"></div>
                          </div>
                        )}
                        
                        <div 
                          className="card p-5 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 group overflow-hidden relative mb-3"
                          style={{ borderColor: cat.border, background: `linear-gradient(135deg, ${cat.bg.replace('0.1', '0.03')}, rgba(15, 23, 42, 0.4))` }}
                          onClick={() => setSelected(ev)}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1 opacity-50 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: cat.color }}></div>
                          
                          {/* Top Date Box */}
                          <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center shrink-0 border shadow-inner" style={{ background: cat.bg, borderColor: cat.border }}>
                            <div className="text-2xl font-black leading-none" style={{ color: cat.color }}>{d.getDate()}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: cat.color }}>
                              {DAYS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                            </div>
                          </div>
                          
                          {/* Event Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border" style={{ background: cat.bg, color: cat.color, borderColor: cat.border }}>
                                {cat.label}
                              </span>
                              {ev.is_public && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest bg-gray-800 text-gray-400 border border-gray-700">Herkese Açık</span>
                              )}
                            </div>
                            
                            <h4 className="text-lg font-bold text-white truncate group-hover:text-rose-100 transition-colors mb-2">
                              {ev.title}
                            </h4>
                            
                            <div className="flex flex-wrap gap-4 text-xs font-medium text-gray-400">
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-500" />{ev.start_time} - {ev.end_time}</span>
                              {ev.location && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-500" />{ev.location}</span>}
                            </div>
                          </div>
                          
                          <div className="hidden sm:flex w-10 h-10 rounded-full border border-gray-700 bg-gray-800/50 items-center justify-center text-gray-500 group-hover:text-white group-hover:border-gray-500 transition-all">
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
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

      {/* EVENT DETAIL MODAL */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in zoom-in-95 duration-200">
          <div className="card w-full max-w-lg p-0 rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden relative">
            
            {/* Modal Header Gradient */}
            <div className="h-32 w-full absolute top-0 left-0 opacity-20 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${CATEGORY_MAP[selected.category]?.color ?? '#64748b'}, transparent)` }}></div>
            
            <div className="p-8 relative z-10 text-center">
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors bg-gray-900/50">
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center border-2 border-dashed shadow-2xl rotate-3" style={{ background: CATEGORY_MAP[selected.category]?.bg ?? '#64748b15', borderColor: CATEGORY_MAP[selected.category]?.color ?? '#64748b' }}>
                <Tag className="w-8 h-8" style={{ color: CATEGORY_MAP[selected.category]?.color ?? '#64748b' }} />
              </div>
              
              <span className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border mb-3 shadow-inner" style={{ background: CATEGORY_MAP[selected.category]?.bg ?? '#64748b15', color: CATEGORY_MAP[selected.category]?.color ?? '#64748b', borderColor: CATEGORY_MAP[selected.category]?.border ?? '#64748b30' }}>
                {CATEGORY_MAP[selected.category]?.label ?? 'Diğer'}
              </span>
              
              <h3 className="text-2xl font-black text-white px-4 leading-tight mb-6">{selected.title}</h3>
              
              <div className="grid grid-cols-2 gap-3 text-left bg-gray-900/60 p-4 rounded-2xl border border-gray-800">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Tarih</div>
                  <div className="text-sm font-semibold text-gray-200">{new Date(selected.date).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' })}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Zaman</div>
                  <div className="text-sm font-semibold text-gray-200">{selected.start_time} - {selected.end_time}</div>
                </div>
                {selected.location && (
                  <div className="col-span-2 space-y-1 pt-2 border-t border-gray-800/60 mt-2">
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3" /> Konum / Adres</div>
                    <div className="text-sm font-semibold text-gray-200">{selected.location}</div>
                    {selected.address && <div className="text-xs text-gray-500 font-medium mt-0.5">{selected.address}</div>}
                  </div>
                )}
              </div>
              
              {selected.description && (
                <div className="text-left mt-4 p-4 rounded-2xl bg-gray-900/40 border border-gray-800/40 text-sm text-gray-300 leading-relaxed font-medium">
                  {selected.description}
                </div>
              )}
            </div>
            
            {isAdmin && (
              <div className="p-4 bg-gray-900/80 border-t border-gray-800">
                <button onClick={() => deleteEvent(selected.id)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold transition-colors border border-rose-500/20">
                  <Trash2 className="w-4 h-4" /> Etkinliği İptal Et / Sil
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EVENT ADD MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in zoom-in-95 duration-200">
          <div className="card w-full max-w-2xl p-0 rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-rose-900/30 bg-gradient-to-r from-rose-950/80 to-gray-900 flex justify-between items-center">
              <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 flex items-center justify-center shadow-lg">
                  <CalendarDays className="w-5 h-5 text-white" />
                </div>
                Yeni Etkinlik Oluştur
              </h3>
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-xl p-2.5 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={saveEvent} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block pl-1">Etkinlik Başlığı <span className="text-rose-500">*</span></label>
                <input required className="w-full bg-gray-900/70 border border-gray-700/80 rounded-xl px-4 py-3 text-base font-bold text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 transition-colors placeholder:font-medium placeholder:text-gray-600" placeholder="Örn: 2026 Bahar Şenliği" value={form.title} onChange={e => setForm(f=>({...f, title: e.target.value}))} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block pl-1">Kategori</label>
                  <select className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-rose-500 transition-colors form-select appearance-none" value={form.category} onChange={e => setForm(f=>({...f, category: e.target.value}))}>
                    {Object.entries(CATEGORY_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block pl-1">Tarih <span className="text-rose-500">*</span></label>
                  <input required type="date" className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-rose-500 transition-colors" value={form.date} onChange={e => setForm(f=>({...f, date: e.target.value}))} />
                </div>
                
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block pl-1">Başlangıç Saati <span className="text-rose-500">*</span></label>
                  <input required type="time" className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-rose-500 transition-colors" value={form.start_time} onChange={e => setForm(f=>({...f, start_time: e.target.value}))} />
                </div>
                
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block pl-1">Bitiş Saati <span className="text-rose-500">*</span></label>
                  <input required type="time" className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none focus:border-rose-500 transition-colors" value={form.end_time} onChange={e => setForm(f=>({...f, end_time: e.target.value}))} />
                </div>
              </div>

              <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <h4 className="text-sm font-bold text-gray-300">Konum Bilgileri</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500 transition-colors placeholder:text-gray-600" placeholder="Kısa Konum (Örn: A-102 Amfi)" value={form.location} onChange={e => setForm(f=>({...f, location: e.target.value}))} />
                  </div>
                  <div>
                    <input className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-rose-500 transition-colors placeholder:text-gray-600" placeholder="Açık Adres (Opsiyonel)" value={form.address} onChange={e => setForm(f=>({...f, address: e.target.value}))} />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block pl-1">Etkinlik Açıklaması</label>
                <textarea className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-rose-500 transition-colors resize-none placeholder:text-gray-600" rows={3} placeholder="Etkinlik hakkında detaylı bilgi, katılımcı şartları, önemli notlar..." value={form.description} onChange={e => setForm(f=>({...f, description: e.target.value}))}></textarea>
              </div>

              <div className="pt-2 px-1">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={form.is_public} onChange={e => setForm(f=>({...f, is_public: e.target.checked}))} />
                  <div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                  <span className="ms-3 text-sm font-semibold text-gray-300">Herkese Açık Etkinlik <span className="text-gray-500 font-normal text-xs ml-1">(Öğrenciler dahil herkes görebilir)</span></span>
                </label>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-800">
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="px-4 py-3 rounded-xl font-bold text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white transition flex-1">İptal</button>
                <button type="submit" disabled={saving || !form.title || !form.date || !form.start_time || !form.end_time} className="px-4 py-3 rounded-xl text-sm font-black text-white flex-[2] flex items-center justify-center gap-2 shadow-lg transition-all bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Info className="w-4 h-4" /> }
                  {saving ? 'Kaydediliyor...' : 'Etkinliği Takvime Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
