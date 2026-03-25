'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Users, Save, GraduationCap, Calendar, Info, CheckCircle2, ChevronRight, Layers } from 'lucide-react'
import clsx from 'clsx'

interface Program {
  id: string
  name: string
  short_code: string
}

interface AcademicPeriod {
  id: string
  academic_year: string
  semester: string
  is_active: boolean
}

interface Enrollment {
  id?: string
  program_id: string
  period_id: string
  year_number: number
  student_count: number
}

export default function StudentEnrollmentsPage() {
  const supabase = createClient()
  const [programs, setPrograms] = useState<Program[]>([])
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [changes, setChanges] = useState<Record<string, number>>({})
  const [departmentId, setDepartmentId] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedPeriod && departmentId) {
      loadEnrollments()
    }
  }, [selectedPeriod, departmentId])

  async function loadInitialData() {
    setLoading(true)

    // Kullanıcının bölümünü al
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('department_id')
      .eq('id', user.id)
      .single()

    if (!profile?.department_id) {
      toast.error('Bölüm bilgisi bulunamadı')
      setLoading(false)
      return
    }

    setDepartmentId(profile.department_id)

    // Bölüme ait programları al
    const { data: programsData } = await supabase
      .from('programs')
      .select('id, name, short_code')
      .eq('department_id', profile.department_id)
      .eq('is_active', true)
      .order('short_code')

    setPrograms(programsData || [])

    // Akademik dönemleri al
    const { data: periodsData } = await supabase
      .from('academic_periods')
      .select('id, academic_year, semester, is_active')
      .order('academic_year', { ascending: false })
      .order('semester', { ascending: false })

    setPeriods(periodsData || [])

    // Aktif dönemi seç
    const activePeriod = periodsData?.find((p) => p.is_active)
    if (activePeriod) {
      setSelectedPeriod(activePeriod.id)
    } else if (periodsData && periodsData.length > 0) {
      setSelectedPeriod(periodsData[0].id)
    }

    setLoading(false)
  }

  async function loadEnrollments() {
    if (!selectedPeriod) return

    const { data } = await supabase
      .from('program_enrollments')
      .select('*')
      .eq('period_id', selectedPeriod)
      .in(
        'program_id',
        programs.map((p) => p.id)
      )

    setEnrollments(data || [])
    setChanges({})
  }

  function getEnrollmentKey(programId: string, yearNumber: number) {
    return `${programId}|${yearNumber}`
  }

  function getStudentCount(programId: string, yearNumber: number): number {
    const key = getEnrollmentKey(programId, yearNumber)
    if (changes[key] !== undefined) {
      return changes[key]
    }
    const enrollment = enrollments.find(
      (e) => e.program_id === programId && e.year_number === yearNumber
    )
    return enrollment?.student_count || 0
  }

  function handleCountChange(programId: string, yearNumber: number, value: string) {
    const count = parseInt(value) || 0
    const key = getEnrollmentKey(programId, yearNumber)
    setChanges((prev) => ({ ...prev, [key]: count }))
  }

  async function saveChanges() {
    if (Object.keys(changes).length === 0) {
      toast.info('Değişiklik yok')
      return
    }

    setSaving(true)

    try {
      for (const [key, count] of Object.entries(changes)) {
        const lastPipeIndex = key.lastIndexOf('|')
        const programId = key.substring(0, lastPipeIndex)
        const yearNumber = parseInt(key.substring(lastPipeIndex + 1))

        // Mevcut kayıt var mı?
        const existing = enrollments.find(
          (e) => e.program_id === programId && e.year_number === yearNumber
        )

        if (existing) {
          // Update
          const { error } = await supabase
            .from('program_enrollments')
            .update({ student_count: count })
            .eq('id', existing.id)

          if (error) throw error
        } else {
          // Insert
          const { error } = await supabase.from('program_enrollments').insert({
            program_id: programId,
            period_id: selectedPeriod,
            year_number: yearNumber,
            student_count: count,
          })

          if (error) throw error
        }
      }

      toast.success('Bölüm öğrenci sayıları sisteme başarıyla kaydedildi')
      setChanges({})
      loadEnrollments()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Kaydetme hatası oluştu')
    } finally {
      setSaving(false)
    }
  }

  // Toplam öğrenci sayısı
  const totalStudents = programs.reduce((sum, p) => {
    return sum + getStudentCount(p.id, 1) + getStudentCount(p.id, 2)
  }, 0)

  const totalChanges = Object.keys(changes).length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="relative cursor-pointer">
          <div className="absolute -inset-4 bg-rose-500/20 rounded-full blur-xl animate-pulse"></div>
          <GraduationCap className="w-16 h-16 text-rose-400 relative drop-shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-bounce" />
        </div>
        <p className="mt-6 text-gray-400 font-medium">Öğrenci kapasiteleri yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-rose-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <Users className="w-48 h-48 text-rose-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Öğrenci Sayıları
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Bölümünüzdeki tüm programlar için birinci ve ikinci sınıf düzeyinde öngörülen (tahmini) öğrenci sayılarını belirleyin.
            </p>
          </div>
          
          {/* Main Action Save Button at Top as well */}
          <button
            onClick={saveChanges}
            disabled={saving || totalChanges === 0}
            className="btn-glow inline-flex border border-rose-700/50 items-center justify-center gap-2 px-6 py-3 shrink-0 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            style={{ 
              backgroundImage: 'linear-gradient(135deg, #e11d48, #be185d)', 
              boxShadow: totalChanges > 0 ? '0 0 20px rgba(225, 29, 72, 0.4)' : 'none' 
            }}
          >
            <Save className="w-5 h-5" />
            <span className="font-semibold">{saving ? 'Kaydediliyor...' : `Sayılara Kaydet (${totalChanges})`}</span>
          </button>
        </div>
      </div>

      {/* Info Banner & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card rounded-xl p-5 border border-rose-500/20 bg-rose-500/5 relative overflow-hidden group">
          <div className="absolute -left-10 -top-10 bg-rose-500/10 w-32 h-32 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all duration-500"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
              <Info className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-rose-100">Bu veriler neden önemli?</p>
              <p className="text-sm mt-1.5 text-rose-200/70 leading-relaxed">
                Girdiğiniz öğrenci sayıları, <strong className="text-rose-300">Akıllı Yerleştirme Sihirbazı</strong> tarafından derslik atamalarında baz alınır. 
                Sistem, seçtiğiniz sayıdan küçük kapasiteli dersliklere atama yapmaz. Özellikle ortak dersler kapasiteleri hesaplanırken, şubelerin <u>toplamı</u> kullanılır.
              </p>
            </div>
          </div>
        </div>

        <div className="card border border-gray-700/60 rounded-xl p-5 flex flex-col justify-center gap-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700">
               <Calendar className="w-4 h-4 text-rose-400" />
             </div>
             <p className="text-sm font-medium text-gray-300">Aktif Dönem</p>
          </div>
          
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 transition-all appearance-none cursor-pointer shadow-inner"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.academic_year} — {p.semester === 'fall' ? 'Güz' : 'Bahar'}
                {p.is_active && ' (Şu An)'}
              </option>
            ))}
          </select>

          {/* Stats quick view */}
          <div className="pt-2 mt-auto border-t border-gray-800/80 flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Toplam Kapasite:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20">
              <Users className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-sm font-bold text-rose-300">{totalStudents}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Programs Grid */}
      <h3 className="text-lg font-bold text-white flex items-center gap-2 px-1">
        <Layers className="w-5 h-5 text-rose-400" />
        Bölüm Programları Kapasiteleri
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {programs.map((program) => {
          const count1 = getStudentCount(program.id, 1)
          const count2 = getStudentCount(program.id, 2)
          const hasChange1 = changes[getEnrollmentKey(program.id, 1)] !== undefined
          const hasChange2 = changes[getEnrollmentKey(program.id, 2)] !== undefined
          const total = count1 + count2

          return (
            <div key={program.id} className="card group hover:-translate-y-1 hover:shadow-2xl hover:shadow-rose-900/20 transition-all duration-300 border border-gray-800/60 hover:border-rose-500/30 rounded-2xl overflow-hidden flex flex-col relative">
              
              {/* Top Gradient Ribbon */}
              <div className="bg-cyan-600 h-1.5 w-full opacity-80 group-hover:opacity-50 transition-opacity"></div>

              <div className="p-5 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700/50 flex items-center justify-center shadow-inner group-hover:bg-rose-500/10 group-hover:border-rose-500/30 transition-colors">
                      <GraduationCap className="w-5 h-5 text-gray-400 group-hover:text-rose-400 transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base tracking-tight">{program.short_code}</h4>
                      <div className="flex items-center gap-1 mt-0.5 opacity-70">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">Toplam: {total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mb-5 line-clamp-2 leading-relaxed" title={program.name}>
                  {program.name}
                </p>

                {/* Inputs Base */}
                <div className="space-y-3 mt-auto bg-gray-900/40 p-3 rounded-xl border border-gray-800/40">
                  
                  {/* Sınıf 1 */}
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-800/80 text-gray-400 text-xs font-bold px-2 py-1.5 rounded border border-gray-700/50 w-16 text-center shadow-inner">
                      1. Sınıf
                    </div>
                    <div className="relative flex-1">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="number"
                        min="0"
                        max="800"
                        value={count1 === 0 && !hasChange1 ? '' : count1}
                        placeholder="Örn: 45"
                        onChange={(e) => handleCountChange(program.id, 1, e.target.value)}
                        className={clsx(
                          'w-full pl-9 pr-3 py-1.5 bg-gray-900/80 rounded-md text-white font-medium text-sm transition-all focus:outline-none focus:ring-1 focus:ring-rose-500/50 placeholder:text-gray-600',
                          hasChange1
                            ? 'border-rose-500/50 border bg-rose-500/5'
                            : 'border border-gray-700/50 hover:border-gray-600'
                        )}
                      />
                    </div>
                    {count1 > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 opacity-80" />}
                  </div>

                  {/* Sınıf 2 */}
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-800/80 text-gray-400 text-xs font-bold px-2 py-1.5 rounded border border-gray-700/50 w-16 text-center shadow-inner">
                      2. Sınıf
                    </div>
                    <div className="relative flex-1">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                      <input
                        type="number"
                        min="0"
                        max="800"
                        value={count2 === 0 && !hasChange2 ? '' : count2}
                        placeholder="Örn: 60"
                        onChange={(e) => handleCountChange(program.id, 2, e.target.value)}
                        className={clsx(
                          'w-full pl-9 pr-3 py-1.5 bg-gray-900/80 rounded-md text-white font-medium text-sm transition-all focus:outline-none focus:ring-1 focus:ring-rose-500/50 placeholder:text-gray-600',
                          hasChange2
                            ? 'border-rose-500/50 border bg-rose-500/5'
                            : 'border border-gray-700/50 hover:border-gray-600'
                        )}
                      />
                    </div>
                    {count2 > 0 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 opacity-80" />}
                  </div>

                </div>
              </div>
            </div>
          )
        })}
      </div>

      {programs.length === 0 && !loading && (
        <div className="card border border-gray-800/60 rounded-2xl py-24 px-6 text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-gray-800/60 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/5">
            <GraduationCap className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Program Bulunamadı</h3>
          <p className="text-gray-400 max-w-sm">
            Bu bölüme ait sistemde tanımlı ve aktif durumda herhangi bir program gözükmüyor. Sistem yöneticisiyle iletişime geçebilirsiniz.
          </p>
        </div>
      )}

      {/* Floating Action Button (Sticky Bottom) - modern implementation */}
      {totalChanges > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom flex justify-center w-full max-w-md pointer-events-none">
          <div className="card bg-gray-900/95 border border-rose-500/30 rounded-full p-2 pr-6 shadow-2xl flex items-center gap-4 pointer-events-auto">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30 shadow-[0_0_15px_rgba(225,29,72,0.3)]">
              <span className="font-bold text-rose-400">{totalChanges}</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">Bekleyen Değişiklik</p>
              <p className="text-[11px] text-gray-400">Öğrenci kapasiteleri güncellenecek</p>
            </div>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="ml-auto btn-glow bg-cyan-600 py-2 px-5 rounded-full text-xs font-bold text-white shadow-lg flex items-center gap-2 hover:brightness-110 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Kayıt...' : 'Uygula'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
