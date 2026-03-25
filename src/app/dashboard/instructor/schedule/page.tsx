'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { ScheduleExport } from '@/components/schedule/ScheduleExport'
import { BookOpen, AlertCircle, Calendar, GraduationCap, Clock } from 'lucide-react'
import type { ScheduleEntry, TimeSlot, AcademicPeriod } from '@/types'
import clsx from 'clsx'

export default function InstructorSchedulePage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [period, setPeriod] = useState<AcademicPeriod | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [noInstructorRecord, setNoInstructorRecord] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, departments!profiles_department_id_fkey(name)')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      const [{ data: slots }, { data: per }] = await Promise.all([
        supabase.from('time_slots').select('*').order('slot_number'),
        supabase.from('academic_periods').select('*').eq('is_active', true).maybeSingle(),
      ])
      setTimeSlots(slots ?? [])
      setPeriod((per as AcademicPeriod) ?? null)

      if (!per) { setLoading(false); return }

      // instructors tablosunda bu kullanıcıya ait kayıt ara
      const { data: inst } = await supabase
        .from('instructors')
        .select('id')
        .eq('user_id', user.id) // V2'de user_id kullanıyoruz (veya profile_id)
        .maybeSingle()

      if (!inst) {
        setNoInstructorRecord(true)
        setLoading(false)
        return
      }

      setInstructorId(inst.id)

      const { data } = await supabase
        .from('schedule_entries')
        .select(`
          *,
          time_slots(*),
          classrooms(*),
          instructors(id, full_name, title),
          program_courses(
            id, year_number, semester,
            courses(id, name, code, course_type, is_uzem),
            programs(id, name, short_code)
          )
        `)
        .eq('period_id', per.id)
        .eq('instructor_id', inst.id)
        .order('day_of_week')

      setEntries((data ?? []) as any)
      setLoading(false)
    })
  }, [])

  const name = profile?.full_name ?? ''
  const periodLabel = period?.academic_year
    ? `${period.academic_year} / ${period.semester}. Dönem`
    : 'Aktif dönem bulunamadı'

  // Benzersiz program listesi göster
  const programSet = new Map<string, string>()
  for (const e of entries) {
    const pc = (e as any).program_courses
    if (pc?.programs) {
      programSet.set(pc.programs.id, `${pc.programs.short_code} – ${pc.programs.name} (${pc.year_number}. Sınıf)`)
    }
  }

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Premium Header Container */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-emerald-800/30">
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none">
          <Calendar className="w-48 h-48 text-emerald-400" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Ders Programım
            </h1>
            <p className="mt-2 text-gray-400 leading-relaxed text-lg">
              {name}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
                <Clock className="w-4 h-4" />
                {periodLabel}
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-3">
             {entries.length > 0 && timeSlots.length > 0 && (
                <div className="bg-gray-900/60 p-1.5 rounded-xl border border-gray-800">
                   <ScheduleExport entries={entries} timeSlots={timeSlots} title={`${name} - Haftalık Program`} compact />
                </div>
             )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="card border border-gray-800 rounded-2xl p-16 flex flex-col items-center justify-center text-gray-500 animate-pulse">
             <Calendar className="w-12 h-12 mb-4 opacity-50 text-emerald-500" />
             <p className="text-lg">Programınız veri tabanından yükleniyor...</p>
          </div>
        ) : !period ? (
          <div className="card border border-amber-500/30 bg-amber-500/5 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500/50" />
            <p className="text-xl font-bold text-amber-400 mb-2">Aktif Dönem Bulunamadı</p>
            <p className="text-amber-500/70 max-w-md">
              Sistem yöneticisi tarafından henüz aktif bir akademik dönem belirlenmemiş. Lütfen daha sonra tekrar deneyin.
            </p>
          </div>
        ) : noInstructorRecord ? (
          <div className="card border border-red-500/30 bg-red-500/5 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
            <p className="text-xl font-bold text-red-400 mb-2">Eğitmen Kaydınız Bulunamadı</p>
            <p className="text-red-500/70 max-w-md">
              Mevcut kullanıcı hesabınız henüz sistemde bir Öğretim Elemanı profili ile eşleştirilmemiş. Lütfen sistem yöneticiniz veya sekreterlikle iletişime geçin.
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="card border border-gray-800 bg-gray-900/40 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-700" />
            <p className="text-xl font-bold text-white mb-2">Atanmış Dersiniz Bulunmuyor</p>
            <p className="text-gray-500 max-w-md">
              {periodLabel} için üzerinize kayıtlı herhangi bir ders tablosu ataması bulunamadı. Bölüm başkanınız ders dağılımını tamamladığında burada görüntülenecektir.
            </p>
          </div>
        ) : (
          <>
            {/* Verilen dersler özeti */}
            {programSet.size > 0 && (
              <div className="card p-6 rounded-2xl border border-gray-800 bg-cyan-600">
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="w-5 h-5 text-gray-400" />
                  <p className="text-sm font-bold uppercase tracking-widest text-gray-300">
                    Ders Verilen Programlar
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {Array.from(programSet.values()).map((v, i) => (
                    <span key={i} className="text-sm font-medium px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Schedule Grid */}
            <div className="card p-2 sm:p-6 rounded-2xl border border-gray-800 bg-gray-900/30 overflow-hidden shadow-2xl">
              <ScheduleGrid entries={entries} timeSlots={timeSlots} readonly />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
