'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { ScheduleExport } from '@/components/schedule/ScheduleExport'
import { toast } from 'sonner'
import {
  AlertTriangle, CheckCircle, CalendarDays, MousePointerClick,
  Clock, X, TimerIcon, Plus, User, LayoutGrid
} from 'lucide-react'
import type { AcademicPeriod, Department, Program, Instructor, Classroom } from '@/types'
import clsx from 'clsx'

interface ClassroomWithAvailability extends Classroom {
  is_available?: boolean
}

export default function BolumBaskaniSchedulePage() {
  const supabase = createClient()

  // Global State
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null)

  // Bölüm Başkanı Profile
  const [userProfile, setUserProfile] = useState<any>(null)
  const [department, setDepartment] = useState<Department | null>(null)

  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<1 | 2>(1)

  // Schedule Data
  const [entries, setEntries] = useState<any[]>([])
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Editor State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addSlot, setAddSlot] = useState<{ day: number; slotId: string } | null>(null)

  // Foreign Keys for modal
  const [programCourses, setProgramCourses] = useState<any[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [classrooms, setClassrooms] = useState<ClassroomWithAvailability[]>([])
  const [allClassrooms, setAllClassrooms] = useState<ClassroomWithAvailability[]>([])

  // Form handling
  const [form, setForm] = useState({
    program_course_id: '',
    classroom_id: '',
    instructor_id: '',
    range_day: 1,
    range_start: '',
    range_end: '',
  })
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<any[]>([])

  // ── Mode Toggles ──
  const [rangeMode, setRangeMode] = useState(false)

  // ── View Mode: program | instructor ──
  const [viewMode, setViewMode] = useState<'program' | 'instructor'>('program')
  const [selectedInstructor, setSelectedInstructor] = useState<string>('')
  const [allEntries, setAllEntries] = useState<any[]>([]) // tüm dönem entryleri (öğretmen görünümü için)

  // ── Toplu Gün Girişi ──
  const [bulkDayMode, setBulkDayMode] = useState(false)
  const [bulkDay, setBulkDay] = useState(1)
  const [bulkCourses, setBulkCourses] = useState<Array<{
    program_course_id: string
    instructor_id: string
    classroom_id: string
    start_time: string
    duration: number // kaç saat
  }>>([{ program_course_id: '', instructor_id: '', classroom_id: '', start_time: '09:00', duration: 2 }])

  // ─── Load Auth Profile & Base Data ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, role, department_id')
        .eq('id', user.id)
        .single()

      let finalDepartmentId = prof?.department_id
      let finalDepartment = null

      if (finalDepartmentId) {
        const { data: deptById } = await supabase.from('departments').select('*').eq('id', finalDepartmentId).eq('is_active', true).single()
        if (deptById) finalDepartment = deptById
      }

      if (!finalDepartmentId || !finalDepartment) {
        const { data: headDept } = await supabase.from('departments').select('*').eq('head_id', user.id).eq('is_active', true).single()
        if (headDept) {
          finalDepartmentId = headDept.id
          finalDepartment = headDept
        }
      }

      setUserProfile({ ...prof, department_id: finalDepartmentId })
      setDepartment(finalDepartment)

      const [{ data: pData }, { data: sData }, { data: cData }] = await Promise.all([
        supabase.from('academic_periods').select('*').order('academic_year', { ascending: false }),
        supabase.from('time_slots').select('*').order('slot_number'),
        supabase.from('classrooms').select('*').eq('is_active', true).order('name'),
      ])

      setPeriods(pData ?? [])
      const active = pData?.find((p) => p.is_active) ?? pData?.[0]
      if (active) setSelectedPeriod(active)
      setTimeSlots(sData ?? [])
      setClassrooms(cData ?? [])

      if (finalDepartmentId) {
        const { data: progs } = await supabase.from('programs').select('*').eq('department_id', finalDepartmentId).eq('is_active', true).order('name')
        setPrograms(progs ?? [])
        setSelectedProgram(progs?.[0]?.id ?? '')

        const { data: insts } = await supabase.from('instructors').select('*').eq('department_id', finalDepartmentId).eq('is_active', true).order('full_name')
        setInstructors(insts ?? [])
      }

      setInitialLoading(false)
    })
  }, [supabase])

  useEffect(() => {
    if (!selectedProgram || !selectedPeriod) return
    loadEntries()
    loadProgramCourses()
  }, [selectedProgram, selectedPeriod, selectedYear])

  // ─── Fetchers ────────────────────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    if (!selectedPeriod || !selectedProgram) return
    setLoading(true)
    const { data } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        time_slots(*),
        classrooms(*),
        instructors(id, full_name, title),
        program_courses(
          id, year_number, semester,
          courses(id, name, code, course_type),
          programs(id, name, short_code)
        )
      `)
      .eq('period_id', selectedPeriod.id)
      .order('day_of_week')

    const filtered = (data ?? []).filter(
      (e: any) =>
        e.program_courses?.programs?.id === selectedProgram &&
        e.program_courses?.year_number === selectedYear
    )
    setEntries(filtered)
    setAllEntries(data ?? []) // tüm kayıtlar öğretmen görünümü için
    setLoading(false)
  }, [selectedPeriod, selectedProgram, selectedYear, supabase])

  const loadProgramCourses = useCallback(async () => {
    if (!selectedProgram) return
    const { data } = await supabase
      .from('program_courses')
      .select('*, courses(*), instructors(*)')
      .eq('program_id', selectedProgram)
      .eq('year_number', selectedYear)
      .eq('is_active', true)
    setProgramCourses(data ?? [])
  }, [selectedProgram, selectedYear, supabase])

  // Öğretmen görünümü için filtrelenmiş entries
  const instructorEntries = useMemo(() => {
    if (!selectedInstructor) return []
    return allEntries.filter((e: any) => e.instructor_id === selectedInstructor)
  }, [allEntries, selectedInstructor])

  // ─── Cell Click ──────────────────────────────────────────────────────────────
  async function handleCellClick(day: number, slotId: string) {
    setAddSlot({ day, slotId })
    setForm(f => ({ ...f, program_course_id: '', classroom_id: '', instructor_id: '', range_day: day }))
    setConflicts([])
    setAllClassrooms([])
    setRangeMode(false)
    setShowAddModal(true)
    await fetchClassroomAvailability(day, slotId)
  }

  // Tekli ders ekleme (hücre seçmeden direkt modal aç)
  function handleOpenAddModal() {
    setAddSlot({ day: 1, slotId: timeSlots[0]?.id ?? '' })
    setForm(f => ({ ...f, program_course_id: '', classroom_id: '', instructor_id: '', range_day: 1 }))
    setConflicts([])
    setAllClassrooms(classrooms.map(c => ({ ...c, is_available: true })))
    setRangeMode(false)
    setShowAddModal(true)
  }

  function handleOpenRangeMode() {
    setAddSlot(null)
    setRangeMode(true)
    setForm(f => ({ ...f, program_course_id: '', classroom_id: '', instructor_id: '', range_day: 1, range_start: '', range_end: '' }))
    setConflicts([])
    setAllClassrooms(classrooms.map(c => ({ ...c, is_available: true })))
    setShowAddModal(true)
  }

  async function fetchClassroomAvailability(day: number, slotId: string) {
    if (!selectedPeriod) return
    const res = await fetch('/api/schedule/suggest-classrooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_id: selectedPeriod.id,
        day_of_week: day,
        time_slot_id: slotId,
        min_capacity: 0,
      }),
    })
    const data = await res.json()
    const all: ClassroomWithAvailability[] = data?.all_classrooms ?? data?.classrooms ?? []
    setAllClassrooms(all.length > 0 ? all : classrooms.map(c => ({ ...c, is_available: true })))
  }

  // ─── Conflict Check ───────────────────────────────────────────────────────────
  async function checkConflictsForEntry(day: number, slotId: string, pcId: string, instructorId: string, classroomId: string) {
    if (!selectedPeriod) return { hasConflict: false, conflicts: [] }
    const res = await fetch('/api/schedule/check-conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_id: selectedPeriod.id,
        program_course_id: pcId,
        classroom_id: classroomId,
        instructor_id: instructorId,
        day_of_week: day,
        time_slot_id: slotId,
      }),
    })
    return res.json()
  }

  // ─── Save — Single Slot ───────────────────────────────────────────────────────
  async function handleSave() {
    if (!addSlot || !selectedPeriod) return
    if (!form.program_course_id || !form.classroom_id || !form.instructor_id) {
      toast.error('Tüm alanları doldurmanız gerekmektedir.')
      return
    }
    const conflictResult = await checkConflictsForEntry(addSlot.day, addSlot.slotId, form.program_course_id, form.instructor_id, form.classroom_id)
    if (conflictResult.hasConflict) {
      setConflicts(conflictResult.conflicts ?? [])
      toast.error('Giderilmeyen çakışmalar var.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/schedule/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period_id: selectedPeriod.id,
        program_course_id: form.program_course_id,
        classroom_id: form.classroom_id,
        instructor_id: form.instructor_id,
        day_of_week: addSlot.day,
        time_slot_id: addSlot.slotId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Ders eklenemedi')
      setSaving(false)
      return
    }
    toast.success('Ders başarıyla programa yerleştirildi!')
    setShowAddModal(false)
    loadEntries()
    setSaving(false)
  }

  // ─── Save — Range Mode ────────────────────────────────────────────────────────
  async function handleSaveRange() {
    if (!selectedPeriod) return
    if (!form.program_course_id || !form.classroom_id || !form.instructor_id) {
      toast.error('Tüm alanları doldurmanız gerekmektedir.')
      return
    }
    if (!form.range_start || !form.range_end) {
      toast.error('Başlangıç ve bitiş saatini girin.')
      return
    }

    const matchingSlots = timeSlots.filter(slot => {
      const s = slot.start_time?.slice(0, 5) ?? ''
      const e = slot.end_time?.slice(0, 5) ?? ''
      return s >= form.range_start && e <= form.range_end
    })

    if (matchingSlots.length === 0) {
      toast.error('Bu saat aralığında sistem slotu bulunamadı.')
      return
    }

    setSaving(true)
    let saved = 0, skipped = 0

    for (const slot of matchingSlots) {
      const conflictResult = await checkConflictsForEntry(form.range_day, slot.id, form.program_course_id, form.instructor_id, form.classroom_id)
      if (conflictResult.hasConflict) { skipped++; continue }

      const res = await fetch('/api/schedule/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_id: selectedPeriod.id,
          program_course_id: form.program_course_id,
          classroom_id: form.classroom_id,
          instructor_id: form.instructor_id,
          day_of_week: form.range_day,
          time_slot_id: slot.id,
        }),
      })
      if (res.ok) saved++; else skipped++
    }

    setSaving(false)
    if (saved > 0) toast.success(`${saved} ders saati programa yerleştirildi!`)
    if (skipped > 0) toast.warning(`${skipped} slot çakışma nedeniyle atlandı.`)
    setShowAddModal(false)
    loadEntries()
  }

  // ─── Bulk Day Entry ───────────────────────────────────────────────────────────
  async function handleBulkDaySave() {
    if (!selectedPeriod) return
    const validCourses = bulkCourses.filter(c => c.program_course_id && c.instructor_id && c.classroom_id)
    if (validCourses.length === 0) {
      toast.error('En az bir ders bilgisini tam doldurun.')
      return
    }

    setSaving(true)
    let saved = 0, skipped = 0

    for (const course of validCourses) {
      const startIdx = timeSlots.findIndex(s => s.start_time?.slice(0, 5) === course.start_time)
      if (startIdx === -1) { skipped++; continue }

      for (let i = 0; i < course.duration; i++) {
        const slot = timeSlots[startIdx + i]
        if (!slot) break

        const conflictResult = await checkConflictsForEntry(bulkDay, slot.id, course.program_course_id, course.instructor_id, course.classroom_id)
        if (conflictResult.hasConflict) { skipped++; continue }

        const res = await fetch('/api/schedule/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            period_id: selectedPeriod.id,
            program_course_id: course.program_course_id,
            classroom_id: course.classroom_id,
            instructor_id: course.instructor_id,
            day_of_week: bulkDay,
            time_slot_id: slot.id,
          }),
        })
        if (res.ok) saved++; else skipped++
      }
    }

    setSaving(false)
    if (saved > 0) toast.success(`${saved} ders saati eklendi!`)
    if (skipped > 0) toast.warning(`${skipped} slot çakışma nedeniyle atlandı.`)
    setBulkDayMode(false)
    loadEntries()
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const res = await fetch(`/api/schedule/entries?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Ders başarıyla kaldırıldı')
      loadEntries()
    } else toast.error('Silme işlemi yapılamadı')
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const selectedSlot = timeSlots.find((s) => s.id === addSlot?.slotId)
  const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']
  const selectedProgramInfo = programs.find((p) => p.id === selectedProgram)
  const exportTitle = selectedProgramInfo ? `${selectedProgramInfo.name} - ${selectedYear}. Sınıf` : 'Ders Programı'

  const displayClassrooms = allClassrooms.length > 0 ? allClassrooms : classrooms
  const availableClassrooms = displayClassrooms.filter(c => c.is_available !== false)
  const busyClassrooms = displayClassrooms.filter(c => c.is_available === false)

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (initialLoading) {
    return <div className="p-20 flex justify-center"><div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!userProfile?.department_id) {
    return (
      <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-red-800/60 border-dashed bg-red-900/10">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-2xl font-black text-red-400 tracking-tight">Yetkisiz Erişim / Bölüm Ataması Yok</h3>
        <p className="text-gray-400 mt-3 max-w-md mx-auto leading-relaxed">
          Kullanıcı hesabınızda tanımlı bir bölüm bulunamadı. Lütfen sekreterlikle iletişime geçin.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-900/50 via-teal-900/30 to-gray-900 p-8 border border-cyan-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <CalendarDays className="w-48 h-48 text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Bölüm Ders Programı
            </h1>
            <p className="mt-2 text-gray-400 max-w-2xl font-medium">
              {department?.name} — sınıf doluluk durumlarını görerek programınızı hazırlayın.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {selectedProgram && selectedPeriod && (
              <>
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Ders Ekle
                </button>
                <button
                  onClick={handleOpenRangeMode}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:brightness-110 shadow-lg transition-all"
                >
                  <TimerIcon className="w-4 h-4" />
                  Saat Aralığı ile Ekle
                </button>
                <button
                  onClick={() => { setBulkDayMode(true); setBulkDay(1); setBulkCourses([{ program_course_id: '', instructor_id: '', classroom_id: '', start_time: '09:00', duration: 2 }]); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg"
                  style={{ background: 'var(--primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}
                >
                  <CalendarDays className="w-4 h-4" />
                  Toplu Gün Girişi
                </button>
              </>
            )}
            {entries.length > 0 && (
              <ScheduleExport entries={entries} timeSlots={timeSlots} title={exportTitle} />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6 max-w-screen-2xl mx-auto">
        {/* Filters */}
        <div className="card p-5 rounded-2xl border border-gray-800/60 shadow-xl relative z-20">
          <div className="flex items-center gap-2 mb-4">
            <MousePointerClick className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Planlama Görünümü</h3>
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] max-w-[250px]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block pl-1">Akademik Dönem</label>
              <select
                className="w-full bg-gray-900/70 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-semibold"
                value={selectedPeriod?.id ?? ''}
                onChange={(e) => setSelectedPeriod(periods.find((x) => x.id === e.target.value) ?? null)}
              >
                <option value="">— Seçin —</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.academic_year} / {p.semester}. Dönem {p.is_active ? '✓ (Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {programs.length > 0 && (
              <div className="flex-1 min-w-[240px]">
                <label className="text-[11px] font-bold text-cyan-500 uppercase tracking-wider mb-1 block pl-1">İlgili Program</label>
                <select
                  className="w-full bg-cyan-950/20 border border-cyan-800/60 rounded-xl px-4 py-3 text-sm text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-bold shadow-[0_0_15px_rgba(8,145,178,0.1)]"
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id} className="bg-gray-900 text-white">{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedProgram && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block pl-1">Sınıf Yılı</label>
                <div className="flex gap-1.5 p-1 rounded-xl bg-gray-900/50 border border-gray-800">
                  {([1, 2] as const).map((y) => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={clsx(
                        'px-5 py-2.5 rounded-lg text-sm font-bold transition-all min-w-[90px]',
                        selectedYear === y
                          ? 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg'
                          : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                      )}
                    >
                      {y}. Sınıf
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!selectedPeriod && periods.length === 0 && (
            <div className="mt-4 p-4 rounded-xl flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200 font-medium">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <p>Sistemde aktif bir Akademik Dönem bulunamadı.</p>
            </div>
          )}
        </div>

        {/* ── View Mode Toggle ── */}
        {selectedProgram && selectedPeriod && entries.length > 0 && (
          <div className="card p-4 rounded-2xl border border-gray-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Program / Öğretmen toggle */}
              <div className="flex gap-1.5 p-1 rounded-xl bg-gray-900/50 border border-gray-800 w-fit">
                <button
                  onClick={() => setViewMode('program')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                    viewMode === 'program'
                      ? 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Program Görünümü
                </button>
                <button
                  onClick={() => setViewMode('instructor')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                    viewMode === 'instructor'
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  )}
                >
                  <User className="w-4 h-4" />
                  Öğretmen Görünümü
                </button>
              </div>
              {/* Öğretmen seçici */}
              {viewMode === 'instructor' && (
                <select
                  className="bg-amber-950/20 border border-amber-700/60 rounded-xl px-4 py-2.5 text-sm text-amber-100 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  value={selectedInstructor}
                  onChange={e => setSelectedInstructor(e.target.value)}
                >
                  <option value="">— Öğretim Elemanı Seçin —</option>
                  {instructors.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.title} {i.full_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Schedule Grid */}
        <div className="min-h-[500px]">
          {selectedProgram && selectedPeriod ? (
            loading ? (
              <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-gray-800/60">
                <div className="w-12 h-12 rounded-full border-4 border-cyan-800 border-t-cyan-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white tracking-tight">Program Yükleniyor</h3>
              </div>
            ) : viewMode === 'instructor' ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {!selectedInstructor ? (
                  <div className="card flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-amber-800/30 border-dashed bg-amber-900/5">
                    <User className="w-16 h-16 text-amber-700/50 mb-4" />
                    <h3 className="text-xl font-bold text-gray-300">Öğretim Elemanı Seçin</h3>
                    <p className="text-gray-500 mt-2 text-sm">Yukarıdan bir öğretim elemanı seçerek haftalık programını görüntüleyin.</p>
                  </div>
                ) : instructorEntries.length === 0 ? (
                  <div className="card flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-gray-800/60 border-dashed">
                    <h3 className="text-xl font-bold text-gray-300">Bu öğretmen için program bulunamadı.</h3>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-sm font-bold text-amber-300">
                        {instructors.find(i => i.id === selectedInstructor)?.title}{' '}
                        {instructors.find(i => i.id === selectedInstructor)?.full_name} — Haftalık Ders Programı
                      </span>
                      <span className="text-xs text-gray-500 font-medium">({instructorEntries.length} ders saati)</span>
                    </div>
                    <ScheduleGrid
                      entries={instructorEntries}
                      timeSlots={timeSlots}
                      readonly
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ScheduleGrid
                  entries={entries}
                  timeSlots={timeSlots}
                  onDelete={handleDelete}
                  onCellClick={handleCellClick}
                  onMove={loadEntries}
                />
              </div>
            )
          ) : (
            <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-gray-800/60 border-dashed bg-gray-900/20">
              <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-900/50">
                <CalendarDays className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-200 tracking-tight">Henüz Görüntülenecek Veri Yok</h3>
            </div>
          )}
        </div>
      </div>

      {/* ── Editor Modal ──────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in zoom-in-95 duration-200">
          <div className="card w-full max-w-xl p-0 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="px-6 py-5 border-b border-cyan-900/30 bg-gradient-to-r from-cyan-950 to-gray-900 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {rangeMode ? 'Saat Aralığı ile Ders Yerleştir' : 'Derse Görevlendirme'}
                </h3>
                {!rangeMode && addSlot && selectedSlot && (
                  <div className="flex items-center gap-1.5 mt-2 bg-gray-900/80 px-2 py-1 rounded inline-flex text-xs font-semibold uppercase tracking-widest text-cyan-400 border border-cyan-900/50">
                    <Clock className="w-3.5 h-3.5" />
                    {DAYS[addSlot.day]} · {selectedSlot.start_time?.slice(0, 5)} – {selectedSlot.end_time?.slice(0, 5)}
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-lg p-2 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">

              {/* ── Range Mode Settings ── */}
              {rangeMode && (
                <div className="space-y-4 p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
                  <div className="flex items-center gap-2">
                    <TimerIcon className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-bold text-violet-300">Saat Aralığı Ayarları</span>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block pl-1">Gün</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, range_day: d }))}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                            form.range_day === d
                              ? 'bg-violet-600 border-violet-500 text-white'
                              : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:text-white'
                          )}
                        >
                          {DAYS[d]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block pl-1">Başlangıç</label>
                      <input
                        type="time"
                        value={form.range_start}
                        onChange={e => setForm(f => ({ ...f, range_start: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block pl-1">Bitiş</label>
                      <input
                        type="time"
                        value={form.range_end}
                        onChange={e => setForm(f => ({ ...f, range_end: e.target.value }))}
                        className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
                      />
                    </div>
                  </div>
                  {form.range_start && form.range_end && (
                    <p className="text-xs text-violet-300/80 font-medium">
                      → {timeSlots.filter(s => (s.start_time?.slice(0, 5) ?? '') >= form.range_start && (s.end_time?.slice(0, 5) ?? '') <= form.range_end).length} slot bu aralığa giriyor
                    </p>
                  )}
                </div>
              )}

              {/* ── Course ── */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block pl-1">İlgili Ders</label>
                <select
                  className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors form-select appearance-none font-semibold"
                  value={form.program_course_id}
                  onChange={(e) => {
                    const pc = programCourses.find((x) => x.id === e.target.value)
                    setForm(f => ({ ...f, program_course_id: e.target.value, instructor_id: pc?.instructor_id ?? f.instructor_id }))
                  }}
                >
                  <option value="">— Ders Kataloğundan Seçin —</option>
                  {programCourses.map((pc) => (
                    <option key={pc.id} value={pc.id}>
                      {pc.courses?.code} / {pc.courses?.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Instructor ── */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block pl-1">Atanan Öğretim Elemanı</label>
                <select
                  className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors form-select appearance-none"
                  value={form.instructor_id}
                  onChange={(e) => setForm(f => ({ ...f, instructor_id: e.target.value }))}
                >
                  <option value="">— Kadrodan Hoca Seçin —</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>{i.title} {i.full_name}</option>
                  ))}
                </select>
              </div>

              {/* ── Classroom with Availability ── */}
              <div>
                <div className="flex items-center justify-between mb-1.5 pl-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Verilecek Derslik</label>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                      Boş: {availableClassrooms.length}
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                      Dolu: {busyClassrooms.length}
                    </span>
                  </div>
                </div>
                <select
                  className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors form-select appearance-none"
                  value={form.classroom_id}
                  onChange={(e) => setForm(f => ({ ...f, classroom_id: e.target.value }))}
                >
                  <option value="">— Derslik Seçin —</option>
                  {availableClassrooms.length > 0 && (
                    <optgroup label="✓ Bu Saatte Boş Derslikler" className="bg-gray-800 text-emerald-400">
                      {availableClassrooms.map((c) => (
                        <option key={c.id} value={c.id} className="text-white">
                          🟢 {c.name} — {c.capacity} Kişilik
                          {c.has_projector ? ' · Proj.' : ''}
                          {c.has_smartboard ? ' · Akıllı Tahta' : ''}
                          {c.has_computer ? ' · Bilgisayar' : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {busyClassrooms.length > 0 && (
                    <optgroup label="✗ Bu Saatte Dolu Derslikler" className="bg-gray-900 text-rose-400">
                      {busyClassrooms.map((c) => (
                        <option key={c.id} value={c.id} className="text-white">
                          🔴 {c.name} — {c.capacity} Kişilik (DOLU)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* ── Conflict Feedback ── */}
              {conflicts.length > 0 && (
                <div className="p-4 rounded-xl space-y-2.5 bg-rose-500/10 border border-rose-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <h4 className="text-sm font-bold text-rose-400 uppercase tracking-widest">Çakışma Tespit Edildi</h4>
                  </div>
                  {conflicts.map((c, i) => (
                    <p key={i} className="text-[13px] text-rose-300/80 font-medium pl-8">{c.detail}</p>
                  ))}
                </div>
              )}

              {conflicts.length === 0 && form.program_course_id && form.instructor_id && form.classroom_id && (
                <div className="p-4 rounded-xl flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400">Hazır</h4>
                    <p className="text-[11px] text-emerald-500/80 font-medium mt-0.5">Kaydet butonuna basabilirsiniz.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-900/80 border-t border-gray-800/80 mt-auto flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); setConflicts([]) }}
                className="px-4 py-2.5 rounded-xl font-bold text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white transition flex-1"
              >
                İptal Et
              </button>
              <button
                onClick={rangeMode ? handleSaveRange : handleSave}
                disabled={saving || !form.program_course_id || !form.classroom_id || !form.instructor_id || (rangeMode && (!form.range_start || !form.range_end))}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-[2] flex items-center justify-center gap-2 shadow-lg transition-all bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : rangeMode ? <TimerIcon className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />
                }
                {saving ? 'Yerleştiriliyor...' : rangeMode ? 'Aralığı Programa Ekle' : 'Ders Saatini Programa Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toplu Gün Girişi Modal ────────────────────────────────────────────── */}
      {bulkDayMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in">
          <div className="card w-full max-w-4xl p-0 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-start" style={{ background: 'var(--primary-bg)' }}>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Toplu Gün Girişi</h3>
                <p className="text-xs text-gray-400 mt-1">Bir günün tüm derslerini tek seferde ekleyin</p>
              </div>
              <button onClick={() => setBulkDayMode(false)} className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-lg p-2 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
              {/* Gün Seçimi */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">Gün</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(d => (
                    <button
                      key={d}
                      onClick={() => setBulkDay(d)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        bulkDay === d
                          ? 'text-white shadow-sm'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                      style={bulkDay === d ? { background: 'var(--primary)' } : {}}
                    >
                      {DAYS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dersler */}
              <div className="space-y-3">
                {bulkCourses.map((course, idx) => (
                  <div key={idx} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">Ders {idx + 1}</span>
                      {bulkCourses.length > 1 && (
                        <button
                          onClick={() => setBulkCourses(p => p.filter((_, i) => i !== idx))}
                          className="text-xs text-red-400 hover:text-red-300 font-medium"
                        >
                          ✕ Kaldır
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      {/* Başlangıç */}
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Başlangıç</label>
                        <select
                          value={course.start_time}
                          onChange={(e) => setBulkCourses(p => p.map((c, i) => i === idx ? { ...c, start_time: e.target.value } : c))}
                          className="w-full bg-gray-900/70 border border-gray-700/80 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          {timeSlots.map(s => (
                            <option key={s.id} value={s.start_time?.slice(0, 5)}>{s.start_time?.slice(0, 5)}</option>
                          ))}
                        </select>
                      </div>

                      {/* Süre */}
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Kaç Saat</label>
                        <select
                          value={course.duration}
                          onChange={(e) => setBulkCourses(p => p.map((c, i) => i === idx ? { ...c, duration: Number(e.target.value) } : c))}
                          className="w-full bg-gray-900/70 border border-gray-700/80 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} saat</option>)}
                        </select>
                      </div>

                      {/* Ders */}
                      <div className="col-span-4">
                        <label className="text-xs text-gray-500 mb-1 block">Ders</label>
                        <select
                          value={course.program_course_id}
                          onChange={(e) => setBulkCourses(p => p.map((c, i) => i === idx ? { ...c, program_course_id: e.target.value } : c))}
                          className="w-full bg-gray-900/70 border border-gray-700/80 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <option value="">— Ders Seçin —</option>
                          {programCourses.map(pc => (
                            <option key={pc.id} value={pc.id}>{pc.courses?.code} - {pc.courses?.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Hoca */}
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Hoca</label>
                        <select
                          value={course.instructor_id}
                          onChange={(e) => setBulkCourses(p => p.map((c, i) => i === idx ? { ...c, instructor_id: e.target.value } : c))}
                          className="w-full bg-gray-900/70 border border-gray-700/80 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <option value="">— Seçin —</option>
                          {instructors.map(i => (
                            <option key={i.id} value={i.id}>{i.title} {i.full_name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Derslik */}
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Derslik</label>
                        <select
                          value={course.classroom_id}
                          onChange={(e) => setBulkCourses(p => p.map((c, i) => i === idx ? { ...c, classroom_id: e.target.value } : c))}
                          className="w-full bg-gray-900/70 border border-gray-700/80 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <option value="">— Seçin —</option>
                          {classrooms.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ders Ekle Butonu */}
              <button
                onClick={() => setBulkCourses(p => [...p, { program_course_id: '', instructor_id: '', classroom_id: '', start_time: '09:00', duration: 2 }])}
                className="w-full border-2 border-dashed border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300 text-sm font-medium py-3 rounded-xl transition"
              >
                + Ders Ekle
              </button>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-900/80 border-t border-gray-800/80 flex gap-3">
              <button
                onClick={() => setBulkDayMode(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white transition"
              >
                İptal
              </button>
              <button
                onClick={handleBulkDaySave}
                disabled={saving}
                className="flex-[2] px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.background = 'var(--accent-hover)')}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.background = 'var(--primary)')}
              >
                {saving ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Kaydediliyor...
                  </div>
                ) : (
                  `Tümünü Kaydet (${bulkCourses.filter(c => c.program_course_id && c.instructor_id && c.classroom_id).length} ders)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
