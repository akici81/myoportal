'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Clock, Users, FileSpreadsheet, Save, RefreshCw, BookOpen,
  AlertTriangle, Loader2, ClipboardCheck, Building2
} from 'lucide-react'
import type { AcademicPeriod } from '@/types'
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
  }
}

const DAY_NAMES: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function InstructorLessonTrackingPage() {
  const supabase = createClient()

  // State
  const [userId, setUserId] = useState<string | null>(null)
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null)
  const [currentWeek, setCurrentWeek] = useState(1)
  const [weekStartDate, setWeekStartDate] = useState<string | null>(null)
  const [records, setRecords] = useState<LessonRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  // ─── Initial Load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Instructor ID'yi bul
        const { data: instructor } = await supabase
          .from('instructors')
          .select('id')
          .eq('user_id', user.id)
          .single()
        
        if (instructor) {
          setInstructorId(instructor.id)
        }
      }
      
      // Dönemleri yükle
      const { data: periodsData } = await supabase
        .from('academic_periods')
        .select('*')
        .order('academic_year', { ascending: false })
      
      setPeriods(periodsData ?? [])
      const active = periodsData?.find(p => p.is_active) ?? periodsData?.[0]
      if (active) setSelectedPeriod(active)
    }
    
    init()
  }, [supabase])

  // Period değişince hafta tarihini hesapla
  useEffect(() => {
    if (!selectedPeriod?.start_date) return
    
    const startDate = new Date(selectedPeriod.start_date)
    const weekStart = new Date(startDate)
    weekStart.setDate(startDate.getDate() + (currentWeek - 1) * 7)
    setWeekStartDate(weekStart.toISOString().split('T')[0])
  }, [selectedPeriod, currentWeek])

  // Load records
  useEffect(() => {
    if (selectedPeriod && instructorId) {
      loadRecords()
    }
  }, [selectedPeriod, currentWeek, instructorId])

  // ─── Fetchers ─────────────────────────────────────────────────────────────
  const loadRecords = useCallback(async () => {
    if (!selectedPeriod || !instructorId) return
    setLoading(true)
    
    try {
      const params = new URLSearchParams({
        period_id: selectedPeriod.id,
        week_number: currentWeek.toString(),
        instructor_id: instructorId
      })
      
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
  }, [selectedPeriod, currentWeek, instructorId])

  const updateRecord = async (id: string, updates: Partial<LessonRecord>) => {
    setSaving(id)
    
    try {
      const res = await fetch('/api/lesson-tracking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          ...updates,
          filled_by: userId
        })
      })
      
      if (res.ok) {
        toast.success('Kayıt güncellendi')
        // Local state güncelle
        setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
      } else {
        const data = await res.json()
        toast.error(data.error || 'Güncelleme hatası')
      }
    } catch (err) {
      toast.error('Bir hata oluştu')
    } finally {
      setSaving(null)
    }
  }

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total: records.length,
    filled: records.filter(r => r.instructor_signature).length,
    pending: records.filter(r => !r.instructor_signature).length,
  }

  // Group records by day
  const recordsByDay = records.reduce((acc, record) => {
    const day = record.schedule_entries?.day_of_week || 0
    if (!acc[day]) acc[day] = []
    acc[day].push(record)
    return acc
  }, {} as Record<number, LessonRecord[]>)

  // Sort by time
  Object.keys(recordsByDay).forEach(day => {
    recordsByDay[parseInt(day)].sort((a, b) => {
      const timeA = a.schedule_entries?.time_slots?.start_time || ''
      const timeB = b.schedule_entries?.time_slots?.start_time || ''
      return timeA.localeCompare(timeB)
    })
  })

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!instructorId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <p className="text-gray-400">Öğretim elemanı bilgisi bulunamadı.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text)' }}>
            <ClipboardCheck className="h-7 w-7 text-emerald-500" />
            Ders Takip Formu
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Dersleriniz için haftalık takip bilgilerini doldurun
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod?.id || ''}
            onChange={e => setSelectedPeriod(periods.find(p => p.id === e.target.value) || null)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.academic_year} {p.semester === 'fall' ? 'Güz' : 'Bahar'}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => loadRecords()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
            Yenile
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-white/10">
        <button
          onClick={() => setCurrentWeek(w => Math.max(1, w - 1))}
          disabled={currentWeek <= 1}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="text-center">
          <div className="text-2xl font-bold">{currentWeek}. Hafta</div>
          {weekStartDate && (
            <div className="text-sm text-gray-400 mt-1">
              {new Date(weekStartDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
              {' - '}
              {new Date(new Date(weekStartDate).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
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

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-gray-500">Toplam Ders</div>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.filled}</div>
          <div className="text-xs text-gray-500">Doldurulmuş</div>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.pending}</div>
          <div className="text-xs text-gray-500">Bekleyen</div>
        </div>
      </div>

      {/* Records */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Bu hafta için ders kaydı bulunamadı.</p>
          <p className="text-sm mt-2">Sekreterlik tarafından form başlatılmamış olabilir.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5].map(day => {
            const dayRecords = recordsByDay[day] || []
            if (dayRecords.length === 0) return null
            
            return (
              <div key={day} className="rounded-2xl border border-white/10 overflow-hidden">
                {/* Day Header */}
                <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-emerald-400" />
                    <span className="font-semibold">{DAY_NAMES[day]}</span>
                    {weekStartDate && (
                      <span className="text-sm text-gray-500">
                        {new Date(new Date(weekStartDate).getTime() + (day - 1) * 24 * 60 * 60 * 1000)
                          .toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{dayRecords.length} ders</span>
                </div>
                
                {/* Lesson Cards */}
                <div className="p-4 space-y-4">
                  {dayRecords.map(record => (
                    <div 
                      key={record.id} 
                      className={clsx(
                        'p-4 rounded-xl border transition-colors',
                        record.instructor_signature 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : 'bg-white/5 border-white/10'
                      )}
                    >
                      {/* Course Info */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-lg">{record.schedule_entries?.program_courses?.courses?.code}</span>
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium">
                              {record.schedule_entries?.program_courses?.programs?.short_code}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">{record.schedule_entries?.program_courses?.courses?.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>{record.schedule_entries?.time_slots?.start_time?.slice(0, 5)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                            <Building2 className="h-3 w-3" />
                            <span>{record.schedule_entries?.classrooms?.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Form Fields */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {/* Attendance Type */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">UZEM/Örgün</label>
                          <select
                            value={record.attendance_type}
                            onChange={e => updateRecord(record.id, { attendance_type: e.target.value as 'orgon' | 'uzem' })}
                            disabled={saving === record.id}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          >
                            <option value="orgon">ÖRGÜN</option>
                            <option value="uzem">UZEM</option>
                          </select>
                        </div>
                        
                        {/* Instructor Signature */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Ders Durumu</label>
                          <select
                            value={record.instructor_signature || ''}
                            onChange={e => updateRecord(record.id, { instructor_signature: e.target.value as any || null })}
                            disabled={saving === record.id}
                            className={clsx(
                              'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2',
                              record.instructor_signature === 'yapildi' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 focus:ring-emerald-500/40',
                              record.instructor_signature === 'yapilmadi' && 'bg-rose-500/10 border-rose-500/20 text-rose-400 focus:ring-rose-500/40',
                              record.instructor_signature === 'telafi' && 'bg-amber-500/10 border-amber-500/20 text-amber-400 focus:ring-amber-500/40',
                              !record.instructor_signature && 'bg-white/5 border-white/10 focus:ring-emerald-500/40'
                            )}
                          >
                            <option value="">Seçiniz...</option>
                            <option value="yapildi">✓ Yapıldı</option>
                            <option value="yapilmadi">✗ Yapılmadı</option>
                            <option value="telafi">⟳ Telafi Yapılacak</option>
                          </select>
                        </div>
                        
                        {/* PDKS Signature */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">PDKS İmza</label>
                          <select
                            value={record.pdks_signature || ''}
                            onChange={e => updateRecord(record.id, { pdks_signature: e.target.value as any || null })}
                            disabled={saving === record.id}
                            className={clsx(
                              'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2',
                              record.pdks_signature === 'yapildi' && 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 focus:ring-emerald-500/40',
                              record.pdks_signature === 'yapilmadi' && 'bg-rose-500/10 border-rose-500/20 text-rose-400 focus:ring-rose-500/40',
                              !record.pdks_signature && 'bg-white/5 border-white/10 focus:ring-emerald-500/40'
                            )}
                          >
                            <option value="">Seçiniz...</option>
                            <option value="yapildi">✓ Yapıldı</option>
                            <option value="yapilmadi">✗ Yapılmadı</option>
                          </select>
                        </div>
                        
                        {/* Enrolled Students */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Mevcut Öğrenci</label>
                          <input
                            type="number"
                            value={record.enrolled_students ?? ''}
                            onChange={e => updateRecord(record.id, { enrolled_students: e.target.value ? parseInt(e.target.value) : null })}
                            disabled={saving === record.id}
                            placeholder="0"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          />
                        </div>
                        
                        {/* Attending Students */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1.5">Katılım</label>
                          <input
                            type="number"
                            value={record.attending_students ?? ''}
                            onChange={e => updateRecord(record.id, { attending_students: e.target.value ? parseInt(e.target.value) : null })}
                            disabled={saving === record.id}
                            placeholder="0"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          />
                        </div>
                      </div>
                      
                      {/* Makeup Note (if telafi selected) */}
                      {record.instructor_signature === 'telafi' && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <label className="block text-xs text-amber-400 mb-1.5">Telafi Notu</label>
                          <input
                            type="text"
                            value={record.makeup_note || ''}
                            onChange={e => updateRecord(record.id, { makeup_note: e.target.value })}
                            disabled={saving === record.id}
                            placeholder="Telafi ile ilgili açıklama..."
                            className="w-full px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200 placeholder-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                          />
                        </div>
                      )}
                      
                      {/* Saving indicator */}
                      {saving === record.id && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-emerald-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Kaydediliyor...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
