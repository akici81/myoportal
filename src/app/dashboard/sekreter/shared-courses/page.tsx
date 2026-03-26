'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Link2,
  Unlink,
  Users,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Trash2,
  GraduationCap,
  Info,
  Layers,
  Sparkles
} from 'lucide-react'
import clsx from 'clsx'
import type { Course, Program, ProgramCourse } from '@/types'

interface SharedGroup {
  shared_group_id: string
  course: Course
  programs: Array<{ program: Program; programCourseId: string }>
}

export default function SharedCoursesPage() {
  const supabase = createClient()
  const [programCourses, setProgramCourses] = useState<ProgramCourse[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)

    // Load program_courses with relations
    const { data: pcData } = await supabase
      .from('program_courses')
      .select('*, courses(*), programs(*), instructors(full_name, title)')
      .eq('is_active', true)
      .order('course_id')

    setProgramCourses((pcData as unknown as ProgramCourse[]) ?? [])

    // Load all programs
    const { data: progData } = await supabase
      .from('programs')
      .select('*')
      .eq('is_active', true)
      .order('short_code')

    setPrograms((progData as unknown as Program[]) ?? [])

    // Load all courses
    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('code')

    setCourses((courseData as unknown as Course[]) ?? [])

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Group shared courses by shared_group_id
  const sharedGroups: SharedGroup[] = []
  const groupedIds = new Set<string>()

  programCourses
    .filter((pc) => pc.is_shared && pc.shared_group_id)
    .forEach((pc) => {
      if (!pc.shared_group_id || groupedIds.has(pc.shared_group_id)) return
      groupedIds.add(pc.shared_group_id)

      const groupMembers = programCourses.filter((p) => p.shared_group_id === pc.shared_group_id)
      if (groupMembers.length > 0 && groupMembers[0].courses) {
        sharedGroups.push({
          shared_group_id: pc.shared_group_id,
          course: groupMembers[0].courses,
          programs: groupMembers.map((m) => ({
            program: m.programs!,
            programCourseId: m.id,
          })),
        })
      }
    })

  // Filter by search
  const filteredGroups = sharedGroups.filter((g) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      g.course.name.toLowerCase().includes(searchLower) ||
      g.course.code.toLowerCase().includes(searchLower) ||
      g.programs.some((p) => p.program.name.toLowerCase().includes(searchLower))
    )
  })

  // Non-shared courses (potential candidates)
  const nonSharedCourses = courses.filter((c) => {
    // Check if this course exists in multiple programs but not linked
    const programsWithCourse = programCourses.filter((pc) => pc.course_id === c.id && !pc.is_shared)
    return programsWithCourse.length >= 2 // At least 2 programs have this course
  })

  function openCreateModal() {
    setSelectedCourse(null)
    setSelectedPrograms([])
    setShowModal(true)
  }

  function toggleProgram(programId: string) {
    setSelectedPrograms((prev) =>
      prev.includes(programId) ? prev.filter((p) => p !== programId) : [...prev, programId]
    )
  }

  async function createSharedGroup() {
    if (!selectedCourse || selectedPrograms.length < 2) {
      toast.error('Grup oluşturmak için bir ders ve en az 2 program seçmelisiniz.')
      return
    }

    setSaving(true)

    // Generate new shared_group_id
    const sharedGroupId = crypto.randomUUID()

    // Find program_courses that match selected course and programs
    const toUpdate = programCourses.filter(
      (pc) => pc.course_id === selectedCourse.id && selectedPrograms.includes(pc.program_id)
    )

    if (toUpdate.length < 2) {
      toast.error('Seçilen programlarda bu ders eşleşmedi. Lütfen sayfayı yenileyip tekrar deneyin.')
      setSaving(false)
      return
    }

    // Update all matching program_courses
    const { error } = await supabase
      .from('program_courses')
      .update({ is_shared: true, shared_group_id: sharedGroupId })
      .in(
        'id',
        toUpdate.map((pc) => pc.id)
      )

    if (error) {
      toast.error('Ortak ders havuzu oluşturulamadı: ' + error.message)
    } else {
      toast.success(`Başarılı! ${toUpdate.length} program ortak havuza eklendi.`)
      setShowModal(false)
      setSelectedCourse(null)
      setSelectedPrograms([])
      loadData()
    }
    setSaving(false)
  }

  async function removeFromGroup(programCourseId: string) {
    if (!confirm('Bu programı havuzdan koparmak (ortaklıktan çıkarmak) istediğinize emin misiniz?')) return

    const { error } = await supabase
      .from('program_courses')
      .update({ is_shared: false, shared_group_id: null })
      .eq('id', programCourseId)

    if (error) {
      toast.error('Program havuzdan çıkarılamadı: ' + error.message)
    } else {
      toast.success('Program ortak dersten başarıyla ayrıldı')
      loadData()
    }
  }

  async function deleteGroup(sharedGroupId: string) {
    if (!confirm('DİKKAT: Bu ortak ders grubunu tamamen dağıtmak istediğinize emin misiniz?')) return

    const { error } = await supabase
      .from('program_courses')
      .update({ is_shared: false, shared_group_id: null })
      .eq('shared_group_id', sharedGroupId)

    if (error) {
      toast.error('Havuz dağıtılamadı: ' + error.message)
    } else {
      toast.success('Ortak ders havuzu tamamen silindi, programlar ayrıldı')
      loadData()
    }
  }

  // Get programs that have the selected course
  const availablePrograms = selectedCourse
    ? programs.filter((p) =>
        programCourses.some(
          (pc) => pc.course_id === selectedCourse.id && pc.program_id === p.id && !pc.is_shared
        )
      )
    : []

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Premium Header Container */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-indigo-800/30">
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none">
          <Link2 className="w-48 h-48 text-red-400" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold text-default flex items-center gap-3" style={{ color: 'var(--text)' }}>
              Yönetimsel Ortak Dersler
            </h1>
            <p className="mt-2 text-muted leading-relaxed">
              Birden fazla programda aynı anda verilen (Örn: ATA, TRD, ING) dersleri birleştirin. Ortak ders havuzları ders programı yerleşiminde <strong className="text-red-300">tek bir paket</strong> gibi yönetilir.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn-glow inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-default transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 shrink-0"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span>Yeni Havuz Oluştur</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Cards */}
        <div className="card p-6 rounded-2xl border flex items-center gap-4 bg-gradient-to-br from-indigo-900/10 to-transparent">
          <div className="w-14 h-14 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 text-red-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Aktif Havuzlar</p>
            <p className="text-3xl font-black text-default mt-1" style={{ color: 'var(--text)' }}>{sharedGroups.length}</p>
          </div>
        </div>

        <div className="card p-6 rounded-2xl border flex items-center gap-4 bg-gradient-to-br from-blue-900/10 to-transparent">
          <div className="w-14 h-14 rounded-full bg-red-600/10 flex items-center justify-center border border-red-600/20 text-red-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Link2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Bağlanmış Sınıf</p>
            <p className="text-3xl font-black text-default mt-1" style={{ color: 'var(--text)' }}>
              {programCourses.filter((pc) => pc.is_shared).length}
            </p>
          </div>
        </div>

        <div className="card p-6 rounded-2xl border flex items-center gap-4 bg-gradient-to-br from-amber-900/10 to-transparent">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] relative overflow-hidden group">
            <Sparkles className="w-7 h-7 relative z-10 animate-pulse" />
          </div>
          <div>
            <p className="text-muted text-xs font-semibold uppercase tracking-wider">Olası Ortak Ders</p>
            <p className="text-3xl font-black text-default mt-1" style={{ color: 'var(--text)' }}>{nonSharedCourses.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Data view */}
        <div className="lg:w-2/3 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <h3 className="text-xl font-bold text-default flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Layers className="w-5 h-5 text-red-400" /> Havuz Kataloğu
            </h3>
            
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                className="w-full card border rounded-full pl-10 pr-4 py-2 text-sm text-default focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-all placeholder:text-gray-600 shadow-inner"
                placeholder="Kod, ad veya program ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="card border rounded-2xl p-12 flex flex-col items-center justify-center text-gray-500 animate-pulse">
                <Link2 className="w-12 h-12 mb-4 opacity-50" />
                <p>Veriler işleniyor...</p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="card border border-dashed card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 card/80 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Link2 className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-default mb-2" style={{ color: 'var(--text)' }}>
                  {search ? 'Sonuç Bulunamadı' : 'Havuz Tertemiz'}
                </h3>
                <p className="text-muted max-w-sm mb-6">
                  {search ? 'Arama kriterlerinize uygun hiçbir ortak ders grubu sistemde kayıtlı değil.' : 'Henüz iki veya daha fazla birleştirilmiş dersten oluşan bir eşleştirme havuzu yapmadınız.'}
                </p>
                {!search && (
                  <button onClick={openCreateModal} className="text-red-400 hover:text-red-300 font-medium text-sm flex items-center gap-1 bg-red-600/10 px-4 py-2 rounded-full transition-colors">
                    <Plus className="w-4 h-4" /> Yeni Bir Tane Oluştur
                  </button>
                )}
              </div>
            ) : (
              filteredGroups.map((group) => {
                const isExpanded = expandedGroups.includes(group.shared_group_id)

                return (
                  <div 
                    key={group.shared_group_id} 
                    className="card rounded-2xl border overflow-hidden transition-all duration-300 group hover:border-red-600/30"
                  >
                    <div 
                      onClick={() => setExpandedGroups((p) =>
                        p.includes(group.shared_group_id)
                          ? p.filter((x) => x !== group.shared_group_id)
                          : [...p, group.shared_group_id]
                      )}
                      className={clsx(
                        "w-full p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors",
                        isExpanded ? "card/20" : "hover:card/10"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 flex items-center justify-center">
                          <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300",
                            isExpanded ? "bg-red-600/20 text-red-400 rotate-180" : "card text-gray-500 group-hover:bg-gray-700"
                          )}>
                            <ChevronDown className="w-5 h-5" />
                          </div>
                        </div>
                        
                        <div className="w-12 h-12 rounded-xl bg-cyan-600 border border-red-600/30 flex items-center justify-center shrink-0 shadow-inner">
                          <BookOpen className="w-6 h-6 text-red-400" />
                        </div>
                        
                        <div>
                          <p className="text-base sm:text-lg font-bold text-default group-hover:text-red-200 transition-colors leading-tight" style={{ color: 'var(--text)' }}>
                            {group.course.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted">
                            <span className="font-mono text-xs px-1.5 py-0.5 rounded card border text-muted">{group.course.code}</span>
                            <span className="flex items-center gap-1.5 before:content-['•'] before:text-gray-600 before:mr-1">{group.course.course_type === 'theoretical' ? 'Teorik' : 'Uygulamalı'} Ders</span>
                            <span className="flex items-center gap-1.5 before:content-['•'] before:text-gray-600 before:mr-1">{group.course.weekly_hours} Saat</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pl-16 sm:pl-0 border-t sm:border-0 pt-3 sm:pt-0">
                        <span className="flex items-center gap-2 bg-red-600/10 text-red-400 border border-red-600/20 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">
                          <Users className="w-3.5 h-3.5" /> {group.programs.length} Program
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteGroup(group.shared_group_id)
                          }}
                          title="Havuzu Tamamen Dağıt"
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/20 text-red-500/70 hover:text-red-400 transition-colors shrink-0 outline-none"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <div className={clsx(
                      "grid grid-rows-[0fr] transition-all duration-300",
                      isExpanded ? "grid-rows-[1fr] opacity-50" : "opacity-0"
                    )}>
                      <div className="overflow-hidden">
                        <div className="p-5 border-t card">
                          <p className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-2">
                            <Link2 className="w-3 h-3" /> Eşleşen Program Bağlantıları
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {group.programs.map(({ program, programCourseId }) => (
                              <div
                                key={programCourseId}
                                className="flex items-center justify-between p-3 rounded-xl border card shadow-inner group/item hover:border-red-600/30 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg card flex items-center justify-center border text-xs font-bold text-muted group-hover/item:text-red-400 group-hover/item:bg-red-600/10 transition-colors">
                                    {program.short_code}
                                  </div>
                                  <p className="text-sm font-medium text-muted line-clamp-1" title={program.name}>{program.name}</p>
                                </div>
                                <button
                                  onClick={() => removeFromGroup(programCourseId)}
                                  title="Havuzdan Çıkar"
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-transparent text-gray-500 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center shrink-0 opacity-0 group-hover/item:opacity-50"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: AI Insights & Quick Add */}
        <div className="lg:w-1/3 space-y-6">
          <div className="card p-6 rounded-2xl border border-red-600/20 bg-red-600/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl group-hover:bg-red-600/20 transition-all duration-700"></div>
            
            <div className="flex flex-col gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center border border-red-600/30 shadow-inner">
                <Sparkles className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-default leading-tight" style={{ color: 'var(--text)' }}>Potansiyel Eşleşmeler</h3>
                <p className="text-sm text-muted mt-2">
                  Birden fazla programda aynı koda sahip olan ancak henüz havuza atılmamış (ortaklaştırılmamış) potansiyel dersleri otomatik taradık.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {!loading && nonSharedCourses.length === 0 ? (
                <div className="p-4 rounded-xl card border text-center text-sm text-gray-500 flex flex-col items-center">
                  <Check className="w-6 h-6 text-emerald-500/50 mb-2" />
                  Harika! Sistem tertemiz. Eşleşmemiş ortak ders potansiyeli bulamadık.
                </div>
              ) : (
                nonSharedCourses.slice(0, 5).map((c) => {
                  const programCount = programCourses.filter(
                    (pc) => pc.course_id === c.id && !pc.is_shared
                  ).length
                  
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCourse(c)
                        setSelectedPrograms([])
                        setShowModal(true)
                      }}
                      className="w-full relative overflow-hidden flex items-center justify-between p-3 rounded-xl border border-red-600/10 card hover:bg-red-600/10 hover:border-red-600/30 transition-all group/btn text-left"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-muted group-hover/btn:text-default transition-colors" style={{ color: 'var(--text)' }}>{c.code}</span>
                        <span className="text-xs text-gray-500 line-clamp-1">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                          {programCount} Pro.
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover/btn:text-red-400 transition-colors" />
                      </div>
                    </button>
                  )
                })
              )}
              {!loading && nonSharedCourses.length > 5 && (
                <p className="text-xs text-center text-gray-500 mt-2 italic">
                  + {nonSharedCourses.length - 5} ders daha havuzlanabilir
                </p>
              )}
            </div>
          </div>
          
          <div className="card p-5 rounded-2xl border card">
             <div className="flex gap-3">
               <Info className="w-5 h-5 text-muted shrink-0 mt-0.5" />
               <p className="text-xs text-muted leading-relaxed">
                 Ortak ders grubuna eklenen programların hepsine, ders ataması panelinde ("Otomatik Seçeneklerde") <strong>hepsi için geçerli olacak şekilde</strong> atanır. Eğer sadece bir programı özel bir durumda yönetmek istiyorsanız havuzdan çıkarınız.
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Premium Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !saving && setShowModal(false)}></div>
          
          <div className="card w-full max-w-lg card rounded-2xl border shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b card flex items-center justify-between shrink-0">
              <h3 className="font-bold text-default text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center border border-red-600/30">
                  <Link2 className="w-4 h-4 text-red-400" />
                </div>
                Ortak Ders Oluştur
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-default hover:card transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Course Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted ml-1">Kataloğdan Ders Seçin</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    className="w-full bg-gray-950/50 border rounded-xl pl-10 pr-4 py-3 text-sm text-default focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-colors appearance-none cursor-pointer" style={{ color: 'var(--text)' }}
                    value={selectedCourse?.id || ''}
                    disabled={saving}
                    onChange={(e) => {
                      const course = courses.find((c) => c.id === e.target.value)
                      setSelectedCourse(course || null)
                      setSelectedPrograms([])
                    }}
                  >
                    <option value="">— Ortaklaştırılacak Dersi Seçin —</option>
                    {courses.map((c) => {
                      const programCount = programCourses.filter(
                        (pc) => pc.course_id === c.id && !pc.is_shared
                      ).length
                      return (
                        <option key={c.id} value={c.id} disabled={programCount < 2}>
                          {c.code} - {c.name} {programCount >= 2 ? `(${programCount} programda müsait)` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
                {selectedCourse && availablePrograms.length < 2 && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                    <Info className="w-3 h-3" /> Bu ders havuz oluşturmak için en az 2 programın müfredatında yer almalıdır.
                  </div>
                )}
              </div>

              {/* Program Checklist */}
              {selectedCourse && availablePrograms.length >= 2 && (
                <div className="space-y-2 border-t pt-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted">
                      Havuza Eklenecek Programlar <span className="lowercase font-medium text-gray-500">(En az 2)</span>
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setSelectedPrograms(
                          selectedPrograms.length === availablePrograms.length
                            ? []
                            : availablePrograms.map((p) => p.id)
                        )
                      }
                      className="text-xs font-semibold text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-600/10 hover:bg-red-600/20 transition-colors"
                    >
                      {selectedPrograms.length === availablePrograms.length ? 'Hiçbirini Seçme' : 'Tümünü Seç'}
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {availablePrograms.map((p) => {
                      const selected = selectedPrograms.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={saving}
                          onClick={() => toggleProgram(p.id)}
                          className={clsx(
                            'w-full p-3 rounded-xl border flex items-center justify-between transition-all group',
                            selected
                              ? 'border-red-600/50 bg-red-600/10 shadow-[0_0_10px_rgba(79,70,229,0.1)]'
                              : 'border-gray-800 card hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={clsx(
                                "w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors",
                                selected 
                                  ? "bg-red-600/20 text-red-400 border-red-600/30" 
                                  : "card text-muted group-hover:bg-gray-700"
                              )}
                            >
                              {p.short_code}
                            </div>
                            <span className={clsx("text-sm font-medium transition-colors", selected ? "text-white" : "text-muted")}>
                              {p.name}
                            </span>
                          </div>
                          <div className={clsx(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            selected ? "bg-red-600 border-red-600 text-white" : "border-gray-600 group-hover:border-gray-500"
                          )}>
                             {selected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  
                  {/* Selection Status */}
                  <div className="flex items-center justify-between mt-3 text-xs card px-4 py-2 rounded-lg border">
                     <span className="text-muted">Şu ana kadar seçilen:</span>
                     <span className={clsx(
                       "font-bold",
                       selectedPrograms.length >= 2 ? "text-emerald-400" : "text-orange-400"
                     )}>
                       {selectedPrograms.length} Program
                     </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t card flex gap-3 shrink-0">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-muted card hover:bg-gray-700 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={createSharedGroup}
                disabled={saving || !selectedCourse || selectedPrograms.length < 2}
                className="flex-1 btn-glow py-3 px-4 rounded-xl text-sm font-bold text-default bg-cyan-600 hover:brightness-110 transition-all shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2" style={{ color: 'var(--text)' }}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saving ? 'Oluşturuluyor...' : 'Havuzu Kur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
