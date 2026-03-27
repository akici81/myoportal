import { createClient } from '@/lib/supabase/server'
import { BookOpen, Building2, Users, CalendarDays, Wand2, AlertTriangle, Sparkles } from 'lucide-react'
import { DashboardPage } from '@/components/dashboard/DashboardPage'

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

  const periodLabel = activePeriod
    ? `${activePeriod.academic_year} ${activePeriod.semester === 'fall' ? 'Güz' : 'Bahar'} Dönemi`
    : null

  return (
    <DashboardPage
      title="Sekreterlik Paneli"
      subtitle={periodLabel || 'Aktif dönem bulunamadı'}
      badge={periodLabel ? <span className="badge-emerald"><Sparkles className="w-3 h-3 mr-1" />Aktif Dönem</span> : null}
      stats={[
        { label: 'Yerleştirilmiş Ders', value: scheduleCount || 0,  icon: CalendarDays, iconBg: 'bg-cyan-500/10',  iconColor: 'text-cyan-400',  topBar: 'from-cyan-500 to-red-600' },
        { label: 'Aktif Derslik',        value: classroomCount || 0, icon: Building2,    iconBg: 'bg-red-600/10',   iconColor: 'text-red-400',   topBar: 'from-red-600 to-pink-500' },
        { label: 'Öğretim Elemanı',      value: instructorCount || 0, icon: Users,       iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400', topBar: 'from-amber-500 to-orange-500' },
      ]}
      actions={[
        { label: 'Ders Programları', href: '/dashboard/sekreter/schedule',           icon: BookOpen,      description: 'Tüm programların ders saatlerini görüntüle', accentColor: 'text-cyan-400',  accentBg: 'bg-cyan-500/10',  hoverShadow: 'hover:shadow-cyan-500/10' },
        { label: 'Otomatik Program', href: '/dashboard/sekreter/auto-schedule',      icon: Wand2,         description: 'Akıllı ders yerleştirme',                    accentColor: 'text-red-400',   accentBg: 'bg-red-600/10',   hoverShadow: 'hover:shadow-red-600/10' },
        { label: 'Derslik Durumu',   href: '/dashboard/sekreter/classroom-schedule', icon: Building2,     description: 'Derslik doluluk durumları',                  accentColor: 'text-amber-400', accentBg: 'bg-amber-500/10', hoverShadow: 'hover:shadow-amber-500/10' },
        { label: 'Çakışma Raporu',   href: '/dashboard/sekreter/conflicts',          icon: AlertTriangle, description: 'Olası çakışmaları kontrol et',               accentColor: 'text-red-400',   accentBg: 'bg-red-500/10',   hoverShadow: 'hover:shadow-red-500/10' },
      ]}
    />
  )
}
