'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Save, Search, CheckCircle2, AlertCircle, BookOpen, Users, Edit3, X, Check, BookMarked, UserCheck, AlertTriangle
} from 'lucide-react'
import clsx from 'clsx'

interface Course {
  id: string
  code: string
  name: string
  weekly_hours: number
  course_type: string
  is_uzem: boolean
  requires_lab: boolean
  requires_kitchen: boolean
}

interface Instructor {
  id: string
  full_name: string
  title: string
}

interface ProgramCourse {
  id: string
  program_id: string
  course_id: string
  instructor_id: string | null
  year_number: number
  semester: number
  student_count: number | null
  course: Course
  instructor: Instructor | null
  program: {
    name: string
    short_code: string
  }
}

type ChangeRecord = {
  instructor_id?: string | null
  student_count?: number | null
}

export default function CourseAssignmentsPage() {
  const [programCourses, setProgramCourses] = useState<ProgramCourse[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<Record<string, ChangeRecord>>({})
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterYear, setFilterYear] = useState<number | 'all'>('all')
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'assigned' | 'unassigned'>('all')
  const [filterProgram, setFilterProgram] = useState<string>('all')
  
  const [departmentName, setDepartmentName] = useState('')
  const [editingStudentCount, setEditingStudentCount] = useState<string | null>(null)
  const [tempStudentCount, setTempStudentCount] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase.from('profiles').select('department_id, role').eq('id', user.id).single()

    let targetDeptId = profile?.department_id

    if (!targetDeptId && profile?.role === 'bolum_baskani') {
      const { data: headDept } = await supabase.from('departments').select('id').eq('head_id', user.id).eq('is_active', true).single()
      if (headDept) targetDeptId = headDept.id
    }

    if (!targetDeptId) {
      toast.error('Bağlı olduğunuz bölüm bulunamadı.')
      setLoading(false)
      return
    }

    const { data: dept } = await supabase.from('departments').select('name').eq('id', targetDeptId).single()
    setDepartmentName(dept?.name || '')

    const { data: programs } = await supabase.from('programs').select('id').eq('department_id', targetDeptId)
    const programIds = programs?.map((p) => p.id) || []

    const { data: courses } = await supabase
      .from('program_courses')
      .select(`
        id, program_id, course_id, instructor_id, year_number, semester, student_count,
        course:courses(id, code, name, weekly_hours, course_type, is_uzem, requires_lab, requires_kitchen),
        instructor:instructors(id, full_name, title),
        program:programs(name, short_code)
      `)
      .in('program_id', programIds)
      .eq('is_active', true)
      .order('year_number')

    const { data: allInstructors } = await supabase
      .from('instructors')
      .select('id, full_name, title')
      .eq('is_active', true)
      .order('full_name')

    setProgramCourses((courses || []) as unknown as ProgramCourse[])
    setInstructors(allInstructors || [])
    setLoading(false)
  }

  function handleInstructorChange(programCourseId: string, instructorId: string | null) {
    setChanges(prev => ({ ...prev, [programCourseId]: { ...prev[programCourseId], instructor_id: instructorId } }))
  }

  function handleStudentCountChange(programCourseId: string, count: number | null) {
    setChanges(prev => ({ ...prev, [programCourseId]: { ...prev[programCourseId], student_count: count } }))
  }

  function startEditingStudentCount(pc: ProgramCourse) {
    setEditingStudentCount(pc.id)
    const currentCount = changes[pc.id]?.student_count !== undefined ? changes[pc.id].student_count : pc.student_count
    setTempStudentCount(currentCount?.toString() || '')
  }

  function saveStudentCount(programCourseId: string) {
    const count = tempStudentCount ? parseInt(tempStudentCount) : null
    if (tempStudentCount && (isNaN(count!) || count! < 0 || count! > 500)) {
      toast.error('Geçerli bir öğrenci sayısı girin (0-500)')
      return
    }
    handleStudentCountChange(programCourseId, count)
    setEditingStudentCount(null)
    setTempStudentCount('')
  }

  function cancelEditingStudentCount() {
    setEditingStudentCount(null)
    setTempStudentCount('')
  }

  async function saveChanges() {
    if (Object.keys(changes).length === 0) return

    setSaving(true)
    try {
      for (const [programCourseId, changeData] of Object.entries(changes)) {
        const updateData: Record<string, unknown> = {}

        if (changeData.instructor_id !== undefined) updateData.instructor_id = changeData.instructor_id || null
        if (changeData.student_count !== undefined) updateData.student_count = changeData.student_count

        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase.from('program_courses').update(updateData).eq('id', programCourseId)
          if (error) throw error

          if (changeData.instructor_id !== undefined) {
             await supabase.from('schedule_entries').update({ instructor_id: changeData.instructor_id || null }).eq('program_course_id', programCourseId)
          }
        }
      }
      toast.success(`${Object.keys(changes).length} ders ataması başarıyla kaydedildi!`)
      setChanges({})
      loadData()
    } catch (error) {
      toast.error('Kaydetme hatası oluştu.')
    } finally {
      setSaving(false)
    }
  }

  // Derived calculations
  const uniquePrograms = Array.from(new Set(programCourses.map(pc => pc.program.short_code)))

  const filteredCourses = useMemo(() => {
     return programCourses.filter(pc => {
      const matchSearch = pc.course.code.toLowerCase().includes(searchTerm.toLowerCase()) || pc.course.name.toLowerCase().includes(searchTerm.toLowerCase()) || pc.program.short_code.toLowerCase().includes(searchTerm.toLowerCase())
      const matchYear = filterYear === 'all' || pc.year_number === filterYear
      const matchProgram = filterProgram === 'all' || pc.program.short_code === filterProgram
      
      const cId = changes[pc.id]?.instructor_id !== undefined ? changes[pc.id].instructor_id : pc.instructor_id
      const matchAssigned = filterAssigned === 'all' || (filterAssigned === 'assigned' && !!cId) || (filterAssigned === 'unassigned' && !cId)
      
      return matchSearch && matchYear && matchProgram && matchAssigned
    })
  }, [programCourses, searchTerm, filterYear, filterProgram, filterAssigned, changes])

  const totalCourses = programCourses.length
  const assignedCount = programCourses.filter(pc => (changes[pc.id]?.instructor_id !== undefined ? changes[pc.id].instructor_id : pc.instructor_id)).length
  const unassignedCount = totalCourses - assignedCount
  const withStudentCount = programCourses.filter(pc => {
    const c = changes[pc.id]?.student_count !== undefined ? changes[pc.id].student_count : pc.student_count
    return c != null && c > 0
  }).length
  const totalChanges = Object.keys(changes).length

  return (
    <div className="space-y-6 animate-in">
      
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-amber-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <BookMarked className="w-48 h-48 text-amber-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">{departmentName}</span>
            </div>
            <h1 className="text-3xl font-black text-default flex items-center gap-3 tracking-tight" style={{ color: 'var(--text)' }}>
              Ders Görevlendirmeleri
            </h1>
            <p className="mt-2 text-muted max-w-2xl font-medium">
              Bölümünüzdeki derslere hangi öğretim elemanlarının gireceğini belirleyin ve beklenen öğrenci sayısını girerek <strong>otomatik yerleştirme asistanına</strong> yön verin.
            </p>
          </div>
          {totalChanges > 0 && (
             <button onClick={saveChanges} disabled={saving} className="btn-glow inline-flex items-center gap-2 px-6 py-3 shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, #f59e0b, #ea580c)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' }}>
               {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save className="w-5 h-5" />}
               <span>{saving ? 'Kaydediliyor...' : `${totalChanges} Değişikliği Kaydet`}</span>
             </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card py-24 flex flex-col items-center justify-center rounded-2xl border">
          <div className="w-12 h-12 rounded-full border-4 border-amber-900 border-t-amber-500 animate-spin mb-4" />
          <p className="text-muted font-medium tracking-wide">Ders listesi ve kadro hazırlanıyor...</p>
        </div>
      ) : (
        <>
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card border rounded-xl p-5 flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center border border-red-600/20 shrink-0">
                <BookOpen className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-default leading-none mb-1" style={{ color: 'var(--text)' }}>{totalCourses}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Açılan Ders</p>
              </div>
            </div>

            <div className="card border rounded-xl p-5 flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <UserCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-default leading-none mb-1" style={{ color: 'var(--text)' }}>{assignedCount}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hoca Atanmış</p>
              </div>
            </div>

            <div className="card border rounded-xl p-5 flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-rose-400 leading-none mb-1">{unassignedCount}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bekleyen Ders</p>
              </div>
            </div>

            <div className="card border rounded-xl p-5 flex items-center gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center border border-red-600/20 shrink-0">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-default leading-none mb-1" style={{ color: 'var(--text)' }}>{withStudentCount}</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sayı Girilmiş</p>
              </div>
            </div>
          </div>

          {/* Info & Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 flex-1">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Mevcut Sayısını Girmeyi Unutmayın!</p>
                <p className="text-xs text-amber-200/70 font-medium">Bölümdeki dersin öğrenci sayısı girildiğinde "Akıllı Program" bu dersi sınıf kapasitesine en uygun dersliğe atar (Örn: 52 kişilik grup için 60'lık sınıf arar).</p>
              </div>
            </div>

            <div className="card p-2 rounded-xl border flex flex-wrap gap-2 lg:w-max">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Ders Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 card border rounded-lg text-sm font-semibold text-default focus:outline-none focus:border-amber-500 transition-colors placeholder:text-gray-600" />
              </div>
              
              <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="card border rounded-lg px-3 py-2 text-sm font-semibold text-muted focus:outline-none focus:border-amber-500 transition-colors">
                <option value="all">Tüm Y.Okul Prog.</option>
                {uniquePrograms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>

              <select value={filterYear} onChange={e => setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="card border rounded-lg px-3 py-2 text-sm font-semibold text-muted focus:outline-none focus:border-amber-500 transition-colors">
                <option value="all">Sınıflar (Hepsi)</option>
                <option value={1}>1. Sınıflar</option>
                <option value={2}>2. Sınıflar</option>
              </select>

              <select value={filterAssigned} onChange={e => setFilterAssigned(e.target.value as any)} className="card border rounded-lg px-3 py-2 text-sm font-semibold text-muted focus:outline-none focus:border-amber-500 transition-colors">
                <option value="all">Durum (Tümü)</option>
                <option value="assigned">Hocası Belli</option>
                <option value="unassigned">Eksik/Atanmamış</option>
              </select>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="card overflow-hidden rounded-2xl border shadow-xl">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="card border-b">
                         <th className="py-4 px-5 text-[11px] font-black uppercase tracking-widest text-gray-500">Ders / İçerik</th>
                         <th className="py-4 px-5 text-[11px] font-black uppercase tracking-widest text-gray-500 text-center">Prog / Sınıf</th>
                         <th className="py-4 px-5 text-[11px] font-black uppercase tracking-widest text-gray-500 text-center">Kredi</th>
                         <th className="py-4 px-5 text-[11px] font-black uppercase tracking-widest text-amber-500">Mevcut (Öğrenci)</th>
                         <th className="py-4 px-5 text-[11px] font-black uppercase tracking-widest text-emerald-500">Öğretim Elemanı Ataması</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-800/40">
                      {filteredCourses.map(pc => {
                        const curInst = changes[pc.id]?.instructor_id !== undefined ? changes[pc.id].instructor_id : pc.instructor_id
                        const curCount = changes[pc.id]?.student_count !== undefined ? changes[pc.id].student_count : pc.student_count
                        const hasChange = changes[pc.id] !== undefined
                        const isEd = editingStudentCount === pc.id

                        return (
                          <tr key={pc.id} className={clsx("transition-colors group", hasChange ? 'bg-amber-500/5' : 'hover:card/30')}>
                            <td className="py-3 px-5">
                               <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                     <span className="text-sm font-black text-muted">{pc.course.code}</span>
                                     {pc.course.is_uzem && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-600/20 text-red-400 font-bold uppercase tracking-wider border border-red-600/30">UZEM</span>}
                                  </div>
                                  <span className="text-xs font-semibold text-muted group-hover:text-muted transition-colors line-clamp-1 pr-4">{pc.course.name}</span>
                                  <div className="flex gap-1.5 mt-0.5">
                                     {pc.course.requires_lab && <span className="text-[10px] flex items-center gap-1 text-rose-400 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Lab İster</span>}
                                     {pc.course.requires_kitchen && <span className="text-[10px] flex items-center gap-1 text-orange-400 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Mutfak İster</span>}
                                  </div>
                               </div>
                            </td>
                            
                            <td className="py-3 px-5 text-center">
                              <span className="inline-block text-xs font-bold text-muted card px-2 py-1 rounded border whitespace-nowrap">
                                {pc.program.short_code} • {pc.year_number}. Sın
                              </span>
                            </td>
                            
                            <td className="py-3 px-5 text-center">
                              <div className="w-8 h-8 rounded-full card flex items-center justify-center mx-auto text-xs font-black text-muted border shadow-inner">
                                {pc.course.weekly_hours}
                              </div>
                            </td>

                            <td className="py-3 px-5">
                              {isEd ? (
                                <div className="flex items-center gap-2">
                                  <input type="number" min="0" max="500" value={tempStudentCount}
                                     onChange={e => setTempStudentCount(e.target.value)}
                                     onKeyDown={e => { if (e.key === 'Enter') saveStudentCount(pc.id); if (e.key === 'Escape') cancelEditingStudentCount(); }}
                                     className="w-20 px-3 py-1.5 card border border-amber-500 rounded-lg text-sm font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 custom-number-input" autoFocus />
                                  <button onClick={() => saveStudentCount(pc.id)} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-default transition-colors border border-emerald-500/30"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEditingStudentCount} className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-default transition-colors border border-rose-500/30"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <button onClick={() => startEditingStudentCount(pc)} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border", curCount ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' : 'card/50 text-gray-500 hover:card hover:text-muted')}>
                                  <Users className="w-4 h-4" />
                                  {curCount || 'Sayısı yok'}
                                  <Edit3 className="w-3.5 h-3.5 opacity-60 ml-1" />
                                </button>
                              )}
                            </td>

                            <td className="py-3 px-5">
                               <select value={curInst || ''} onChange={e => handleInstructorChange(pc.id, e.target.value || null)}
                                   className={clsx("w-full px-4 py-2 card border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 transition-all appearance-none",
                                      curInst ? 'border-emerald-500/40 text-emerald-300 focus:ring-emerald-500/30 focus:border-emerald-500 bg-emerald-950/20' : 'border-rose-500/40 text-rose-400 focus:ring-rose-500/30 focus:border-rose-500 bg-rose-950/20',
                                      hasChange && '!border-amber-500 !text-amber-300 !bg-amber-950/30 ring-2 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                   )}>
                                  <option value="" className="card text-gray-500">— Eğitmen Ataması Bekleniyor —</option>
                                  <optgroup label="Sistemdeki Öğretim Elemanları" className="card text-muted">
                                     {instructors.map(i => <option key={i.id} value={i.id} className="text-default">{i.title} {i.full_name}</option>)}
                                  </optgroup>
                               </select>
                            </td>

                          </tr>
                        )
                      })}
                      {filteredCourses.length === 0 && (
                         <tr><td colSpan={5} className="py-12 text-center text-gray-500 font-medium">Bölüme ait ders/sonuç bulunamadı.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}

    </div>
  )
}
