import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, Users, Building2, CalendarDays, Wand2, ClipboardList } from 'lucide-react'
import { DashboardPage } from '@/components/dashboard/DashboardPage'

export default async function BolumBaskaniDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, department_id')
    .eq('id', user.id)
    .single()

  if (!profile?.department_id) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center animate-in">
        <div className="rounded-full bg-cyan-500/10 p-6 mb-6 ring-4 ring-cyan-500/5">
          <Building2 className="h-16 w-16 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>Bölüm Ataması Bulunamadı</h2>
        <p className="max-w-md text-center mb-8 leading-relaxed" style={{ color: 'var(--muted)' }}>
          Bölüm Başkanı hesabınıza sistem üzerinden henüz bir bölüm (Department) atanmamış.
          Sistem Yöneticisinden veya Sekreterlikten, profilinize &quot;Bölüm Başkanı&quot; olarak bir bölüm atamasını talep ediniz.
        </p>
      </div>
    )
  }

  const { data: department } = await supabase
    .from('departments')
    .select('name, short_code')
    .eq('id', profile.department_id)
    .single()

  const { data: programs } = await supabase
    .from('programs')
    .select('id')
    .eq('department_id', profile.department_id)

  const programIds = programs?.map((p) => p.id) || []

  const { count: courseCount } = await supabase
    .from('program_courses')
    .select('*', { count: 'exact', head: true })
    .in('program_id', programIds)

  const { count: instructorCount } = await supabase
    .from('instructor_departments')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', profile.department_id)

  const { data: programCoursesData } = await supabase
    .from('program_courses')
    .select('id')
    .in('program_id', programIds)

  const programCourseIds = programCoursesData?.map((pc) => pc.id) || []

  const { count: scheduleCount } = await supabase
    .from('schedule_entries')
    .select('*', { count: 'exact', head: true })
    .in('program_course_id', programCourseIds)

  return (
    <DashboardPage
      title={`Hoş Geldiniz, ${profile.full_name}`}
      subtitle={`${department?.name} — Bölüm Başkanı`}
      badge={<span className="badge-emerald">{department?.short_code}</span>}
      stats={[
        { label: 'Programlar',          value: programs?.length || 0, icon: BookOpen,     iconBg: 'bg-cyan-500/10',    iconColor: 'text-cyan-400',    topBar: 'from-cyan-500 to-red-600' },
        { label: 'Dersler',             value: courseCount || 0,      icon: ClipboardList, iconBg: 'bg-red-600/10',    iconColor: 'text-red-400',     topBar: 'from-red-600 to-pink-500' },
        { label: 'Öğretim Elemanları',  value: instructorCount || 0,  icon: Users,         iconBg: 'bg-amber-500/10',  iconColor: 'text-amber-400',   topBar: 'from-amber-500 to-orange-500' },
        { label: 'Yerleştirilmiş Ders', value: scheduleCount || 0,    icon: CalendarDays,  iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', topBar: 'from-emerald-500 to-teal-500' },
      ]}
      actions={[
        { label: 'Ders Görevlendirme', href: '/dashboard/bolum-baskani/course-assignments',  icon: ClipboardList, description: 'Hocalara ders ata',                accentColor: 'text-cyan-400',    accentBg: 'bg-cyan-500/10',    hoverShadow: 'hover:shadow-cyan-500/10' },
        { label: 'Akıllı Yerleştirme', href: '/dashboard/bolum-baskani/auto-schedule',       icon: Wand2,         description: 'Otomatik program oluştur',          accentColor: 'text-red-400',     accentBg: 'bg-red-600/10',     hoverShadow: 'hover:shadow-red-600/10' },
        { label: 'Ders Programı',      href: '/dashboard/bolum-baskani/schedule',            icon: CalendarDays,  description: 'Haftalık programı görüntüle',       accentColor: 'text-emerald-400', accentBg: 'bg-emerald-500/10', hoverShadow: 'hover:shadow-emerald-500/10' },
        { label: 'Derslik Durumu',     href: '/dashboard/bolum-baskani/classroom-schedule',  icon: Building2,     description: 'Derslik doluluk durumu',            accentColor: 'text-amber-400',   accentBg: 'bg-amber-500/10',   hoverShadow: 'hover:shadow-amber-500/10' },
      ]}
    />
  )
}
