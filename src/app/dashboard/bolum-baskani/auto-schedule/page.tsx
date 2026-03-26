'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Wand2, RefreshCw, AlertTriangle, CheckCircle, Building2, Users, BookOpen, Clock,
  ChevronDown, ChevronUp, X, Plus, Zap, Settings, Info, Sparkles, Layers, Check
} from 'lucide-react'
import clsx from 'clsx'

interface Program { id: string; name: string; short_code: string; department_id: string }
interface ProgramCourse {
  id: string; program_id: string; course_id: string; instructor_id: string | null;
  year_number: number; student_count: number;
  programs: { name: string; short_code: string };
  courses: { code: string; name: string; weekly_hours: number; requires_lab: boolean; requires_kitchen: boolean };
  instructors: { full_name: string; title: string } | null;
}
interface Classroom { id: string; name: string; building: string; capacity: number; type: string; has_projector: boolean; has_computer: boolean }
interface Constraint { id: string; instructor_id: string; constraint_type: string; day_of_week: number | null; time_slot_id: string | null; is_hard: boolean; reason: string | null }
interface PlacementResult {
  placedCount: number;
  failed: Array<{ course: string; program: string; reason: string }>;
  stats: { totalCourses: number; placedCourses: number; failedCourses: number; totalHours: number }
}

const YEAR_OPTIONS = [ { value: 0, label: 'Tüm Sınıflar' }, { value: 1, label: '1. Sınıf' }, { value: 2, label: '2. Sınıf' } ]

export default function AutoSchedulePage() {
  const supabase = createClient()

  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null)
  const [departmentName, setDepartmentName] = useState<string>('')

  const [programs, setPrograms] = useState<Program[]>([])
  const [programCourses, setProgramCourses] = useState<ProgramCourse[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [constraints, setConstraints] = useState<Constraint[]>([])
  const [activePeriodId, setActivePeriodId] = useState<string>('')
  const [existingEntryCount, setExistingEntryCount] = useState(0)

  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(0)
  const [priorityClassrooms, setPriorityClassrooms] = useState<string[]>([])
  const [clearExisting, setClearExisting] = useState(false)
  const [respectConstraints, setRespectConstraints] = useState(true)

  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [showClassroomPicker, setShowClassroomPicker] = useState(false)
  const [dayDistribution, setDayDistribution] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('department_id, departments!profiles_department_id_fkey(name)').eq('id', user.id).single()
      if (profile?.department_id) {
        setUserDepartmentId(profile.department_id)
        const depts = profile.departments as any
        setDepartmentName(depts?.name || '')
      }
    }
    loadUser()
  }, [supabase])

  useEffect(() => {
    if (userDepartmentId) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDepartmentId])

  useEffect(() => {
    if (selectedProgram && activePeriodId) loadExistingEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram, selectedYear, activePeriodId])

  async function loadData() {
    setLoading(true)
    const { data: periods } = await supabase.from('academic_periods').select('id').eq('is_active', true).maybeSingle()
    if (periods) setActivePeriodId(periods.id)

    const { data: programsData } = await supabase.from('programs').select('id, name, short_code, department_id').eq('department_id', userDepartmentId).eq('is_active', true).order('short_code')
    setPrograms(programsData ?? [])
    if (programsData && programsData.length > 0) setSelectedProgram(programsData[0].id)

    if (programsData && programsData.length > 0) {
      const pIds = programsData.map((p) => p.id)
      const { data: coursesData } = await supabase.from('program_courses')
        .select(`id, program_id, course_id, instructor_id, year_number, student_count, programs(name, short_code), courses(code, name, weekly_hours, requires_lab, requires_kitchen), instructors(full_name, title)`)
        .in('program_id', pIds).eq('is_active', true).order('year_number')
      setProgramCourses((coursesData as any) ?? [])
    }

    const { data: classroomsData } = await supabase.from('classrooms').select('id, name, building, capacity, type, has_projector, has_computer').eq('is_active', true).order('name')
    setClassrooms(classroomsData ?? [])

    const { data: instructorsData } = await supabase.from('instructors').select('id').eq('department_id', userDepartmentId)
    if (instructorsData && instructorsData.length > 0) {
      const iIds = instructorsData.map((i) => i.id)
      const { data: constraintsData } = await supabase.from('instructor_constraints').select('*').in('instructor_id', iIds)
      setConstraints((constraintsData as Constraint[]) ?? [])
    }
    setLoading(false)
  }

  async function loadExistingEntries() {
    let filtered = programCourses.filter((pc) => pc.program_id === selectedProgram)
    if (selectedYear > 0) filtered = filtered.filter((pc) => pc.year_number === selectedYear)
    if (filtered.length === 0) { setExistingEntryCount(0); return }
    const pcIds = filtered.map((pc) => pc.id)
    const { count } = await supabase.from('schedule_entries').select('*', { count: 'exact', head: true }).eq('period_id', activePeriodId).in('program_course_id', pcIds)
    setExistingEntryCount(count || 0)
  }

  const filteredCourses = useMemo(() => {
    let filtered = programCourses.filter((pc) => pc.program_id === selectedProgram)
    if (selectedYear > 0) filtered = filtered.filter((pc) => pc.year_number === selectedYear)
    return filtered
  }, [programCourses, selectedProgram, selectedYear])

  const stats = useMemo(() => {
    const totalHours = filteredCourses.reduce((sum, pc) => sum + (pc.courses?.weekly_hours || 0), 0)
    const withInstructor = filteredCourses.filter((pc) => pc.instructor_id).length
    const withConstraints = new Set(constraints.filter((c) => filteredCourses.some((pc) => pc.instructor_id === c.instructor_id)).map(c => c.instructor_id)).size
    return { totalCourses: filteredCourses.length, totalHours, withInstructor, withConstraints }
  }, [filteredCourses, constraints])

  function togglePriorityClassroom(classroomId: string) {
    setPriorityClassrooms((prev) => prev.includes(classroomId) ? prev.filter((id) => id !== classroomId) : [...prev, classroomId])
  }

  function movePriority(index: number, direction: 'up' | 'down') {
    const newList = [...priorityClassrooms]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newList.length) return
    ;[newList[index], newList[newIndex]] = [newList[newIndex], newList[index]]
    setPriorityClassrooms(newList)
  }

  async function generateSchedule() {
    if (!selectedProgram || !activePeriodId) return toast.error('Hata: Aktif Eğitim Dönemi bulunamadı veya Program seçilmedi.')
    if (filteredCourses.length === 0) return toast.error('Bu programa atanmış hiç ders bulunmuyor.')
    if (clearExisting && existingEntryCount > 0) {
      if (!confirm(`Dikkat: Bu program/sınıf için ${existingEntryCount} adet yerleştirilmiş mevcut ders programı var. Bunları silip YENİDEN OLUŞTURMAK istediğinize emin misiniz?`)) return
    }

    setGenerating(true)
    setResult(null)

    try {
      const response = await fetch('/api/schedule/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicPeriodId: activePeriodId,
          clearExisting,
          programId: selectedProgram,
          yearNumber: selectedYear > 0 ? selectedYear : undefined,
          priorityClassroomIds: priorityClassrooms.length > 0 ? priorityClassrooms : undefined,
          respectConstraints,
          departmentId: userDepartmentId,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Bir sunucu hatası oluştu')

      setResult(data.result)
      setDayDistribution(data.dayDistribution || null)
      toast.success(data.message)
      loadExistingEntries()
    } catch (error) {
       toast.error(error instanceof Error ? error.message : 'Bir hata oluştu')
    } finally {
      setGenerating(false)
    }
  }

  const selProgInfo = programs.find((p) => p.id === selectedProgram)

  return (
    <div className="space-y-6 animate-in">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-blue-800/30 shadow-lg">
        <div className="absolute -right-6 -top-6 opacity-[0.05] rotate-12">
          <Wand2 className="w-56 h-56 text-red-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-400 bg-red-600/10 px-2.5 py-1 rounded border border-red-600/20"><Sparkles className="w-3.5 h-3.5" /> Yapay Zeka Destekli Sistem</span>
              <span className="text-xs font-medium text-gray-500 hidden sm:inline-block">({departmentName})</span>
            </div>
            <h1 className="text-3xl font-black text-default flex items-center gap-3 tracking-tight" style={{ color: 'var(--text)' }}>
              Otomatik Ders Programı Sihirbazı
            </h1>
            <p className="mt-2 text-muted max-w-2xl font-medium leading-relaxed">
              Ders atamalarınızı, laboratuvar/derslik kapasitelerini ve eğitmenlerin kısıt kurallarını dikkate alarak <b>tek tuşla</b> en verimli ders programını oluşturun.
            </p>
          </div>
          <button onClick={generateSchedule} disabled={generating || !selectedProgram || filteredCourses.length === 0} className="btn-glow inline-flex items-center gap-2.5 px-6 py-3 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundImage: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 25px rgba(59, 130, 246, 0.4)' }}>
            {generating ? <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" /> : <Wand2 className="w-5 h-5" />}
            <span className="text-[15px] font-bold tracking-wide">{generating ? 'Sihir Gerçekleşiyor...' : 'Sihirbazı Başlat'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card py-24 flex flex-col items-center justify-center rounded-2xl border">
          <div className="w-12 h-12 rounded-full border-4 border-blue-900 border-t-red-600 animate-spin mb-4" />
          <p className="text-muted font-medium tracking-wide">Analiz yapılıyor, Lütfen bekleyin...</p>
        </div>
      ) : (
        <>
          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card border rounded-xl p-5 flex items-center gap-4 group hover:border-red-600/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center border border-red-600/20 shrink-0"><BookOpen className="w-6 h-6 text-red-600" /></div>
              <div><p className="text-2xl font-black text-default leading-none mb-1" style={{ color: 'var(--text)' }}>{stats.totalCourses}</p><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hedef Ders</p></div>
            </div>
            <div className="card border rounded-xl p-5 flex items-center gap-4 group hover:border-emerald-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0"><Clock className="w-6 h-6 text-emerald-500" /></div>
              <div><p className="text-2xl font-black text-default leading-none mb-1" style={{ color: 'var(--text)' }}>{stats.totalHours}</p><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Saat</p></div>
            </div>
            <div className="card border rounded-xl p-5 flex items-center gap-4 group hover:border-fuchsia-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20 shrink-0"><Users className="w-6 h-6 text-fuchsia-500" /></div>
              <div><p className="text-2xl font-black text-default leading-none mb-1" style={{ color: 'var(--text)' }}>{stats.withInstructor}</p><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hocası Hazır</p></div>
            </div>
            <div className="card border rounded-xl p-5 flex items-center gap-4 group hover:border-amber-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
              <div><p className="text-2xl font-black text-default leading-none mb-1" style={{ color: 'var(--text)' }}>{stats.withConstraints}</p><p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kısıtlı Eğitmen</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Konfigürasyon Panel */}
            <div className="card rounded-2xl border p-6 flex flex-col h-full">
               <h3 className="font-black text-default mb-6 flex items-center gap-2.5 text-lg">
                  <Settings className="w-5 h-5 text-red-600" /> Yerleştirme Algoritması Ayarları
               </h3>
               
               <div className="space-y-6 flex-1">
                  <div>
                     <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block">Hedef Program</label>
                     <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className="w-full card border rounded-xl px-4 py-3 text-sm font-bold text-default focus:outline-none focus:border-red-600 transition-colors shadow-inner" style={{ color: 'var(--text)' }}>
                        <option value="">— Lütfen Bir Program Seçin —</option>
                        {programs.map(p => <option key={p.id} value={p.id}>{p.short_code} — {p.name}</option>)}
                     </select>
                  </div>

                  <div>
                     <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block">Dahil Edilecek Sınıf Düzeyi</label>
                     <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="w-full card border rounded-xl px-4 py-3 text-sm font-bold text-default focus:outline-none focus:border-red-600 transition-colors shadow-inner" style={{ color: 'var(--text)' }}>
                        {YEAR_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                     </select>
                  </div>

                  <div>
                     <label className="text-xs font-bold uppercase tracking-wider text-muted mb-3 block">Motor Davranış Kuralları</label>
                     <div className="space-y-3">
                        <label className={clsx("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all", respectConstraints ? 'bg-red-600/10 border-red-600/40 hover:bg-red-600/20' : 'card hover:border-gray-700')}>
                           <div className="flex items-center justify-center w-5 h-5 rounded mt-0.5 border border-red-600/50 card">
                             {respectConstraints && <Check className="w-3.5 h-3.5 text-red-400" />}
                           </div>
                           <input type="checkbox" checked={respectConstraints} onChange={e => setRespectConstraints(e.target.checked)} className="hidden" />
                           <div>
                              <p className={clsx("text-sm font-bold", respectConstraints ? 'text-blue-300' : 'text-muted')}>Öğretim Elemanı Kısıtlarını Koru</p>
                              <p className="text-xs mt-0.5 text-gray-500">Kısıtlamalarda tanımlanan Zorunlu ve Tercihi (esnek) kurallar algoritma tarafından hesaba katılır.</p>
                           </div>
                        </label>
                        
                        <label className={clsx("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all", clearExisting ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20' : 'card hover:border-gray-700')}>
                           <div className="flex items-center justify-center w-5 h-5 rounded mt-0.5 border border-rose-500/50 card">
                             {clearExisting && <Check className="w-3.5 h-3.5 text-rose-400" />}
                           </div>
                           <input type="checkbox" checked={clearExisting} onChange={e => setClearExisting(e.target.checked)} className="hidden" />
                           <div>
                              <p className={clsx("text-sm font-bold", clearExisting ? 'text-rose-300' : 'text-muted')}>Önceden Üretilen Programı Üzerine Yaz</p>
                              <p className="text-xs mt-0.5 text-gray-500">Seçili Sınıf(lar) için {existingEntryCount} adet takvim ataması var. Üretilen yeni program bu kayıtları silecek.</p>
                           </div>
                        </label>
                     </div>
                  </div>
               </div>
            </div>

            {/* Öncelikli Derslikler Paneil */}
            <div className="card rounded-2xl border p-6 flex flex-col h-full">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-default flex items-center gap-2.5 text-lg">
                     <Layers className="w-5 h-5 text-red-600" /> Konum / Derslik Önceliği
                  </h3>
                  <button onClick={() => setShowClassroomPicker(true)} className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-default transition-colors border border-red-600/30">
                     <Plus className="w-4 h-4" />
                  </button>
               </div>

               <div className="bg-red-600/5 border border-red-600/10 rounded-xl p-4 flex gap-3 mb-4">
                  <Info className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                     <p className="text-sm font-bold text-red-300 mb-1">Akıllı Arama Sırası</p>
                     <p className="text-xs text-red-200/60 font-medium leading-relaxed">Algoritma sınıf ararken ilk olarak aşağıdaki listeye bakar. Eğer buradaki derslikler meşgulse (ya da kapasiteleri yetmiyorsa), mecburen kampüsteki diğer uygun açık dersliklere geçer.</p>
                  </div>
               </div>

               <div className="flex-1">
                  {priorityClassrooms.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl text-center">
                        <Building2 className="w-12 h-12 text-gray-700 mb-3" />
                        <p className="text-sm font-bold text-muted">Herhangi bir derslik önceliği yok.</p>
                        <p className="text-xs text-gray-600 mt-1 max-w-[200px]">Program tüm kampüs dersliklerini eşit olarak tarayacaktır.</p>
                     </div>
                  ) : (
                     <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                        {priorityClassrooms.map((classroomId, index) => {
                           const c = classrooms.find((x) => x.id === classroomId)
                           if (!c) return null
                           return (
                              <div key={classroomId} className="flex items-center gap-3 p-3 rounded-xl card border hover:border-gray-700 transition-colors group">
                                 <div className="flex flex-col gap-0.5 opacity-50 group-hover:opacity-50 transition-opacity">
                                    <button onClick={() => movePriority(index, 'up')} disabled={index===0} className="hover:text-default disabled:opacity-10"><ChevronUp className="w-4 h-4" /></button>
                                    <button onClick={() => movePriority(index, 'down')} disabled={index===priorityClassrooms.length-1} className="hover:text-default disabled:opacity-10"><ChevronDown className="w-4 h-4" /></button>
                                 </div>
                                 <div className="w-6 h-6 rounded bg-red-600/20 text-red-400 flex items-center justify-center font-black text-xs border border-red-600/30">
                                    {index + 1}
                                 </div>
                                 <div className="flex-1 ml-1">
                                    <p className="text-sm font-bold text-default leading-tight" style={{ color: 'var(--text)' }}>{c.name}</p>
                                    <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Kapasite: {c.capacity} · {c.building} Blok</p>
                                 </div>
                                 <button onClick={() => togglePriorityClassroom(classroomId)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-colors">
                                    <X className="w-4 h-4" />
                                 </button>
                              </div>
                           )
                        })}
                     </div>
                  )}
               </div>
            </div>
          </div>

          {/* Results Modal/Card */}
          {result && (
             <div className="card overflow-hidden rounded-2xl border shadow-xl mt-6 animate-in slide-in-from-bottom-8 duration-500 card">
                <div className="p-6 lg:p-8">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30"><CheckCircle className="w-5 h-5 text-emerald-400" /></div>
                      <h2 className="text-2xl font-black text-default" style={{ color: 'var(--text)' }}>Yapay Zeka Yerleştirme Sonuçları</h2>
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="card border rounded-xl p-4">
                         <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Toplam İşlenen Ders</p>
                         <p className="text-2xl font-black text-default" style={{ color: 'var(--text)' }}>{result.stats.totalCourses}</p>
                      </div>
                      <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4">
                         <p className="text-[11px] font-bold text-emerald-500/70 uppercase tracking-widest mb-1">Başarı İle Yerleşen</p>
                         <p className="text-2xl font-black text-emerald-400">{result.stats.placedCourses}</p>
                      </div>
                      <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl p-4">
                         <p className="text-[11px] font-bold text-rose-500/70 uppercase tracking-widest mb-1">Yerleşemeyen Ders</p>
                         <p className="text-2xl font-black text-rose-400">{result.stats.failedCourses}</p>
                      </div>
                      <div className="bg-indigo-950/30 border border-red-600/20 rounded-xl p-4">
                         <p className="text-[11px] font-bold text-red-600/70 uppercase tracking-widest mb-1">Program Saat Yükü</p>
                         <p className="text-2xl font-black text-red-400">{result.stats.totalHours}</p>
                      </div>
                   </div>

                   <div className="mb-8">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-sm font-bold text-muted">Algoritma Başarı Oranı</span>
                         <span className="text-sm font-black text-emerald-400">{result.stats.totalCourses > 0 ? Math.round((result.stats.placedCourses / result.stats.totalCourses) * 100) : 0}%</span>
                      </div>
                      <div className="h-3 card rounded-full overflow-hidden border shadow-inner">
                         <div className="h-full bg-cyan-600 transition-all duration-1000 ease-out" style={{ width: `${result.stats.totalCourses > 0 ? (result.stats.placedCourses / result.stats.totalCourses) * 100 : 0}%` }} />
                      </div>
                   </div>

                   {/* Distribution */}
                   {dayDistribution && (
                     <div>
                        <h4 className="text-sm font-bold text-muted mb-4 uppercase tracking-widest border-b pb-2">Haftalık Gün Dağılım Grafiği (Saatler)</h4>
                        <div className="grid grid-cols-5 gap-3 max-w-2xl">
                           {['Pzt', 'Sal', 'Çar', 'Per', 'Cum'].map((day, idx) => {
                             const count = dayDistribution[(idx + 1).toString()] || 0
                             const maxCount = Math.max(...Object.values(dayDistribution))
                             const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
                             return (
                               <div key={day} className="flex flex-col items-center">
                                 <div className="w-full h-24 card rounded-lg border flex items-end justify-center p-1 mb-2">
                                   <div className="w-full rounded bg-cyan-600 transition-all duration-1000 delay-300 ease-out" style={{ height: `${percentage}%`, minHeight: count > 0 ? '4px' : '0' }} />
                                 </div>
                                 <p className="text-sm font-black text-default">{count}</p>
                                 <p className="text-[11px] font-bold text-gray-500">{day}</p>
                               </div>
                             )
                           })}
                        </div>
                     </div>
                   )}

                   {/* Failures */}
                   {result.failed.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-dashed">
                         <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <h4 className="text-base font-bold text-amber-500">Çakışan veya Yerleşemeyen Dersler ({result.failed.length})</h4>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {result.failed.map((f, i) => (
                               <div key={i} className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
                                  <p className="text-sm font-bold text-muted mb-1 leading-tight">{f.course}</p>
                                  <p className="text-[11px] text-gray-500 mb-2 font-medium">{f.program}</p>
                                  <span className="inline-block px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold tracking-wider uppercase">{f.reason}</span>
                               </div>
                            ))}
                         </div>
                         <p className="text-xs font-medium text-gray-500 mt-4 leading-relaxed max-w-2xl">
                            💡 Otomatik yerleşemeyen bazı dersleri "Ders Programları" modülüne manuel geçerek (elle sürükleyip bırakarak) çözebilirsiniz. Bazen laboratuvar eksikliği bazen de hocanın kısıtlamaları (Eğer tik atılmışsa) buna sebep olur.
                         </p>
                      </div>
                   )}
                </div>
             </div>
          )}
        </>
      )}

      {/* Classroom Picker Dialog */}
      {showClassroomPicker && (
         <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="card w-full max-w-3xl rounded-2xl border shadow-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
               <div className="p-6 border-b flex items-center justify-between card">
                  <div>
                     <h2 className="text-xl font-black text-default" style={{ color: 'var(--text)' }}>Derslik Arşivinden Seçim Yapın</h2>
                     <p className="text-xs text-gray-500 mt-1 font-medium">Bu programda algoritmanın öncelikle hedeflemesi gereken laboratuvar/sınıflar.</p>
                  </div>
                  <button onClick={() => setShowClassroomPicker(false)} className="p-2 hover:card rounded-xl transition-colors"><X className="w-5 h-5 text-muted" /></button>
               </div>
               
               <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-950/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                     {classrooms.filter(c => !priorityClassrooms.includes(c.id)).map(c => (
                        <button key={c.id} onClick={() => { togglePriorityClassroom(c.id); setShowClassroomPicker(false) }} className="p-4 rounded-xl border card hover:bg-red-600/10 hover:border-red-600/50 transition-all text-left group">
                           <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
                              <span className="font-bold text-default text-sm">{c.name}</span>
                           </div>
                           <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted card px-2 py-0.5 rounded">{c.capacity} Kişi</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.building} Blok</span>
                           </div>
                        </button>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  )
}
