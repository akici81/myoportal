import { createClient } from '@/lib/supabase/server'
import { Users, Building2, GraduationCap, BookOpen, CalendarDays } from 'lucide-react'
import { DashboardPage } from '@/components/dashboard/DashboardPage'

export default async function SystemAdminDashboard() {
  const supabase = await createClient()

  const [
    { count: userCount },
    { count: departmentCount },
    { count: programCount },
    { count: instructorCount },
    { count: classroomCount },
    { count: courseCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('departments').select('*', { count: 'exact', head: true }),
    supabase.from('programs').select('*', { count: 'exact', head: true }),
    supabase.from('instructors').select('*', { count: 'exact', head: true }),
    supabase.from('classrooms').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
  ])

  return (
    <DashboardPage
      title="Sistem Yönetimi"
      subtitle="MYO Portal Altyapı ve Veri Yönetimi"
      stats={[
        { label: 'Kullanıcılar',       value: userCount || 0,       icon: Users,        href: '/dashboard/system-admin/users',        iconBg: 'bg-red-500/10',     iconColor: 'text-red-400',     topBar: 'from-red-500 to-orange-500' },
        { label: 'Bölümler',           value: departmentCount || 0, icon: GraduationCap, href: '/dashboard/system-admin/departments', iconBg: 'bg-red-600/10',     iconColor: 'text-red-400',     topBar: 'from-red-600 to-pink-500' },
        { label: 'Programlar',         value: programCount || 0,    icon: BookOpen,      href: '/dashboard/system-admin/programs',    iconBg: 'bg-red-600/10',     iconColor: 'text-red-400',     topBar: 'from-red-600 to-cyan-500' },
        { label: 'Öğretim Elemanları', value: instructorCount || 0, icon: Users,         href: '/dashboard/system-admin/instructors', iconBg: 'bg-amber-500/10',   iconColor: 'text-amber-400',   topBar: 'from-amber-500 to-yellow-500' },
        { label: 'Derslikler',         value: classroomCount || 0,  icon: Building2,     href: '/dashboard/system-admin/classrooms',  iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400', topBar: 'from-emerald-500 to-teal-500' },
        { label: 'Dersler',            value: courseCount || 0,     icon: CalendarDays,  href: '/dashboard/system-admin/courses',     iconBg: 'bg-cyan-500/10',    iconColor: 'text-cyan-400',    topBar: 'from-cyan-500 to-red-600' },
      ]}
      actions={[
        { label: 'Kullanıcı Yönetimi', href: '/dashboard/system-admin/users',        icon: Users,        description: 'Kullanıcı ekle, rol ata',     accentColor: 'text-red-400',     accentBg: 'bg-red-500/10',     hoverShadow: 'hover:shadow-red-500/10' },
        { label: 'Bölümler',           href: '/dashboard/system-admin/departments',  icon: GraduationCap,description: 'Bölüm yönetimi',             accentColor: 'text-red-400',     accentBg: 'bg-red-600/10',     hoverShadow: 'hover:shadow-red-600/10' },
        { label: 'Ders Havuzu',        href: '/dashboard/system-admin/courses',      icon: BookOpen,     description: 'Genel ders kataloğu',        accentColor: 'text-cyan-400',    accentBg: 'bg-cyan-500/10',    hoverShadow: 'hover:shadow-cyan-500/10' },
        { label: 'Derslikler',         href: '/dashboard/system-admin/classrooms',   icon: Building2,    description: 'Derslik ve lab yönetimi',    accentColor: 'text-emerald-400', accentBg: 'bg-emerald-500/10', hoverShadow: 'hover:shadow-emerald-500/10' },
      ]}
    />
  )
}
