import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  BookOpen,
  Building2,
  Users,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'

export default async function MudurDashboard() {
  const supabase = await createClient()

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

  const stats = [
    { label: 'Bölümler', value: departmentCount || 0, icon: GraduationCap, href: '/dashboard/mudur/departments' },
    { label: 'Programlar', value: programCount || 0, icon: BookOpen, href: '/dashboard/mudur/schedule' },
    { label: 'Öğretim Elemanları', value: instructorCount || 0, icon: Users, href: '/dashboard/mudur/instructors' },
    { label: 'Derslikler', value: classroomCount || 0, icon: Building2, href: '/dashboard/mudur/classrooms' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>MYO Müdürlüğü</h1>
        <p className="mt-1" style={{ color: 'var(--muted)' }}>Genel bakış ve yönetim paneli</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group card-hover p-6 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{stat.label}</p>
                <p className="mt-1 text-3xl font-bold" style={{ color: 'var(--text)' }}>{stat.value}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--primary)' }}>
              Görüntüle
              <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
