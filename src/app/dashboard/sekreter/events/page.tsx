'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CalendarDays, Plus, ChevronLeft, ChevronRight, MapPin, Clock, X, List, Grid3X3, Trash2 } from 'lucide-react'

const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const DAYS_SHORT = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']
const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  akademik: { label: 'Akademik', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  sosyal: { label: 'Sosyal', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  kurul: { label: 'Kurul', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  staj: { label: 'Staj', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  diger: { label: 'Diğer', color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
}

export default function SekreterEventsPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<any[]>([])
  const [view, setView] = useState<'month' | 'list'>('month')
  const [currentDate, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'akademik', date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:00', location: '', is_public: true })
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('all')

  async function load() {
    const { data } = await supabase.from('events').select('*').order('date').order('start_time')
    setEvents(data ?? [])
  }
  useEffect(() => { load() }, [])

  const calendarDays = useMemo(() => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth()
    const first = new Date(y, m, 1), last = new Date(y, m + 1, 0)
    let s = first.getDay() - 1; if (s < 0) s = 6
    const days: (Date | null)[] = Array(s).fill(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, m, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [currentDate])

  const today = new Date().toISOString().split('T')[0]
  const eventsOnDate = (date: Date) => {
    const iso = date.toISOString().split('T')[0]
    return events.filter(e => e.date === iso && (filterCat === 'all' || e.category === filterCat))
  }
  const upcoming = useMemo(() => events.filter(e => e.date >= today && (filterCat === 'all' || e.category === filterCat)).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)), [events, filterCat, today])

  async function saveEvent() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('events').insert({ ...form, created_by: user!.id })
      if (error) throw error
      toast.success('Etkinlik eklendi'); setShowForm(false); load()
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }
  async function deleteEvent(id: string) {
    if (!confirm('Silinsin mi?')) return
    await supabase.from('events').delete().eq('id', id)
    toast.success('Silindi'); setSelected(null); load()
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-violet-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12"><CalendarDays className="w-48 h-48 text-red-400" /></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-default" style={{ color: 'var(--text)' }}>Etkinlik Takvimi</h1>
            <p className="mt-2 text-muted">{MONTHS_TR[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, #8b5cf6, #a855f7)', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>
            <Plus className="w-5 h-5" /> Etkinlik Ekle
          </button>
        </div>
      </div>

      <div className="card p-4 rounded-xl border flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} className="p-2 rounded-lg hover:card text-gray-500 hover:text-default transition"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-base font-bold text-default px-3 min-w-[150px] text-center" style={{ color: 'var(--text)' }}>{MONTHS_TR[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <button onClick={() => setCurrent(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} className="p-2 rounded-lg hover:card text-gray-500 hover:text-default transition"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrent(new Date())} className="ml-1 px-3 py-1.5 text-xs rounded-lg border text-muted hover:text-default">Bugün</button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 text-xs rounded-lg border transition ${filterCat === 'all' ? 'border-red-600/50 bg-red-600/15 text-red-400' : 'border-gray-700 text-gray-500'}`}>Tümü</button>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => (<button key={k} onClick={() => setFilterCat(k)} className={`px-3 py-1.5 text-xs rounded-lg border transition ${filterCat === k ? '' : 'border-transparent opacity-60 hover:opacity-50'}`} style={filterCat === k ? { background: v.bg, color: v.color, borderColor: v.color + '50' } : { color: v.color }}>{v.label}</button>))}
        </div>
        <div className="ml-auto flex rounded-lg overflow-hidden border">
          <button onClick={() => setView('month')} className={`px-3 py-2 text-xs flex items-center gap-1.5 ${view === 'month' ? 'card text-white' : 'text-gray-500'}`}><Grid3X3 className="w-3.5 h-3.5" /> Aylık</button>
          <button onClick={() => setView('list')} className={`px-3 py-2 text-xs flex items-center gap-1.5 ${view === 'list' ? 'card text-white' : 'text-gray-500'}`}><List className="w-3.5 h-3.5" /> Liste</button>
        </div>
      </div>

      {view === 'month' && (
        <div className="card overflow-hidden rounded-xl border">
          <div className="grid grid-cols-7 border-b" style={{ background: 'rgba(0,0,0,0.3)' }}>{DAYS_SHORT.map(d => (<div key={d} className="py-2.5 text-center text-xs font-semibold text-gray-500">{d}</div>))}</div>
          <div className="grid grid-cols-7">
            {calendarDays.map((date, idx) => {
              const iso = date?.toISOString().split('T')[0]
              const isToday = iso === today
              const dayEv = date ? eventsOnDate(date) : []
              return (<div key={idx} className={`min-h-[100px] p-1.5 border-b border-r ${date ? '' : 'opacity-0'} ${isToday ? 'bg-red-600/5' : ''}`}>
                {date && (<><div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${isToday ? 'bg-red-600 text-white' : 'text-muted'}`}>{date.getDate()}</div>
                  <div className="space-y-0.5">{dayEv.slice(0, 3).map(ev => { const cat = CATEGORY_MAP[ev.category] ?? CATEGORY_MAP.diger; return (<div key={ev.id} onClick={() => setSelected(ev)} className="truncate px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80" style={{ background: cat.bg, color: cat.color }}>{ev.start_time} {ev.title}</div>) })}
                    {dayEv.length > 3 && <div className="text-[10px] px-1.5 text-gray-600">+{dayEv.length - 3}</div>}
                  </div></>)}
              </div>)
            })}
          </div>
        </div>
      )}

      {view === 'list' && (<div className="space-y-3">{upcoming.length === 0 ? (<div className="card py-16 text-center rounded-xl"><CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-600" /><p className="text-default font-medium">Yaklaşan etkinlik yok</p></div>) : upcoming.map(ev => { const d = new Date(ev.date); const cat = CATEGORY_MAP[ev.category] ?? CATEGORY_MAP.diger; return (<div key={ev.id} className="card p-4 rounded-xl border cursor-pointer hover:border-gray-600 flex items-start gap-4" onClick={() => setSelected(ev)}><div className="w-12 text-center flex-shrink-0"><div className="text-xl font-bold text-default" style={{ color: 'var(--text)' }}>{d.getDate()}</div><div className="text-[10px] font-semibold uppercase" style={{ color: cat.color }}>{MONTHS_TR[d.getMonth()].slice(0,3)}</div></div><div className="flex-1 min-w-0"><div className="flex items-start justify-between gap-2"><h4 className="font-semibold text-default truncate">{ev.title}</h4><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span></div><div className="flex gap-3 mt-1.5 text-xs text-muted"><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ev.start_time}</span>{ev.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</span>}</div></div></div>) })}</div>)}

      {selected && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in"><div className="card w-full max-w-md p-6 rounded-2xl border shadow-2xl relative"><button onClick={() => setSelected(null)} className="absolute right-4 top-4 p-2 text-muted hover:text-default rounded-lg hover:card"><X className="w-5 h-5" /></button><span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: (CATEGORY_MAP[selected.category]?.bg ?? ''), color: (CATEGORY_MAP[selected.category]?.color ?? '#64748b') }}>{CATEGORY_MAP[selected.category]?.label ?? 'Diğer'}</span><h3 className="text-lg font-bold text-default mt-3 mb-4" style={{ color: 'var(--text)' }}>{selected.title}</h3><div className="space-y-2 text-sm text-muted"><div className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />{new Date(selected.date).toLocaleDateString('tr-TR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div><div className="flex items-center gap-2"><Clock className="w-4 h-4" />{selected.start_time}{selected.end_time && ` – ${selected.end_time}`}</div>{selected.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{selected.location}</div>}{selected.description && <p className="pt-2 border-t">{selected.description}</p>}</div><button onClick={() => deleteEvent(selected.id)} className="w-full mt-4 py-2 rounded-lg text-sm bg-red-600/20 text-red-400 hover:bg-red-600/30 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Sil</button></div></div>)}

      {showForm && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in"><div className="card w-full max-w-lg p-6 rounded-2xl border shadow-2xl relative"><button onClick={() => setShowForm(false)} className="absolute right-4 top-4 p-2 text-muted hover:text-default rounded-lg hover:card"><X className="w-5 h-5" /></button><h3 className="text-xl font-bold text-default mb-5 flex items-center gap-2" style={{ color: 'var(--text)' }}><CalendarDays className="w-5 h-5 text-red-400" /> Yeni Etkinlik</h3><div className="space-y-4"><div><label className="text-xs font-medium text-muted mb-1.5 block">Başlık</label><input className="w-full card border rounded-lg px-3 py-2.5 text-sm text-default" value={form.title} onChange={e => setForm(f=>({...f, title: e.target.value}))} /></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium text-muted mb-1.5 block">Kategori</label><select className="w-full card border rounded-lg px-3 py-2.5 text-sm text-default" value={form.category} onChange={e => setForm(f=>({...f, category: e.target.value}))}>{Object.entries(CATEGORY_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}</select></div><div><label className="text-xs font-medium text-muted mb-1.5 block">Tarih</label><input type="date" className="w-full card border rounded-lg px-3 py-2.5 text-sm text-default" value={form.date} onChange={e => setForm(f=>({...f, date: e.target.value}))} /></div><div><label className="text-xs font-medium text-muted mb-1.5 block">Başlangıç</label><input type="time" className="w-full card border rounded-lg px-3 py-2.5 text-sm text-default" value={form.start_time} onChange={e => setForm(f=>({...f, start_time: e.target.value}))} /></div><div><label className="text-xs font-medium text-muted mb-1.5 block">Bitiş</label><input type="time" className="w-full card border rounded-lg px-3 py-2.5 text-sm text-default" value={form.end_time} onChange={e => setForm(f=>({...f, end_time: e.target.value}))} /></div></div><div><label className="text-xs font-medium text-muted mb-1.5 block">Konum</label><input className="w-full card border rounded-lg px-3 py-2.5 text-sm text-default" value={form.location} onChange={e => setForm(f=>({...f, location: e.target.value}))} /></div><div><label className="text-xs font-medium text-muted mb-1.5 block">Açıklama</label><textarea className="w-full card border rounded-lg px-3 py-2.5 text-sm text-default resize-none" rows={2} value={form.description} onChange={e => setForm(f=>({...f, description: e.target.value}))} /></div></div><div className="flex gap-3 mt-5"><button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-lg text-sm card text-muted">İptal</button><button onClick={saveEvent} disabled={saving || !form.title} className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-red-700 text-default hover:bg-red-600 disabled:opacity-50">{saving ? '...' : 'Kaydet'}</button></div></div></div>)}
    </div>
  )
}
