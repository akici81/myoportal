'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { ScheduleExport } from '@/components/schedule/ScheduleExport'
import { toast } from 'sonner'
import { BookOpen, AlertTriangle, CheckCircle, Sparkles, CalendarDays, MousePointerClick, Clock, X } from 'lucide-react'
import type { AcademicPeriod, Department, Program, Instructor, Classroom, ProgramCourse } from '@/types'
import clsx from 'clsx'

export default function SchedulePage() {
  const supabase = createClient()
  // Global State
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<1 | 2>(1)
  
  // Schedule Data
  const [entries, setEntries] = useState<any[]>([])
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Editor State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addSlot, setAddSlot] = useState<{ day: number; slotId: string } | null>(null)
  
  // Foreign Keys for modal
  const [programCourses, setProgramCourses] = useState<any[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [suggestedClassrooms, setSuggestedClassrooms] = useState<Classroom[]>([])
  
  // Form handling
  const [form, setForm] = useState({ program_course_id: '', classroom_id: '', instructor_id: '' })
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<any[]>([])

  // Initial Fetches (Periods, Slots, Depts, Classrooms)
  useEffect(() => {
    supabase.from('academic_periods').select('*').order('academic_year', { ascending: false })
      .then(({ data }) => {
        setPeriods(data ?? [])
        const active = data?.find((p) => p.is_active) ?? data?.[0]
        if (active) setSelectedPeriod(active)
      })
      
    supabase.from('time_slots').select('*').order('slot_number')
      .then(({ data }) => setTimeSlots(data ?? []))
      
    supabase.from('departments').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setDepartments(data ?? []))
      
    supabase.from('classrooms').select('*').eq('is_active', true).order('name')
      .then(({ data }) => setClassrooms(data ?? []))
  }, [supabase])

  // Department -> Programs
  useEffect(() => {
    if (!selectedDept || selectedDept === 'all') {
      setPrograms([])
      setSelectedProgram('')
      return
    }
    supabase.from('programs').select('*').eq('department_id', selectedDept).eq('is_active', true).order('name')
      .then(({ data }) => {
        setPrograms(data ?? [])
        setSelectedProgram(data?.[0]?.id ?? '')
      })
  }, [selectedDept, supabase])

  // Triggers main loads when config is ready
  useEffect(() => {
    if (!selectedProgram || !selectedPeriod) return
    loadEntries()
    loadProgramCourses()
    loadInstructors()
  }, [selectedProgram, selectedPeriod, selectedYear])

  // Fetch Logic
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

  const loadInstructors = useCallback(async () => {
    if (!selectedDept || selectedDept === 'all') return
    const { data } = await supabase.from('instructors').select('*').eq('department_id', selectedDept).eq('is_active', true).order('full_name')
    setInstructors(data ?? [])
  }, [selectedDept, supabase])

  // Cell Interaction (Click empty cell)
  async function handleCellClick(day: number, slotId: string) {
    setAddSlot({ day, slotId })
    setForm({ program_course_id: '', classroom_id: '', instructor_id: '' })
    setConflicts([])
    setSuggestedClassrooms([])
    setShowAddModal(true)
    
    if (selectedPeriod) {
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
      setSuggestedClassrooms(Array.isArray(data) ? data : (data?.classrooms ?? []))
    }
  }

  // Conflict Checking
  async function checkConflicts() {
    if (!addSlot || !selectedPeriod || !form.classroom_id || !form.instructor_id) return false
    const res = await fetch('/api/schedule/check-conflict', {
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
    const result = await res.json()
    setConflicts(result.conflicts ?? [])
    return result.hasConflict
  }

  // Save changes
  async function handleSave() {
    if (!addSlot || !selectedPeriod) return
    if (!form.program_course_id || !form.classroom_id || !form.instructor_id) {
      toast.error('Tüm alanları doldurmanız gerekmektedir.')
      return
    }
    const hasConflict = await checkConflicts()
    if (hasConflict) {
      toast.error('Giderilmeyen çakışmalar var. Lütfen düzeltin.')
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

  // Deletion logic
  async function handleDelete(id: string) {
    const res = await fetch(`/api/schedule/entries?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Ders başarıyla kaldırıldı')
      loadEntries()
    } else toast.error('Silme işlemi yapılamadı')
  }

  const selectedSlot = timeSlots.find((s) => s.id === addSlot?.slotId)
  const DAYS = ['', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']

  const selectedProgramInfo = programs.find((p) => p.id === selectedProgram)
  const exportTitle = selectedProgramInfo ? `${selectedProgramInfo.name} - ${selectedYear}. Sınıf` : 'Ders Programı'

  return (
    <div className="space-y-6 animate-in">
      {/* Header Container Premium Cyan*/}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-900/50 via-teal-900/30 to-gray-900 p-8 border border-cyan-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <CalendarDays className="w-48 h-48 text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
              Ders Programı Merkezi
            </h1>
            <p className="mt-2 text-gray-400 max-w-2xl font-medium">
              Tüm programların, tüm sınıflarının haftalık ders akışlarını oluşturun, takip edin ve çakışmasız yerleşim yapın.
            </p>
          </div>
          {entries.length > 0 && (
             <ScheduleExport entries={entries} timeSlots={timeSlots} title={exportTitle} />
          )}
        </div>
      </div>

      <div className="space-y-6 max-w-screen-2xl mx-auto">
        {/* Filters Top Bar */}
        <div className="card p-5 rounded-2xl border border-gray-800/60 shadow-xl relative z-20">
          <div className="flex items-center gap-2 mb-4">
            <MousePointerClick className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Hedef Program Seçimi</h3>
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
            
            <div className="flex-1 min-w-[200px]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block pl-1">Kategori / Bölüm</label>
              <select
                className="w-full bg-gray-900/70 border border-gray-700/80 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-semibold"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="all">— Tüm Bölümler —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {programs.length > 0 && (
              <div className="flex-1 min-w-[240px]">
                <label className="text-[11px] font-bold text-cyan-500 uppercase tracking-wider mb-1 block pl-1">Program</label>
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
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block pl-1">Sınıf</label>
                <div className="flex gap-1.5 p-1 rounded-xl bg-gray-900/50 border border-gray-800">
                  {([1, 2] as const).map((y) => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={clsx(
                        'px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center min-w-[90px]',
                        selectedYear === y
                          ? 'bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-inner'
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
              <p>Sistemde henüz aktif bir Eğitim Dönemi (Academic Period) bulunamadı. Program hazırlayabilmek için veritabanı üzerinden geçerli bir dönem tanımlayın veya aktif edin.</p>
            </div>
          )}
        </div>

        {/* Schedule Stage */}
        <div className="min-h-[500px]">
          {selectedProgram && selectedPeriod ? (
            loading ? (
              <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-gray-800/60">
                <div className="w-12 h-12 rounded-full border-4 border-cyan-800 border-t-cyan-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-white tracking-tight">Program Yükleniyor</h3>
                <p className="text-gray-500 mt-2">Ders blokları analiz ediliyor, lütfen bekleyin...</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ScheduleGrid
                  entries={entries}
                  timeSlots={timeSlots}
                  onDelete={handleDelete}
                  onCellClick={handleCellClick}
                />
              </div>
            )
          ) : (
            <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-gray-800/60 border-dashed bg-gray-900/20">
              <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-900/50">
                <CalendarDays className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-200 tracking-tight">Henüz Program Seçilmedi</h3>
              <p className="text-gray-500 mt-3 max-w-md mx-auto leading-relaxed">
                Tabloyu görüntülemek veya düzenlemek için yukarıdaki menüden ilgili departmanı ve programı seçmeniz gerekmektedir.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showAddModal && addSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in zoom-in-95 duration-200">
          <div className="card w-full max-w-xl p-0 rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-cyan-900/30 bg-gradient-to-r from-cyan-950 to-gray-900 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2 tracking-tight">
                  Derse Görevlendirme
                </h3>
                <div className="flex items-center gap-1.5 mt-2 bg-gray-900/80 px-2 py-1 rounded inline-flex text-xs font-semibold uppercase tracking-widest text-cyan-400 border border-cyan-900/50">
                  <Clock className="w-3.5 h-3.5" />
                  {DAYS[addSlot.day]} · {selectedSlot?.start_time?.slice(0, 5)} – {selectedSlot?.end_time?.slice(0, 5)}
                </div>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-lg p-2 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block pl-1">İlgili Ders</label>
                  <select
                    className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors form-select appearance-none font-semibold"
                    value={form.program_course_id}
                    onChange={(e) => {
                      const pc = programCourses.find((x) => x.id === e.target.value)
                      setForm((f) => ({ ...f, program_course_id: e.target.value, instructor_id: pc?.instructor_id ?? f.instructor_id }))
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

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block pl-1">Atanan Öğretim Elemanı</label>
                  <select
                    className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors form-select appearance-none"
                    value={form.instructor_id}
                    onChange={(e) => setForm((f) => ({ ...f, instructor_id: e.target.value }))}
                  >
                    <option value="">— Kadrodan Hoca Seçin —</option>
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title} {i.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 pl-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Verilecek Derslik</label>
                    {suggestedClassrooms.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                        <Sparkles className="w-3 h-3" /> {suggestedClassrooms.length} Tavsiye
                      </span>
                    )}
                  </div>
                  <select
                    className="w-full bg-gray-900/50 border border-gray-700/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors form-select appearance-none"
                    value={form.classroom_id}
                    onChange={(e) => setForm((f) => ({ ...f, classroom_id: e.target.value }))}
                  >
                    <option value="">— Yerleşke Dersliklerinden Seçin —</option>
                    {suggestedClassrooms.length > 0 && (
                      <optgroup label="✓ Bu Şartlara ve Saate Uygun Açık Derslikler" className="bg-gray-800 text-teal-400">
                        {suggestedClassrooms.map((c) => (
                          <option key={c.id} value={c.id} className="text-white">
                            {c.name} — {c.capacity} Kişilik Kapasite
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Tüm Fiziksel Derslikler" className="bg-gray-900 text-gray-500 mt-2">
                      {classrooms.filter((c) => !suggestedClassrooms.find((s) => s.id === c.id)).map((c) => (
                        <option key={c.id} value={c.id} className="text-white">
                          {c.name} — {c.capacity} Kişilik Kapasite
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Conflict Result Section */}
              {conflicts.length > 0 && (
                <div className="p-4 rounded-xl space-y-2.5 bg-rose-500/10 border border-rose-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <h4 className="text-sm font-bold text-rose-400 uppercase tracking-widest">Çakışma Tespit Edildi</h4>
                  </div>
                  {conflicts.map((c, i) => (
                    <p key={i} className="text-[13px] text-rose-300/80 font-medium pl-8 shadow-sm">
                      {c.detail}
                    </p>
                  ))}
                </div>
              )}

              {conflicts.length === 0 && form.program_course_id && form.instructor_id && form.classroom_id && (
                <div className="p-4 rounded-xl flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400">Çakışma Yok, Onaylanabilir</h4>
                    <p className="text-[11px] text-emerald-500/80 font-medium mt-0.5">Seçilen eğitmen, sınıf ve grup için bu saat tamamen uygun.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-gray-900/80 border-t border-gray-800/80 mt-auto flex gap-3">
              <button onClick={() => { setShowAddModal(false); setConflicts([]); }} className="px-4 py-2.5 rounded-xl font-bold text-sm text-gray-400 bg-gray-800/50 hover:bg-gray-700 hover:text-white transition flex-1">
                İptal Et
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving || !form.program_course_id || !form.classroom_id || !form.instructor_id} 
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex-[2] flex items-center justify-center gap-2 shadow-lg transition-all bg-gradient-to-r from-cyan-600 to-teal-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Sisteme İşleniyor...' : 'Ders Saatini Programa Kaydet'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
