import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen,
  Users,
  Building2,
  CalendarDays,
  Wand2,
  ClipboardList,
  ArrowRight,
} from 'lucide-react'

import { LucideIcon } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'

export default async function BolumBaskaniDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // course-assignments ile aynı pattern: ayrı sorgularla department bilgisi al
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

  // Department bilgisini ayrı sorgu ile al (FK bağımlılığı yok)
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

  // Program derslerini al
  const { data: programCoursesData } = await supabase
    .from('program_courses')
    .select('id')
    .in('program_id', programIds)
  
  const programCourseIds = programCoursesData?.map((pc) => pc.id) || []

  const { count: scheduleCount } = await supabase
    .from('schedule_entries')
    .select('*', { count: 'exact', head: true })
    .in('program_course_id', programCourseIds)


  const stats = [
    {
      label: 'Programlar',
      value: programs?.length || 0,
      icon: BookOpen,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      topBar: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Dersler',
      value: courseCount || 0,
      icon: ClipboardList,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      topBar: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Öğretim Elemanları',
      value: instructorCount || 0,
      icon: Users,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      topBar: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Yerleştirilmiş Ders',
      value: scheduleCount || 0,
      icon: CalendarDays,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      topBar: 'from-emerald-500 to-teal-500',
    },
  ]

  const quickActions = [
    {
      label: 'Ders Görevlendirme',
      href: '/dashboard/bolum-baskani/course-assignments',
      icon: ClipboardList,
      description: 'Hocalara ders ata',
      accentColor: 'text-cyan-400',
      accentBg: 'bg-cyan-500/10',
      hoverShadow: 'hover:shadow-cyan-500/10',
    },
    {
      label: 'Akıllı Yerleştirme',
      href: '/dashboard/bolum-baskani/auto-schedule',
      icon: Wand2,
      description: 'Otomatik program oluştur',
      accentColor: 'text-purple-400',
      accentBg: 'bg-purple-500/10',
      hoverShadow: 'hover:shadow-purple-500/10',
    },
    {
      label: 'Ders Programı',
      href: '/dashboard/bolum-baskani/schedule',
      icon: CalendarDays,
      description: 'Haftalık programı görüntüle',
      accentColor: 'text-emerald-400',
      accentBg: 'bg-emerald-500/10',
      hoverShadow: 'hover:shadow-emerald-500/10',
    },
    {
      label: 'Derslik Durumu',
      href: '/dashboard/bolum-baskani/classroom-schedule',
      icon: Building2,
      description: 'Derslik doluluk durumu',
      accentColor: 'text-amber-400',
      accentBg: 'bg-amber-500/10',
      hoverShadow: 'hover:shadow-amber-500/10',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <TopBar 
        title={`Hoş Geldiniz, ${profile.full_name}`} 
        subtitle={`${department?.name} — Bölüm Başkanı`} 
        actions={<span className="badge-emerald">{department?.short_code}</span>}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="stat-card overflow-hidden"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className={`mb-4 h-1 w-full rounded-full bg-gradient-to-r ${stat.topBar} opacity-60`} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{stat.label}</p>
                <p className="mt-1.5 text-3xl font-bold" style={{ color: 'var(--text)' }}>{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg} ring-1 ring-white/5`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="animate-in-delay-2">
        <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--text)' }}>Hızlı İşlemler</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, i) => (
            <Link
              key={action.href}
              href={action.href}
              className={`action-card hover:shadow-lg ${action.hoverShadow}`}
              style={{ animationDelay: `${0.2 + i * 0.08}s` }}
            >
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${action.accentBg} ${action.accentColor} transition-transform duration-200 group-hover:scale-110`}>
                <action.icon className="h-6 w-6" />
              </div>
              <h3 className="font-medium" style={{ color: 'var(--text)' }}>{action.label}</h3>
              <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{action.description}</p>
              <div className={`mt-4 flex items-center text-sm font-medium ${action.accentColor}`}>
                Aç
                <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
