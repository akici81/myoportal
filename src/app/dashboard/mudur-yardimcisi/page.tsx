import { createClient } from '@/lib/supabase/server'
import { BookOpen, Building2, Users, Briefcase, FileText, ClipboardList, CalendarDays } from 'lucide-react'
import { DashboardPage } from '@/components/dashboard/DashboardPage'

export default async function MudurYardimcisiDashboard() {
  const supabase = await createClient()

  const [
    { count: classroomCount },
    { count: instructorCount },
    { count: programCount },
    { count: commissionCount },
    { count: internshipCount },
    { count: requestCount },
  ] = await Promise.all([
    supabase.from('classrooms').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('instructors').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('programs').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('commissions').select('*', { count: 'exact', head: true }),
    supabase.from('internship_records').select('*', { count: 'exact', head: true }),
    supabase.from('general_requests').select('*', { count: 'exact', head: true }),
  ])

  return (
    <DashboardPage
      title="Müdür Yardımcısı Paneli"
      subtitle="Kurum yönetimi ve idari süreçler"
      stats={[
        { label: 'Aktif Program',    value: programCount || 0,    icon: BookOpen,    iconBg: 'bg-red-600/10',     iconColor: 'text-red-400',     topBar: 'from-red-600 to-pink-500' },
        { label: 'Derslik',          value: classroomCount || 0,  icon: Building2,   iconBg: 'bg-rose-500/10',    iconColor: 'text-rose-400',    topBar: 'from-rose-500 to-red-600' },
        { label: 'Öğretim Elemanı',  value: instructorCount || 0, icon: Users,       iconBg: 'bg-teal-500/10',    iconColor: 'text-teal-400',    topBar: 'from-teal-500 to-cyan-500' },
        { label: 'Talepler',         value: requestCount || 0,    icon: FileText,    iconBg: 'bg-fuchsia-500/10', iconColor: 'text-fuchsia-400', topBar: 'from-fuchsia-500 to-purple-500' },
      ]}
      actions={[
        { label: 'Komisyon Yönetimi', href: '/dashboard/mudur-yardimcisi/commissions', icon: ClipboardList, description: 'Aktif komisyonları görüntüle',  accentColor: 'text-amber-400',   accentBg: 'bg-amber-500/10',   hoverShadow: 'hover:shadow-amber-500/10' },
        { label: 'Staj İşlemleri',    href: '/dashboard/mudur-yardimcisi/internships',  icon: Briefcase,     description: 'Staj başvurularını yönet',    accentColor: 'text-red-400',     accentBg: 'bg-red-600/10',     hoverShadow: 'hover:shadow-red-600/10' },
        { label: 'Genel Talepler',    href: '/dashboard/mudur-yardimcisi/requests',     icon: FileText,      description: 'Dilekçe ve evrak talepleri',  accentColor: 'text-fuchsia-400', accentBg: 'bg-fuchsia-500/10', hoverShadow: 'hover:shadow-fuchsia-500/10' },
        { label: 'Ders Programları',  href: '/dashboard/mudur-yardimcisi/schedule',     icon: CalendarDays,  description: 'Tüm program çizelgeleri',     accentColor: 'text-cyan-400',    accentBg: 'bg-cyan-500/10',    hoverShadow: 'hover:shadow-cyan-500/10' },
      ]}
    />
  )
}
