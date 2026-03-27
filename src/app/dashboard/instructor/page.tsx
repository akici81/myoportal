import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, ClipboardList, CalendarDays, Building2 } from 'lucide-react'
import { DashboardPage } from '@/components/dashboard/DashboardPage'

export default async function InstructorDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: instructor } = await supabase
    .from('instructors')
    .select('id')
    .eq('email', user.email)
    .maybeSingle()

  let courseCount = 0
  let scheduleCount = 0
  let todaysClasses: any[] = []

  if (instructor) {
    const { count: cc } = await supabase
      .from('program_courses')
      .select('*', { count: 'exact', head: true })
      .eq('instructor_id', instructor.id)
    courseCount = cc || 0

    const { data: programCourses } = await supabase
      .from('program_courses')
      .select('id, courses(name, code, course_type)')
      .eq('instructor_id', instructor.id)

    if (programCourses && programCourses.length > 0) {
      const pcIds = programCourses.map(pc => pc.id)
      const { count: sc } = await supabase
        .from('schedule_entries')
        .select('*', { count: 'exact', head: true })
        .in('program_course_id', pcIds)
      scheduleCount = sc || 0

      const currentDay = new Date().getDay()
      const { data: myEntries } = await supabase
        .from('schedule_entries')
        .select(`
          day_of_week,
          time_slot_id,
          program_course_id,
          classrooms(name, building),
          time_slots(start_time, end_time, slot_number)
        `)
        .in('program_course_id', pcIds)
        .eq('day_of_week', currentDay === 0 || currentDay === 6 ? 1 : currentDay)
        .order('time_slots(slot_number)', { ascending: true })

      if (myEntries) {
        todaysClasses = myEntries
          .map((e: any) => {
            const match = programCourses.find(pc => pc.id === e.program_course_id)
            return { ...e, course: match?.courses }
          })
          .sort((a, b) => (a.time_slots?.slot_number || 0) - (b.time_slots?.slot_number || 0))
      }
    }
  }

  const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
  const targetDay = new Date().getDay()
  const displayDayName = DAY_NAMES[targetDay === 0 || targetDay === 6 ? 1 : targetDay]

  return (
    <DashboardPage
      title={`Hoş Geldiniz, ${profile?.full_name || 'Hocam'}`}
      subtitle="Öğretim Elemanı Paneli"
      stats={[
        { label: 'Toplam Dersim',       value: courseCount,   icon: BookOpen,    iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', topBar: 'from-amber-500 to-orange-500' },
        { label: 'Haftalık Ders Saati', value: scheduleCount, icon: CalendarDays, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-400',  topBar: 'from-cyan-500 to-red-600' },
      ]}
      actions={[
        { label: 'Ders Programım',          href: '/dashboard/instructor/schedule',    icon: CalendarDays,  description: 'Haftalık ders programınızı görüntüleyin',           accentColor: 'text-amber-400', accentBg: 'bg-amber-500/10', hoverShadow: 'hover:shadow-amber-500/10' },
        { label: 'Kısıtlarım',              href: '/dashboard/instructor/constraints', icon: ClipboardList, description: 'Müsait olmadığınız saatleri belirtin',              accentColor: 'text-cyan-400',  accentBg: 'bg-cyan-500/10',  hoverShadow: 'hover:shadow-cyan-500/10' },
        { label: 'İzin Talepleri',          href: '/dashboard/instructor/leaves',      icon: ClipboardList, description: 'Yeni izin süreci başlatın veya durumunu izleyin',  accentColor: 'text-rose-400',  accentBg: 'bg-rose-500/10',  hoverShadow: 'hover:shadow-rose-500/10' },
        { label: 'Birim İçi Değerlendirme', href: '/dashboard/instructor/evaluation',  icon: BookOpen,      description: 'Eğitim-Öğretim değerlendirme formunu doldurun',    accentColor: 'text-emerald-400', accentBg: 'bg-emerald-500/10', hoverShadow: 'hover:shadow-emerald-500/10' },
      ]}
    >
      {/* Bugünkü Derslerim */}
      <div className="animate-in-delay-3 rounded-2xl border border-white/5 card/30 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Bugünkü Eğitmenlik ({displayDayName})</h2>
        </div>

        {todaysClasses.length > 0 ? (
          <div className="space-y-3">
            {todaysClasses.map((item, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/5 card p-4 transition-colors hover:card/80">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 font-bold">
                    {item.time_slots?.start_time.split(':')[0]}:00
                  </div>
                  <div>
                    <h3 className="font-medium text-base" style={{ color: 'var(--text)' }}>{item.course?.name || 'Bilinmiyor'}</h3>
                    <div className="mt-1 flex items-center gap-3 text-sm" style={{ color: 'var(--muted)' }}>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {item.time_slots?.start_time} - {item.time_slots?.end_time}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center px-4 py-2 rounded-lg card border border-white/5 whitespace-nowrap">
                  <Building2 className="mr-2 h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">{item.classrooms?.name || 'Sanal'} ({item.classrooms?.building || '-'})</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 card">
            <CalendarDays className="mb-2 h-8 w-8" style={{ color: 'var(--muted)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Bugün için planlanmış bir dersiniz bulunmuyor.</p>
          </div>
        )}
      </div>
    </DashboardPage>
  )
}
