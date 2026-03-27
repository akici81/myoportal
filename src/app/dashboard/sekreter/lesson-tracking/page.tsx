'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Clock, Users, FileSpreadsheet, Download, RefreshCw, Filter,
  BookOpen, Building2, User, AlertTriangle, Loader2, Search
} from 'lucide-react'
import type { AcademicPeriod, Department, Program } from '@/types'
import clsx from 'clsx'

// ─── Types ──────────────────────────────────────────────────────────────────
interface LessonRecord {
  id: string
  schedule_entry_id: string
  period_id: string
  week_number: number
  lesson_date: string
  attendance_type: 'orgon' | 'uzem'
  instructor_signature: 'yapildi' | 'yapilmadi' | 'telafi' | null
  pdks_signature: 'yapildi' | 'yapilmadi' | null
  enrolled_students: number | null
  attending_students: number | null
  makeup_date: string | null
  makeup_note: string | null
  filled_by: string | null
  filled_at: string | null
  schedule_entries?: {
    id: string
    day_of_week: number
    instructor_id: string
    program_courses?: {
      id: string
      year_number: number
      courses?: { id: string; code: string; name: string }
      programs?: { id: string; name: string; short_code: string }
    }
    time_slots?: { id: string; start_time: string; end_time: string; slot_number: number }
    classrooms?: { id: string; name: string; building: string }
    instructors?: { id: string; full_name: string; title: string }
  }
  filler?: { id: string; full_name: string }
}

interface WeekInfo {
  week_number: number
  start_date: string
  end_date: string
}

const DAY_NAMES: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LessonTrackingPage() {
  const supabase = createClient()

  // State
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  
  const [currentWeek, setCurrentWeek] = useState(1)
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null)
  const [records, setRecords] = useState<LessonRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(false)
  
  // Filters
  const [filterDay, setFilterDay] = useState<number | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // ─── Initial Load ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('academic_periods').select('*').order('academic_year', { ascending: false })
      .then(({ data }) => {
        setPeriods(data ?? [])
        const active = data?.find(p => p.is_active) ?? data?.[0]
        if (active) setSelectedPeriod(active)
      })

    supabase.from('departments').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setDepartments(data ?? []))
  }, [supabase])

  // Department → Programs
  useEffect(() => {
    if (selectedDept === 'all') {
      setPrograms([])
      setSelectedProgram('all')
      return
    }
    supabase.from('programs').select('*').eq('department_id', selectedDept).eq('is_active', true).order('name')
      .then(({ data }) => {
        setPrograms(data ?? [])
      })
  }, [selectedDept, supabase])

  // Period değişince hafta bilgisini hesapla
  useEffect(() => {
    if (!selectedPeriod?.start_date) return
    calculateWeekInfo(currentWeek)
  }, [selectedPeriod, currentWeek])

  // Load records when filters change
  useEffect(() => {
    if (selectedPeriod) {
      loadRecords()
    }
  }, [selectedPeriod, currentWeek])

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const calculateWeekInfo = (weekNum: number) => {
    if (!selectedPeriod?.start_date) return
    
    const startDate = new Date(selectedPeriod.start_date)
    const weekStart = new Date(startDate)
    weekStart.setDate(startDate.getDate() + (weekNum - 1) * 7)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 4) // Pazartesi-Cuma
    
    setWeekInfo({
      week_number: weekNum,
      start_date: weekStart.toISOString().split('T')[0],
      end_date: weekEnd.toISOString().split('T')[0]
    })
  }

  const loadRecords = useCallback(async () => {
    if (!selectedPeriod) return
    setLoading(true)
    
    try {
      const params = new URLSearchParams({
        period_id: selectedPeriod.id,
        week_number: currentWeek.toString()
      })
      
      if (selectedProgram !== 'all') {
        params.set('program_id', selectedProgram)
      }
      
      const res = await fetch(`/api/lesson-tracking?${params}`)
      const data = await res.json()
      
      if (res.ok) {
        setRecords(data)
      } else {
        toast.error(data.error || 'Kayıtlar yüklenemedi')
      }
    } catch (err) {
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, currentWeek, selectedProgram])

  const initializeWeek = async () => {
    if (!selectedPeriod || !weekInfo) return
    setInitializing(true)
    
    try {
      const res = await fetch('/api/lesson-tracking/init-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_id: selectedPeriod.id,
          week_number: currentWeek,
          start_date: weekInfo.start_date
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`${data.total_entries} ders için kayıt oluşturuldu`)
        loadRecords()
      } else {
        toast.error(data.error || 'Başlatma hatası')
      }
    } catch (err) {
      toast.error('Bir hata oluştu')
    } finally {
      setInitializing(false)
    }
  }

  const updateRecord = async (id: string, updates: Partial<LessonRecord>) => {
    try {
      const res = await fetch('/api/lesson-tracking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      })
      
      if (res.ok) {
        toast.success('Kayıt güncellendi')
        loadRecords()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Güncelleme hatası')
      }
    } catch (err) {
      toast.error('Bir hata oluştu')
    }
  }

  // ─── Filtered Records ─────────────────────────────────────────────────────
  const filteredRecords = records.filter(r => {
    // Day filter
    if (filterDay !== 'all' && r.schedule_entries?.day_of_week !== filterDay) return false
    
    // Status filter
    if (filterStatus === 'filled' && !r.instructor_signature) return false
    if (filterStatus === 'empty' && r.instructor_signature) return false
    if (filterStatus === 'yapildi' && r.instructor_signature !== 'yapildi') return false
    if (filterStatus === 'yapilmadi' && r.instructor_signature !== 'yapilmadi') return false
    if (filterStatus === 'telafi' && r.instructor_signature !== 'telafi') return false
    
    // Program filter (client side)
    if (selectedProgram !== 'all' && r.schedule_entries?.program_courses?.programs?.id !== selectedProgram) return false
    
    // Department filter
    if (selectedDept !== 'all') {
      // Bu filtreleme program üzerinden yapılıyor
    }
    
    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const course = r.schedule_entries?.program_courses?.courses
      const instructor = r.schedule_entries?.instructors
      const program = r.schedule_entries?.program_courses?.programs
      
      if (
        !course?.code.toLowerCase().includes(q) &&
        !course?.name.toLowerCase().includes(q) &&
        !instructor?.full_name.toLowerCase().includes(q) &&
        !program?.short_code.toLowerCase().includes(q)
      ) return false
    }
    
    return true
  })

  // Group by day
  const recordsByDay = filteredRecords.reduce((acc, record) => {
    const day = record.schedule_entries?.day_of_week || 0
    if (!acc[day]) acc[day] = []
    acc[day].push(record)
    return acc
  }, {} as Record<number, LessonRecord[]>)

  // Sort records within each day by time
  Object.keys(recordsByDay).forEach(day => {
    recordsByDay[parseInt(day)].sort((a, b) => {
      const timeA = a.schedule_entries?.time_slots?.start_time || ''
      const timeB = b.schedule_entries?.time_slots?.start_time || ''
      return timeA.localeCompare(timeB)
    })
  })

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total: records.length,
    filled: records.filter(r => r.instructor_signature).length,
    yapildi: records.filter(r => r.instructor_signature === 'yapildi').length,
    yapilmadi: records.filter(r => r.instructor_signature === 'yapilmadi').length,
    telafi: records.filter(r => r.instructor_signature === 'telafi').length,
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text)' }}>
            <FileSpreadsheet className="h-7 w-7 text-blue-500" />
            Ders Takip Formu
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Haftalık ders takip formlarını görüntüleyin ve yönetin
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadRecords()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            Yenile
          </button>
          
          <button
            onClick={initializeWeek}
            disabled={initializing || !weekInfo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
          >
            {initializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            Hafta Başlat
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Period */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Akademik Dönem</label>
          <select
            value={selectedPeriod?.id || ''}
            onChange={e => setSelectedPeriod(periods.find(p => p.id === e.target.value) || null)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.academic_year} {p.semester === 'fall' ? 'Güz' : 'Bahar'}
              </option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Bölüm</label>
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Tüm Bölümler</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Program */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Program</label>
          <select
            value={selectedProgram}
            onChange={e => setSelectedProgram(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            disabled={selectedDept === 'all'}
          >
            <option value="all">Tüm Programlar</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Day Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Gün</label>
          <select
            value={filterDay}
            onChange={e => setFilterDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Tüm Günler</option>
            {Object.entries(DAY_NAMES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Durum</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <option value="all">Tümü</option>
            <option value="filled">Doldurulmuş</option>
            <option value="empty">Boş</option>
            <option value="yapildi">Yapıldı</option>
            <option value="yapilmadi">Yapılmadı</option>
            <option value="telafi">Telafi</option>
          </select>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10">
        <button
          onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}
          disabled={currentWeek <= 1}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="text-center">
          <div className="text-2xl font-bold">{currentWeek}. Hafta</div>
          {weekInfo && (
            <div className="text-sm text-gray-400 mt-1">
              {new Date(weekInfo.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
              {' - '}
              {new Date(weekInfo.end_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
        
        <button
          onClick={() => setCurrentWeek(w => Math.min(16, w + 1))}
          disabled={currentWeek >= 16}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">Toplam Ders</div>
        </div>
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <div className="text-2xl font-bold text-blue-400">{stats.filled}</div>
          <div className="text-xs text-gray-500">Doldurulmuş</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="text-2xl font-bold text-emerald-400">{stats.yapildi}</div>
          <div className="text-xs text-gray-500">Yapıldı</div>
        </div>
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <div className="text-2xl font-bold text-rose-400">{stats.yapilmadi}</div>
          <div className="text-xs text-gray-500">Yapılmadı</div>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <div className="text-2xl font-bold text-amber-400">{stats.telafi}</div>
          <div className="text-xs text-gray-500">Telafi</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Ders kodu, ders adı, öğretim elemanı ara..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>

      {/* Records Table by Day */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Bu hafta için kayıt bulunamadı.</p>
          <p className="text-sm mt-2">Hafta başlat butonunu kullanarak kayıtları oluşturabilirsiniz.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map(day => {
            const dayRecords = recordsByDay[day] || []
            if (dayRecords.length === 0 && filterDay !== 'all') return null
            if (dayRecords.length === 0) return null
            
            return (
              <div key={day} className="rounded-2xl border border-white/10 overflow-hidden">
                {/* Day Header */}
                <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-blue-400" />
                    <span className="font-semibold">{DAY_NAMES[day]}</span>
                    {weekInfo && (
                      <span className="text-sm text-gray-500">
                        {new Date(new Date(weekInfo.start_date).getTime() + (day - 1) * 24 * 60 * 60 * 1000)
                          .toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{dayRecords.length} ders</span>
                </div>
                
                {/* Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/[0.02] text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Ders</th>
                        <th className="px-4 py-3 text-left font-medium">Program</th>
                        <th className="px-4 py-3 text-left font-medium">Saat</th>
                        <th className="px-4 py-3 text-left font-medium">Eğitmen</th>
                        <th className="px-4 py-3 text-center font-medium">UZEM/Örgün</th>
                        <th className="px-4 py-3 text-center font-medium">İmza</th>
                        <th className="px-4 py-3 text-center font-medium">PDKS</th>
                        <th className="px-4 py-3 text-center font-medium">Mevcut</th>
                        <th className="px-4 py-3 text-center font-medium">Katılım</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dayRecords.map(record => (
                        <tr key={record.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium">{record.schedule_entries?.program_courses?.courses?.code}</div>
                            <div className="text-xs text-gray-500 max-w-[200px] truncate">
                              {record.schedule_entries?.program_courses?.courses?.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium">
                              {record.schedule_entries?.program_courses?.programs?.short_code}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                            {record.schedule_entries?.time_slots?.start_time?.slice(0, 5)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-gray-300">
                                {record.schedule_entries?.instructors?.title} {record.schedule_entries?.instructors?.full_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={record.attendance_type}
                              onChange={e => updateRecord(record.id, { attendance_type: e.target.value as 'orgon' | 'uzem' })}
                              className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs focus:outline-none"
                            >
                              <option value="orgon">ÖRGÜN</option>
                              <option value="uzem">UZEM</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={record.instructor_signature || ''}
                              onChange={e => updateRecord(record.id, { instructor_signature: e.target.value as any || null })}
                              className={clsx(
                                'px-2 py-1 rounded-lg border text-xs focus:outline-none',
                                record.instructor_signature === 'yapildi' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                                record.instructor_signature === 'yapilmadi' && 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                                record.instructor_signature === 'telafi' && 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                                !record.instructor_signature && 'bg-white/5 border-white/10 text-gray-400'
                              )}
                            >
                              <option value="">-</option>
                              <option value="yapildi">Yapıldı</option>
                              <option value="yapilmadi">Yapılmadı</option>
                              <option value="telafi">Telafi</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <select
                              value={record.pdks_signature || ''}
                              onChange={e => updateRecord(record.id, { pdks_signature: e.target.value as any || null })}
                              className={clsx(
                                'px-2 py-1 rounded-lg border text-xs focus:outline-none',
                                record.pdks_signature === 'yapildi' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                                record.pdks_signature === 'yapilmadi' && 'bg-rose-500/10 border-rose-500/20 text-rose-400',
                                !record.pdks_signature && 'bg-white/5 border-white/10 text-gray-400'
                              )}
                            >
                              <option value="">-</option>
                              <option value="yapildi">Yapıldı</option>
                              <option value="yapilmadi">Yapılmadı</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              value={record.enrolled_students ?? ''}
                              onChange={e => updateRecord(record.id, { enrolled_students: e.target.value ? parseInt(e.target.value) : null })}
                              className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                              placeholder="-"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              value={record.attending_students ?? ''}
                              onChange={e => updateRecord(record.id, { attending_students: e.target.value ? parseInt(e.target.value) : null })}
                              className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                              placeholder="-"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
