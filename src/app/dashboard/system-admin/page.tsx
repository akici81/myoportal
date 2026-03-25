import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ArrowRight,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'

export default async function SystemAdminDashboard() {
  const supabase = await createClient()

  // İstatistikler
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { count: departmentCount } = await supabase
    .from('departments')
    .select('*', { count: 'exact', head: true })

  const { count: programCount } = await supabase
    .from('programs')
    .select('*', { count: 'exact', head: true })

  const { count: instructorCount } = await supabase
    .from('instructors')
    .select('*', { count: 'exact', head: true })

  const { count: classroomCount } = await supabase
    .from('classrooms')
    .select('*', { count: 'exact', head: true })

  const { count: courseCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })

  const stats = [
    { 
      label: 'Kullanıcı Yönetimi', 
      value: userCount || 0, 
      icon: Users, 
      href: '/dashboard/system-admin/users',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
      topBar: 'from-red-500 to-orange-500',
    },
    { 
      label: 'Bölümler', 
      value: departmentCount || 0, 
      icon: GraduationCap, 
      href: '/dashboard/system-admin/departments',
      iconBg: 'bg-purple-500/10',
      iconColor: 'text-purple-400',
      topBar: 'from-purple-500 to-pink-500',
    },
    { 
      label: 'Programlar', 
      value: programCount || 0, 
      icon: BookOpen, 
      href: '/dashboard/system-admin/programs',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      topBar: 'from-blue-500 to-cyan-500',
    },
    { 
      label: 'Öğretim Elemanları', 
      value: instructorCount || 0, 
      icon: Users, 
      href: '/dashboard/system-admin/instructors',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-400',
      topBar: 'from-amber-500 to-yellow-500',
    },
    { 
      label: 'Derslikler', 
      value: classroomCount || 0, 
      icon: Building2, 
      href: '/dashboard/system-admin/classrooms',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      topBar: 'from-emerald-500 to-teal-500',
    },
    { 
      label: 'Dersler', 
      value: courseCount || 0, 
      icon: CalendarDays, 
      href: '/dashboard/system-admin/courses',
      iconBg: 'bg-cyan-500/10',
      iconColor: 'text-cyan-400',
      topBar: 'from-cyan-500 to-blue-500',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <TopBar title="Sistem Yönetimi" subtitle="MYO Portal Altyapı ve Veri Yönetimi" />

      {/* Stats / Management Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="action-card overflow-hidden"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <div className={`mb-4 h-0.5 w-full rounded-full bg-gradient-to-r ${stat.topBar} opacity-60`} />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</p>
                <p className="mt-1.5 text-3xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg}`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
            <div className={`mt-4 flex items-center text-sm font-medium ${stat.iconColor} opacity-0 transition-opacity duration-300 group-hover:opacity-50`}>
              Yönet
              <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
