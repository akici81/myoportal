'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { ScheduleExport } from '@/components/schedule/ScheduleExport'
import { AlertTriangle, CalendarDays, MousePointerClick } from 'lucide-react'
import type { AcademicPeriod, Department, Program } from '@/types'
import clsx from 'clsx'

export default function ScheduleReadOnlyPage() {
  const supabase = createClient()
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<1 | 2>(1)
  
  const [entries, setEntries] = useState<any[]>([])
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

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
  }, [supabase])

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

  useEffect(() => {
    if (!selectedProgram || !selectedPeriod) return
    loadEntries()
  }, [selectedProgram, selectedPeriod, selectedYear])

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

  const selectedProgramInfo = programs.find((p) => p.id === selectedProgram)
  const exportTitle = selectedProgramInfo ? `${selectedProgramInfo.name} - ${selectedYear}. Sınıf` : 'Ders Programı'

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-cyan-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <CalendarDays className="w-48 h-48 text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-default flex items-center gap-3 tracking-tight" style={{ color: 'var(--text)' }}>
              Kurum Ders Programları
            </h1>
            <p className="mt-2 text-muted max-w-2xl font-medium">
              Tüm programların haftalık ders akışlarını inceleyin ve dışa aktarın.
            </p>
          </div>
          {entries.length > 0 && (
             <ScheduleExport entries={entries} timeSlots={timeSlots} title={exportTitle} />
          )}
        </div>
      </div>

      <div className="space-y-6 max-w-screen-2xl mx-auto">
        <div className="card p-5 rounded-2xl border shadow-xl relative z-20">
          <div className="flex items-center gap-2 mb-4">
            <MousePointerClick className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-bold text-muted uppercase tracking-wider">Hedef Program Filtresi</h3>
          </div>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] max-w-[250px]">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block pl-1">Akademik Dönem</label>
              <select
                className="w-full card border rounded-xl px-4 py-3 text-sm text-default focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-semibold" style={{ color: 'var(--text)' }}
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
                className="w-full card border rounded-xl px-4 py-3 text-sm text-default focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-semibold" style={{ color: 'var(--text)' }}
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
                    <option key={p.id} value={p.id} className="card text-default">{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedProgram && (
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block pl-1">Sınıf</label>
                <div className="flex gap-1.5 p-1 rounded-xl card border">
                  {([1, 2] as const).map((y) => (
                    <button
                      key={y}
                      onClick={() => setSelectedYear(y)}
                      className={clsx(
                        'px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center min-w-[90px]',
                        selectedYear === y
                          ? 'bg-cyan-600 text-white shadow-lg shadow-inner'
                          : 'bg-transparent text-muted hover:text-muted hover:card'
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
              <p>Sistemde henüz aktif bir Eğitim Dönemi bulunamadı.</p>
            </div>
          )}
        </div>

        <div className="min-h-[500px]">
          {selectedProgram && selectedPeriod ? (
            loading ? (
              <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border">
                <div className="w-12 h-12 rounded-full border-4 border-cyan-800 border-t-cyan-500 animate-spin mb-4" />
                <h3 className="text-xl font-bold text-default tracking-tight" style={{ color: 'var(--text)' }}>Program Yükleniyor</h3>
                <p className="text-gray-500 mt-2">Ders blokları analiz ediliyor, lütfen bekleyin...</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <ScheduleGrid
                  entries={entries}
                  timeSlots={timeSlots}
                />
              </div>
            )
          ) : (
            <div className="card flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-dashed card">
              <div className="w-20 h-20 card/50 rounded-full flex items-center justify-center mb-6 ring-8 ring-gray-900/50">
                <CalendarDays className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-2xl font-black text-muted tracking-tight">Henüz Program Seçilmedi</h3>
              <p className="text-gray-500 mt-3 max-w-md mx-auto leading-relaxed">
                Tabloyu görüntülemek için yukarıdaki menüden ilgili departmanı ve programı seçmeniz gerekmektedir.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
