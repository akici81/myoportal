import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  BookOpen,
  Building2,
  Users,
  GraduationCap,
  ArrowRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  BarChart3,
  UserPlus,
  CalendarPlus,
  FileSpreadsheet,
} from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'

export default async function MudurDashboard() {
  const supabase = await createClient()

  // Temel istatistikler
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

  // Ders programı istatistikleri
  const { count: totalCourses } = await supabase
    .from('program_courses')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: assignedCourses } = await supabase
    .from('program_courses')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('instructor_id', 'is', null)

  // Schedule entry sayısı
  const { count: scheduleEntries } = await supabase
    .from('schedule_entries')
    .select('*', { count: 'exact', head: true })

  // Son eklenen öğretim elemanları (5 adet)
  const { data: recentInstructors } = await supabase
    .from('instructors')
    .select('id, full_name, title, created_at, departments(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  // Bekleyen izin talepleri
  const { count: pendingLeaves } = await supabase
    .from('leaves')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Aktif akademik dönem
  const { data: activePeriod } = await supabase
    .from('academic_periods')
    .select('*')
    .eq('is_active', true)
    .single()

  // İstatistik kartları
  const stats = [
    {
      label: 'Bölümler',
      value: departmentCount || 0,
      icon: GraduationCap,
      href: '/dashboard/mudur/departments',
      color: '#B71C1C',
      bgColor: '#FFEBEE',
      trend: '+2',
      trendUp: true,
    },
    {
      label: 'Öğretim Elemanları',
      value: instructorCount || 0,
      icon: Users,
      href: '/dashboard/mudur/instructors',
      color: '#1976D2',
      bgColor: '#E3F2FD',
      trend: '+5',
      trendUp: true,
    },
    {
      label: 'Derslikler',
      value: classroomCount || 0,
      icon: Building2,
      href: '/dashboard/mudur/classrooms',
      color: '#388E3C',
      bgColor: '#E8F5E9',
      trend: '0',
      trendUp: null,
    },
    {
      label: 'Ders Programları',
      value: scheduleEntries || 0,
      icon: Calendar,
      href: '/dashboard/mudur/schedule',
      color: '#F57C00',
      bgColor: '#FFF3E0',
      trend: '+12',
      trendUp: true,
    },
  ]

  // Hızlı aksiyonlar
  const quickActions = [
    { label: 'Yeni Rapor', icon: FileSpreadsheet, href: '/dashboard/mudur/schedule', color: '#B71C1C' },
    { label: 'Öğretim Elemanı', icon: UserPlus, href: '/dashboard/system-admin/instructors', color: '#1976D2' },
    { label: 'Ders Programı', icon: CalendarPlus, href: '/dashboard/mudur/schedule', color: '#388E3C' },
    { label: 'İstatistikler', icon: BarChart3, href: '/dashboard/mudur/departments', color: '#F57C00' },
  ]

  // İlerleme yüzdeleri
  const assignmentProgress = totalCourses ? Math.round(((assignedCourses || 0) / totalCourses) * 100) : 0

  return (
    <div className="space-y-8 pb-20">
      {/* Başlık */}
      <TopBar
        title="MYO Müdürlüğü"
        subtitle={activePeriod ? activePeriod.name : 'Aktif dönem bulunamadı'}
        actions={
          <div className="px-4 py-2 rounded-xl border" style={{ background: 'var(--success-bg)', borderColor: '#86EFAC', color: 'var(--success)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">Sistem Aktif</span>
            </div>
          </div>
        }
      />

      {/* İstatistik Kartları */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group card-hover p-6 transition-all relative overflow-hidden"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Arka plan dekorasyon */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20"
              style={{ background: stat.color }}
            />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                    {stat.label}
                  </p>
                  <div className="flex items-end gap-2 mt-2">
                    <p className="text-4xl font-black" style={{ color: 'var(--text)' }}>
                      {stat.value}
                    </p>
                    {stat.trend && (
                      <div className={`flex items-center gap-1 mb-1 text-xs font-bold ${stat.trendUp ? 'text-emerald-600' : stat.trendUp === false ? 'text-red-600' : 'text-gray-500'}`}>
                        {stat.trendUp === true && <TrendingUp className="w-3 h-3" />}
                        {stat.trendUp === false && <TrendingDown className="w-3 h-3" />}
                        {stat.trend}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                  style={{ background: stat.bgColor, color: stat.color }}
                >
                  <stat.icon className="h-7 w-7" />
                </div>
              </div>

              <div className="flex items-center text-sm font-semibold transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-1" style={{ color: stat.color }}>
                Detayları Gör
                <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sol Kolon - İlerleme Kartları */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ders Atama İlerlemesi */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                Ders Atama İlerlemesi
              </h2>
              <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                {assignmentProgress}%
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--muted)' }}>Toplam Ders</span>
                <span className="font-bold" style={{ color: 'var(--text)' }}>{totalCourses || 0}</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{
                    width: `${assignmentProgress}%`,
                    background: `linear-gradient(90deg, ${assignmentProgress < 50 ? '#F59E0B' : assignmentProgress < 80 ? '#3B82F6' : '#10B981'} 0%, ${assignmentProgress < 50 ? '#EF4444' : assignmentProgress < 80 ? '#8B5CF6' : '#059669'} 100%)`
                  }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--muted)' }}>Atanmış Ders</span>
                <span className="font-bold" style={{ color: 'var(--text)' }}>{assignedCourses || 0}</span>
              </div>
            </div>
          </div>

          {/* Son Aktiviteler */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                Son Eklenenler
              </h2>
              <Link href="/dashboard/mudur/instructors" className="text-sm font-semibold hover:underline" style={{ color: 'var(--primary)' }}>
                Tümünü Gör
              </Link>
            </div>

            <div className="space-y-4">
              {recentInstructors && recentInstructors.length > 0 ? (
                recentInstructors.map((instructor, idx) => (
                  <div
                    key={instructor.id}
                    className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-gray-50"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                      {instructor.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {instructor.title || ''} {instructor.full_name}
                      </p>
                      <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                        {(instructor.departments as any)?.name || 'Bölüm atanmamış'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <Clock className="w-3 h-3" />
                      {new Date(instructor.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8" style={{ color: 'var(--muted)' }}>
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Henüz öğretim elemanı eklenmemiş</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sağ Kolon - Hızlı Aksiyonlar & Uyarılar */}
        <div className="space-y-6">
          {/* Hızlı Aksiyonlar */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>
              Hızlı İşlemler
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl border transition-all hover:scale-105 hover:shadow-lg group"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6"
                    style={{ background: `${action.color}15`, color: action.color }}
                  >
                    <action.icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-center" style={{ color: 'var(--text)' }}>
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Bekleyen İşler */}
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text)' }}>
              Bekleyen İşler
            </h2>
            <div className="space-y-3">
              {pendingLeaves && pendingLeaves > 0 ? (
                <Link
                  href="/dashboard/sekreter/leaves"
                  className="flex items-center justify-between p-4 rounded-xl transition-all hover:bg-amber-50"
                  style={{ background: 'var(--warning-bg)', border: '1px solid #FCD34D' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                      <AlertCircle className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>İzin Talepleri</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Onay bekliyor</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black" style={{ color: 'var(--warning)' }}>{pendingLeaves}</span>
                    <ArrowRight className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                  </div>
                </Link>
              ) : (
                <div className="text-center py-8 rounded-xl" style={{ background: 'var(--success-bg)' }}>
                  <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--success)' }} />
                  <p className="font-semibold" style={{ color: 'var(--success)' }}>Tüm işler tamamlandı!</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Bekleyen görev yok</p>
                </div>
              )}

              {(totalCourses || 0) > (assignedCourses || 0) && (
                <div
                  className="flex items-center justify-between p-4 rounded-xl"
                  style={{ background: 'var(--info-bg)', border: '1px solid #BFDBFE' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#DBEAFE' }}>
                      <FileText className="w-5 h-5" style={{ color: 'var(--info)' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Atanmamış Dersler</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>Öğretim elemanı bekliyor</p>
                    </div>
                  </div>
                  <span className="text-xl font-black" style={{ color: 'var(--info)' }}>
                    {(totalCourses || 0) - (assignedCourses || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
