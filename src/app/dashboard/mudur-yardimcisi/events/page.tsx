'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight,
  MapPin, Clock, Tag, X, List, Grid3X3, Trash2
} from 'lucide-react'

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const DAYS_SHORT = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']

const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  akademik: { label: 'Akademik',  color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  sosyal:   { label: 'Sosyal',    color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  kurul:    { label: 'Kurul',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  staj:     { label: 'Staj',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  diger:    { label: 'Diğer',     color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
}

interface EventForm {
  title: string; description: string; category: string
  date: string; start_time: string; end_time: string
  location: string; is_public: boolean
}

const EMPTY_FORM: EventForm = {
  title: '', description: '', category: 'akademik',
  date: new Date().toISOString().split('T')[0],
  start_time: '09:00', end_time: '10:00',
  location: '', is_public: true,
}

export default function EventsPage() {
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'month' | 'list'>('month')
  const [currentDate, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<any | null>(null)
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

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('events').select('*').order('date').order('start_time')
    setEvents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
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

  async function saveEvent() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('events').insert({ ...form, created_by: user!.id })
      if (error) throw error
      toast.success('Etkinlik eklendi')
      setShowForm(false)
      setForm(EMPTY_FORM)
      load()
    } catch (e: any) { toast.error('Hata: ' + e.message) }
    setSaving(false)
  }

  async function deleteEvent(id: string) {
    if (!confirm('Etkinlik silinsin mi?')) return
    await supabase.from('events').delete().eq('id', id)
    toast.success('Etkinlik silindi')
    setSelected(null)
    load()
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-violet-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <CalendarDays className="w-48 h-48 text-red-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Etkinlik Takvimi
            </h1>
            <p className="mt-2 text-gray-400">{MONTHS_TR[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowForm(true)}
              className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0"
              style={{ backgroundImage: 'linear-gradient(135deg, #8b5cf6, #a855f7)', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
              <Plus className="w-5 h-5" /> Etkinlik Ekle
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4 rounded-xl border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
            className="p-2 rounded-lg hover:card text-gray-500 hover:text-white transition"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-base font-bold text-white px-3 min-w-[150px] text-center">
            {MONTHS_TR[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
            className="p-2 rounded-lg hover:card text-gray-500 hover:text-white transition"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrent(new Date())}
            className="ml-1 px-3 py-1.5 text-xs rounded-lg border text-gray-400 hover:text-white hover:border-gray-500 transition">Bugün</button>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${filterCat === 'all' ? 'border-red-600/50 bg-red-600/15 text-red-400' : 'border-gray-700 text-gray-500 hover:text-white'}`}>Tümü</button>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => (
            <button key={k} onClick={() => setFilterCat(k)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition ${filterCat === k ? '' : 'border-transparent opacity-60 hover:opacity-50'}`}
              style={filterCat === k ? { background: v.bg, color: v.color, borderColor: v.color + '50' } : { color: v.color }}>
              {v.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex rounded-lg overflow-hidden border">
          <button onClick={() => setView('month')}
            className={`px-3 py-2 text-xs flex items-center gap-1.5 transition ${view === 'month' ? 'card text-white' : 'text-gray-500 hover:text-white'}`}>
            <Grid3X3 className="w-3.5 h-3.5" /> Aylık
          </button>
          <button onClick={() => setView('list')}
            className={`px-3 py-2 text-xs flex items-center gap-1.5 transition ${view === 'list' ? 'card text-white' : 'text-gray-500 hover:text-white'}`}>
            <List className="w-3.5 h-3.5" /> Liste
          </button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="card overflow-hidden rounded-xl border">
          <div className="grid grid-cols-7 border-b" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {DAYS_SHORT.map(d => (
              <div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((date, idx) => {
              const iso = date?.toISOString().split('T')[0]
              const isToday = iso === today
              const dayEvents = date ? eventsOnDate(date) : []
              return (
                <div key={idx}
                  className={`min-h-[100px] p-1.5 border-b border-r transition ${date ? '' : 'opacity-0 pointer-events-none'} ${isToday ? 'bg-red-600/5' : ''}`}>
                  {date && (<>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${isToday ? 'bg-red-600 text-white' : 'text-gray-400'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => {
                        const cat = CATEGORY_MAP[ev.category] ?? CATEGORY_MAP.diger
                        return (
                          <div key={ev.id} onClick={() => setSelected(ev)}
                            className="truncate px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80 transition"
                            style={{ background: cat.bg, color: cat.color }}>
                            {ev.start_time} {ev.title}
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] px-1.5 py-0.5 text-gray-600">+{dayEvents.length - 3} daha</div>
                      )}
                    </div>
                  </>)}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="space-y-3">
          {upcomingEvents.length === 0 ? (
            <div className="card py-16 text-center rounded-xl border">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="font-medium text-white">Yaklaşan etkinlik yok</p>
            </div>
          ) : (
            upcomingEvents.map(ev => {
              const d = new Date(ev.date)
              const cat = CATEGORY_MAP[ev.category] ?? CATEGORY_MAP.diger
              return (
                <div key={ev.id} className="card p-4 rounded-xl border cursor-pointer hover:border-gray-600 transition flex items-start gap-4"
                  onClick={() => setSelected(ev)}>
                  <div className="w-12 text-center flex-shrink-0">
                    <div className="text-xl font-bold text-white">{d.getDate()}</div>
                    <div className="text-[10px] font-semibold uppercase" style={{ color: cat.color }}>
                      {MONTHS_TR[d.getMonth()].slice(0,3)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-white truncate">{ev.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-semibold"
                        style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ev.start_time}{ev.end_time && ` – ${ev.end_time}`}</span>
                      {ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Event Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in">
          <div className="card w-full max-w-md p-6 rounded-2xl border shadow-2xl relative">
            <button onClick={() => setSelected(null)} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:card transition">
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: (CATEGORY_MAP[selected.category]?.bg ?? 'rgba(100,116,139,0.08)'), color: (CATEGORY_MAP[selected.category]?.color ?? '#64748b') }}>
              {CATEGORY_MAP[selected.category]?.label ?? 'Diğer'}
            </span>
            <h3 className="text-lg font-bold text-white mt-3 mb-4">{selected.title}</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />{new Date(selected.date).toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{selected.start_time}{selected.end_time && ` – ${selected.end_time}`}</div>
              {selected.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{selected.location}</div>}
              {selected.description && <p className="pt-2 border-t">{selected.description}</p>}
            </div>
            {isAdmin && (
              <button onClick={() => deleteEvent(selected.id)}
                className="w-full mt-4 py-2 rounded-lg text-sm font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Etkinliği Sil
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in">
          <div className="card w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:card transition">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-5 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-red-400" /> Yeni Etkinlik</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Başlık</label>
                <input className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:border-red-600" placeholder="Etkinlik adı" value={form.title} onChange={e => setForm(f=>({...f, title: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Kategori</label>
                  <select className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:border-red-600" value={form.category} onChange={e => setForm(f=>({...f, category: e.target.value}))}>
                    {Object.entries(CATEGORY_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Tarih</label>
                  <input type="date" className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:border-red-600" value={form.date} onChange={e => setForm(f=>({...f, date: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Başlangıç</label>
                  <input type="time" className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:border-red-600" value={form.start_time} onChange={e => setForm(f=>({...f, start_time: e.target.value}))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 mb-1.5 block">Bitiş</label>
                  <input type="time" className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:border-red-600" value={form.end_time} onChange={e => setForm(f=>({...f, end_time: e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Konum / Sınıf</label>
                <input className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:border-red-600" placeholder="B122, Amfi vb." value={form.location} onChange={e => setForm(f=>({...f, location: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Açıklama</label>
                <textarea className="w-full card border rounded-lg px-3 py-2.5 text-sm text-white focus:border-red-600 resize-none" rows={3} placeholder="Detay..." value={form.description} onChange={e => setForm(f=>({...f, description: e.target.value}))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_public} onChange={e => setForm(f=>({...f, is_public: e.target.checked}))} className="rounded" />
                <span className="text-sm text-gray-400">Herkese görünür</span>
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} className="flex-1 px-4 py-2.5 rounded-lg text-sm card text-gray-400 hover:bg-gray-700 hover:text-white">İptal</button>
              <button onClick={saveEvent} disabled={saving || !form.title || !form.date}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-red-700 text-white hover:bg-red-600 disabled:opacity-50">
                {saving ? 'Kaydediliyor...' : 'Etkinlik Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
