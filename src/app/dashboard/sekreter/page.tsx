import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  BookOpen,
  Building2,
  Users,
  CalendarDays,
  Wand2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

import { LucideIcon } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'

export default async function SekreterDashboard() {
  const supabase = await createClient()

  const { data: activePeriod } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('is_active', true)
    .single()

  const { count: scheduleCount } = await supabase
    .from('schedule_entries')
    .select('*', { count: 'exact', head: true })
    .eq('period_id', activePeriod?.id || '')

  const { count: classroomCount } = await supabase
    .from('classrooms')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: instructorCount } = await supabase
    .from('instructors')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const stats = [
    {
      label: 'Yerleştirilmiş Ders',
      value: scheduleCount || 0,
      icon: CalendarDays,
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      topBar: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Aktif Derslik',
      value: classroomCount || 0,
      icon: Building2,
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      topBar: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Öğretim Elemanı',
      value: instructorCount || 0,
      icon: Users,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      topBar: 'from-amber-500 to-orange-500',
    },
  ]

  const quickActions = [
    {
      label: 'Ders Programları',
      href: '/dashboard/sekreter/schedule',
      icon: BookOpen,
      description: 'Tüm programların ders saatlerini görüntüle',
      accentColor: 'text-cyan-400',
      accentBg: 'bg-cyan-500/10',
      hoverShadow: 'hover:shadow-cyan-500/10',
    },
    {
      label: 'Otomatik Program',
      href: '/dashboard/sekreter/auto-schedule',
      icon: Wand2,
      description: 'Akıllı ders yerleştirme',
      accentColor: 'text-purple-400',
      accentBg: 'bg-purple-500/10',
      hoverShadow: 'hover:shadow-purple-500/10',
    },
    {
      label: 'Derslik Durumu',
      href: '/dashboard/sekreter/classroom-schedule',
      icon: Building2,
      description: 'Derslik doluluk durumları',
      accentColor: 'text-amber-400',
      accentBg: 'bg-amber-500/10',
      hoverShadow: 'hover:shadow-amber-500/10',
    },
    {
      label: 'Çakışma Raporu',
      href: '/dashboard/sekreter/conflicts',
      icon: AlertTriangle,
      description: 'Olası çakışmaları kontrol et',
      accentColor: 'text-red-400',
      accentBg: 'bg-red-500/10',
      hoverShadow: 'hover:shadow-red-500/10',
    },
  ]

  const periodLabel = activePeriod
    ? `${activePeriod.academic_year} ${activePeriod.semester === 'fall' ? 'Güz' : 'Bahar'} Dönemi`
    : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <TopBar 
        title="Sekreterlik Paneli" 
        subtitle={periodLabel || "Aktif dönem bulunamadı"} 
        actions={periodLabel ? <span className="badge-emerald"><Sparkles className="w-3 h-3 mr-1"/>Aktif Dönem</span> : null}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
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
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg} ring-1 ring-gray-200`}>
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
