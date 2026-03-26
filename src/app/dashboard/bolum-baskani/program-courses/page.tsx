'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/layout/TopBar'
import { BookOpen, Plus, Trash2, Edit2, AlertTriangle, CheckCircle, Loader2, User, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import type { Program, Department } from '@/types'

export default function ProgramCoursesPage() {
  const supabase = createClient()

  const [userProfile, setUserProfile] = useState<any>(null)
  const [department, setDepartment] = useState<Department | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<1 | 2>(1)

  const [programCourses, setProgramCourses] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    course_id: '',
    instructor_id: '',
    semester: 1,
    year_number: 1,
  })

  // Auth & Initial Load
  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('id', user.id)
      .single()

    let finalDepartmentId = prof?.department_id
    let finalDepartment = null

    if (finalDepartmentId) {
      const { data: deptById } = await supabase
        .from('departments')
        .select('*')
        .eq('id', finalDepartmentId)
        .eq('is_active', true)
        .single()
      if (deptById) finalDepartment = deptById
    }

    if (!finalDepartmentId || !finalDepartment) {
      const { data: headDept } = await supabase
        .from('departments')
        .select('*')
        .eq('head_id', user.id)
        .eq('is_active', true)
        .single()
      if (headDept) {
        finalDepartmentId = headDept.id
        finalDepartment = headDept
      }
    }

    setUserProfile({ ...prof, department_id: finalDepartmentId })
    setDepartment(finalDepartment)

    if (finalDepartmentId) {
      const [{ data: progs }, { data: allCourses }, { data: insts }] = await Promise.all([
        supabase.from('programs').select('*').eq('department_id', finalDepartmentId).eq('is_active', true).order('name'),
        supabase.from('courses').select('*').eq('is_active', true).order('code'),
        supabase.from('instructors').select('*').eq('department_id', finalDepartmentId).eq('is_active', true).order('full_name'),
      ])

      setPrograms(progs ?? [])
      setCourses(allCourses ?? [])
      setInstructors(insts ?? [])
      setSelectedProgram(progs?.[0]?.id ?? '')
    }

    setLoading(false)
  }

  // Load program courses when program/year changes
  useEffect(() => {
    if (!selectedProgram) return
    loadProgramCourses()
  }, [selectedProgram, selectedYear])

  async function loadProgramCourses() {
    const { data } = await supabase
      .from('program_courses')
      .select('*, courses(*), instructors(*)')
      .eq('program_id', selectedProgram)
      .eq('year_number', selectedYear)
      .order('semester')

    setProgramCourses(data ?? [])
  }

  function handleAdd() {
    setEditingId(null)
    setForm({ course_id: '', instructor_id: '', semester: 1, year_number: selectedYear })
    setShowModal(true)
  }

  function handleEdit(pc: any) {
    setEditingId(pc.id)
    setForm({
      course_id: pc.course_id,
      instructor_id: pc.instructor_id ?? '',
      semester: pc.semester,
      year_number: pc.year_number,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.course_id) {
      toast.error('Ders seçimi zorunlu')
      return
    }

    setSaving(true)

    if (editingId) {
      // Update
      const { error } = await supabase
        .from('program_courses')
        .update({
          course_id: form.course_id,
          instructor_id: form.instructor_id || null,
          semester: form.semester,
          year_number: form.year_number,
        })
        .eq('id', editingId)

      if (error) {
        toast.error('Güncelleme başarısız: ' + error.message)
      } else {
        toast.success('Ders başarıyla güncellendi')
        setShowModal(false)
        loadProgramCourses()
      }
    } else {
      // Insert
      const { error } = await supabase.from('program_courses').insert({
        program_id: selectedProgram,
        course_id: form.course_id,
        instructor_id: form.instructor_id || null,
        semester: form.semester,
        year_number: form.year_number,
        is_active: true,
      })

      if (error) {
        toast.error('Ekleme başarısız: ' + error.message)
      } else {
        toast.success('Ders başarıyla eklendi')
        setShowModal(false)
        loadProgramCourses()
      }
    }

    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu dersi müfredattan çıkarmak istediğinize emin misiniz?')) return

    const { error } = await supabase.from('program_courses').delete().eq('id', id)

    if (error) {
      toast.error('Silme başarısız: ' + error.message)
    } else {
      toast.success('Ders müfredattan çıkarıldı')
      loadProgramCourses()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  if (!userProfile?.department_id) {
    return (
      <div className="card-hover border-dashed flex flex-col items-center justify-center py-32 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-2xl font-black text-red-400">Yetkisiz Erişim</h3>
        <p className="text-gray-400 mt-3">Bölüm ataması bulunamadı.</p>
      </div>
    )
  }

  const selectedProgramInfo = programs.find(p => p.id === selectedProgram)

  return (
    <div className="space-y-6">
      <TopBar
        title="Program Müfredatı"
        subtitle={`${department?.name} — Programlara ders atayın ve öğretim elemanı belirleyin`}
      />

      {/* Filters */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-4 h-4 text-cyan-500" />
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Program Seçimi</h3>
        </div>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block pl-1">
              Program
            </label>
            <select
              className="w-full card border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-semibold"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block pl-1">
              Sınıf Yılı
            </label>
            <div className="flex gap-1.5 p-1 rounded-xl card border">
              {([1, 2] as const).map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all min-w-[90px] ${
                    selectedYear === y
                      ? 'bg-cyan-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200 hover:card'
                  }`}
                >
                  {y}. Sınıf
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Ders Ekle
          </button>
        </div>
      </div>

      {/* Courses List */}
      {programCourses.length === 0 ? (
        <div className="card-hover border-dashed flex flex-col items-center justify-center py-32 text-center">
          <BookOpen className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-xl font-black text-white mb-2">Müfredat Boş</h3>
          <p className="text-gray-400 max-w-md mb-6">
            {selectedProgramInfo?.name} — {selectedYear}. Sınıf için henüz ders tanımlanmamış.
          </p>
          <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            İlk Dersi Ekle
          </button>
        </div>
      ) : (
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-white">
              {selectedProgramInfo?.name} — {selectedYear}. Sınıf Dersleri
            </h3>
            <span className="text-sm text-gray-400">{programCourses.length} ders</span>
          </div>

          <div className="space-y-2">
            {programCourses.map((pc) => (
              <div
                key={pc.id}
                className="flex items-center gap-4 p-4 rounded-xl card border hover:card/50 transition-colors group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 text-xs font-bold bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30">
                      {pc.courses?.code}
                    </span>
                    <h4 className="font-bold text-white">{pc.courses?.name}</h4>
                    <span className="text-xs text-gray-500">
                      {pc.semester}. Dönem
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                    <User className="w-3.5 h-3.5" />
                    <span>
                      {pc.instructor_id
                        ? `${pc.instructors?.title} ${pc.instructors?.full_name}`
                        : 'Hoca atanmamış'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-50 transition-opacity">
                  <button
                    onClick={() => handleEdit(pc)}
                    className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                    title="Düzenle"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(pc.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in">
          <div className="card w-full max-w-lg p-6">
            <h3 className="text-xl font-black text-white mb-4">
              {editingId ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                  Ders
                </label>
                <select
                  className="w-full card border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                >
                  <option value="">— Ders Seçin —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                  Öğretim Elemanı (Opsiyonel)
                </label>
                <select
                  className="w-full card border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  value={form.instructor_id}
                  onChange={(e) => setForm({ ...form, instructor_id: e.target.value })}
                >
                  <option value="">— Atanmamış —</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title} {i.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    Dönem
                  </label>
                  <select
                    className="w-full card border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                  >
                    <option value={1}>1. Dönem (Güz)</option>
                    <option value={2}>2. Dönem (Bahar)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    Sınıf
                  </label>
                  <select
                    className="w-full card border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    value={form.year_number}
                    onChange={(e) => setForm({ ...form, year_number: Number(e.target.value) })}
                  >
                    <option value={1}>1. Sınıf</option>
                    <option value={2}>2. Sınıf</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-400 card/50 hover:bg-gray-700 transition"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.course_id}
                className="flex-[2] btn-primary flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {editingId ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
