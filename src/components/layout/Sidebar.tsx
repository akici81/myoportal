'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  Building2,
  Users,
  GraduationCap,
  ClipboardList,
  Settings,
  LogOut,
  UserCog,
  ChevronRight,
  Menu,
  X,
  Link2,
  Wand2,
  User,
  AlertTriangle,
  Target,
  Briefcase,
  FileText,
  FileQuestion,
} from 'lucide-react'
import { useState } from 'react'
import { ROLE_META, type UserRole } from '@/types'
import clsx from 'clsx'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
  defaultOpen?: boolean
}

// =============================================
// NAVİGASYON TANIMLARI (V2 FONKSİYONELLİĞİ)
// =============================================

const NAV_SYSTEM_ADMIN_GROUPS: NavGroup[] = [
  {
    label: 'Platform Ayarları', icon: Settings, items: [
      { label: 'Kullanıcı Yönetimi', href: '/dashboard/system-admin/users', icon: UserCog },
    ]
  },
  {
    label: 'Akademik Birimler', icon: Building2, defaultOpen: true, items: [
      { label: 'Bölümler', href: '/dashboard/system-admin/departments', icon: GraduationCap },
      { label: 'Önlisans Programları', href: '/dashboard/system-admin/programs', icon: BookOpen },
      { label: 'Genel Ders Havuzu', href: '/dashboard/system-admin/courses', icon: ClipboardList },
      { label: 'Derslikler', href: '/dashboard/system-admin/classrooms', icon: Building2 },
      { label: 'Öğretim Elemanları', href: '/dashboard/system-admin/instructors', icon: Users },
    ]
  },
  {
    label: 'Planlama', icon: CalendarDays, items: [
      { label: 'Ders Programları', href: '/dashboard/system-admin/schedule', icon: BookOpen },
      { label: 'Etkinlik Takvimi', href: '/dashboard/system-admin/events', icon: CalendarDays },
    ]
  }
]

const NAV_MUDUR_GROUPS: NavGroup[] = [
  {
    label: 'Genel Görünüm', icon: Building2, defaultOpen: true, items: [
      { label: 'Bölümler', href: '/dashboard/mudur/departments', icon: GraduationCap },
      { label: 'Öğretim Elemanları', href: '/dashboard/mudur/instructors', icon: Users },
      { label: 'Derslikler', href: '/dashboard/mudur/classrooms', icon: Building2 },
    ]
  },
  {
    label: 'Personel İşlemleri', icon: Users, items: [
      { label: 'İzin Talepleri', href: '/dashboard/sekreter/leaves', icon: ClipboardList },
    ]
  },
  {
    label: 'Eğitim Planları', icon: BookOpen, items: [
      { label: 'Ders Programları', href: '/dashboard/mudur/schedule', icon: BookOpen },
    ]
  }
]

const NAV_MUDUR_YARDIMCISI_GROUPS: NavGroup[] = [
  {
    label: 'Kurum Yönetimi', icon: LayoutDashboard, defaultOpen: true, items: [
      { label: 'Bölümler', href: '/dashboard/mudur-yardimcisi/departments', icon: GraduationCap },
      { label: 'Eğitmen Listesi', href: '/dashboard/mudur-yardimcisi/instructors', icon: Users },
      { label: 'Derslikler', href: '/dashboard/mudur-yardimcisi/classrooms', icon: Building2 },
      { label: 'Kullanıcı Yönetimi', href: '/dashboard/mudur-yardimcisi/users', icon: UserCog },
    ]
  },
  {
    label: 'Akademik Birimler', icon: Target, items: [
      { label: 'Komisyon Yönetimi', href: '/dashboard/mudur-yardimcisi/commissions', icon: Target },
      { label: 'Staj İşlemleri', href: '/dashboard/mudur-yardimcisi/internships', icon: Briefcase },
    ]
  },
  {
    label: 'Personel İşlemleri', icon: Users, items: [
      { label: 'Genel Talepler ve Dilekçe', href: '/dashboard/mudur-yardimcisi/requests', icon: FileText },
      { label: 'İzin Sistem Yönetimi', href: '/dashboard/sekreter/leaves', icon: ClipboardList },
    ]
  },
  {
    label: 'Çizelgeler & Takvim', icon: CalendarDays, items: [
      { label: 'Tüm Ders Programları', href: '/dashboard/mudur-yardimcisi/schedule', icon: BookOpen },
      { label: 'Etkinlik Takvimi', href: '/dashboard/mudur-yardimcisi/events', icon: CalendarDays },
    ]
  }
]

const NAV_SEKRETER_GROUPS: NavGroup[] = [
  {
    label: 'Ders Yönetimi', icon: BookOpen, defaultOpen: true, items: [
      { label: 'Ders Programları', href: '/dashboard/sekreter/schedule', icon: BookOpen },
      { label: 'Ortak Dersler', href: '/dashboard/sekreter/shared-courses', icon: Link2 },
      { label: 'Otomatik Program', href: '/dashboard/sekreter/auto-schedule', icon: Wand2 },
    ]
  },
  {
    label: 'Personel', icon: Users, items: [
      { label: 'İzin Talepleri (Onay)', href: '/dashboard/sekreter/leaves', icon: UserCog },
      { label: 'Hoca Kısıtları', href: '/dashboard/sekreter/constraints', icon: ClipboardList },
      { label: 'Hoca Programları', href: '/dashboard/sekreter/instructor-schedule', icon: User },
    ]
  },
  {
    label: 'Akademik Birimler', icon: GraduationCap, items: [
      { label: 'Bölümler', href: '/dashboard/sekreter/departments', icon: GraduationCap },
      { label: 'Öğretim Elemanları', href: '/dashboard/sekreter/instructors', icon: Users },
    ]
  },
  {
    label: 'Derslikler', icon: Building2, items: [
      { label: 'Derslik Listesi', href: '/dashboard/sekreter/classrooms', icon: Building2 },
      { label: 'Derslik Kullanımı', href: '/dashboard/sekreter/classroom-schedule', icon: CalendarDays },
    ]
  },
  {
    label: 'Kontrol & Raporlar', icon: AlertTriangle, items: [
      { label: 'Çakışma Raporu', href: '/dashboard/sekreter/conflicts', icon: AlertTriangle },
      { label: 'Akademik Dönemler', href: '/dashboard/sekreter/periods', icon: Settings },
      { label: 'Etkinlik Takvimi', href: '/dashboard/sekreter/events', icon: CalendarDays },
    ]
  }
]

// Bölüm Başkanı - Gruplu
const NAV_BOLUM_BASKANI_GROUPS: NavGroup[] = [
  {
    label: 'Ders Yönetimi',
    icon: BookOpen,
    defaultOpen: true,
    items: [
      { label: 'Ders Görevlendirme', href: '/dashboard/bolum-baskani/course-assignments', icon: ClipboardList },
      { label: 'Öğrenci Sayıları', href: '/dashboard/bolum-baskani/student-enrollments', icon: Users },
      { label: 'Akıllı Yerleştirme', href: '/dashboard/bolum-baskani/auto-schedule', icon: Wand2 },
    ],
  },
  {
    label: 'Ders Programı',
    icon: CalendarDays,
    defaultOpen: true,
    items: [
      { label: 'Program Görüntüle', href: '/dashboard/bolum-baskani/schedule', icon: BookOpen },
      { label: 'Derslik Programları', href: '/dashboard/bolum-baskani/classroom-schedule', icon: Building2 },
    ],
  },
  {
    label: 'Personel',
    icon: Users,
    defaultOpen: false,
    items: [
      { label: 'Öğretim Elemanları', href: '/dashboard/bolum-baskani/instructors', icon: Users },
      { label: 'Hoca Kısıtları', href: '/dashboard/bolum-baskani/instructor-constraints', icon: ClipboardList },
    ],
  },
]

const NAV_BOLUM_BASKANI_SINGLE: NavItem[] = [
  { label: 'Derslik Listesi', href: '/dashboard/bolum-baskani/classrooms', icon: Building2 },
  { label: 'Etkinlik Takvimi', href: '/dashboard/bolum-baskani/events', icon: CalendarDays },
]

const NAV_INSTRUCTOR_GROUPS: NavGroup[] = [
  {
    label: 'Akademik Planlama', icon: BookOpen, items: [
      { label: 'Ders Programım', href: '/dashboard/instructor/schedule', icon: CalendarDays },
      { label: 'Kısıtlarım', href: '/dashboard/instructor/constraints', icon: ClipboardList },
      { label: 'Etkinlik Takvimi', href: '/dashboard/instructor/events', icon: CalendarDays },
    ]
  },
  {
    label: 'Öğrenci & Birim İşlemleri', icon: Target, items: [
      { label: 'Komisyonlarım', href: '/dashboard/instructor/commissions', icon: Target },
      { label: 'Staj Sicil Ekleme', href: '/dashboard/instructor/internships', icon: Briefcase },
    ]
  },
  {
    label: 'Personel İşlemleri', icon: Users, items: [
      { label: 'İzin Taleplerim', href: '/dashboard/instructor/leaves', icon: ClipboardList },
      { label: 'Dilekçe & Evrak İstemi', href: '/dashboard/instructor/requests', icon: FileText },
      { label: 'Birim İçi Değerlendirme', href: '/dashboard/instructor/evaluation', icon: FileQuestion },
    ]
  }
]

function getNavGroups(role: UserRole): NavGroup[] {
  switch (role) {
    case 'system_admin':
      return NAV_SYSTEM_ADMIN_GROUPS
    case 'mudur':
      return NAV_MUDUR_GROUPS
    case 'mudur_yardimcisi':
      return NAV_MUDUR_YARDIMCISI_GROUPS
    case 'sekreter':
      return NAV_SEKRETER_GROUPS
    case 'bolum_baskani':
      return NAV_BOLUM_BASKANI_GROUPS
    case 'instructor':
      return NAV_INSTRUCTOR_GROUPS
    default:
      return [] 
  }
}

// =============================================
// V1 STYLED COMPONENTS
// =============================================

function NavGroupComponent({ group, pathname, meta }: { group: NavGroup; pathname: string; meta: any }) {
  const hasActiveItem = group.items.some((item) => pathname === item.href)
  const [isOpen, setIsOpen] = useState(group.defaultOpen || hasActiveItem)

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex w-full items-center justify-between px-3 py-2 text-sm font-medium transition-all group rounded-lg',
          hasActiveItem
            ? 'text-white'
            : 'text-[#94a3b8] hover:bg-[#111827] hover:text-white'
        )}
      >
        <span className="flex items-center gap-3">
          <group.icon className="h-4 w-4 opacity-70" />
          {group.label}
        </span>
        <span className={clsx('transition-transform opacity-50', isOpen && 'rotate-90')}>
          <ChevronRight className="h-4 w-4" />
        </span>
      </button>
      
      <div className={clsx(
        'overflow-hidden transition-all duration-300 ease-in-out',
        isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="mt-0.5 space-y-0.5">
          {group.items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ml-2',
                  active ? 'text-white' : 'hover:bg-[#111827] text-[#94a3b8] hover:text-white'
                )}
                style={
                  active
                    ? {
                        background: meta.color + '15',
                        color: meta.color,
                        borderLeft: `2px solid ${meta.color}`,
                      }
                    : {}
                }
              >
                <item.icon className="h-4 w-4 opacity-60 flex-shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface SidebarProps {
  role: UserRole
  userName: string
  departmentName?: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const navGroups = getNavGroups(role)
  const meta = ROLE_META[role]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Çıkış yapıldı')
    window.location.href = '/auth/login'
  }

  // Determine the base dashboard link based on role
  let dashboardLink = '/dashboard/instructor' 
  if (role === 'system_admin') dashboardLink = '/dashboard/system-admin'
  if (role === 'mudur') dashboardLink = '/dashboard/mudur'
  if (role === 'mudur_yardimcisi') dashboardLink = '/dashboard/mudur-yardimcisi'
  if (role === 'sekreter') dashboardLink = '/dashboard/sekreter'
  if (role === 'bolum_baskani') dashboardLink = '/dashboard/bolum-baskani'

  const TopLevelDashLink = () => {
    const active = pathname === dashboardLink
    return (
      <Link
        href={dashboardLink}
        className={clsx(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group mb-2',
          active ? 'text-white' : 'hover:bg-[#111827] text-[#94a3b8] hover:text-white'
        )}
        style={
          active
            ? {
                background: meta.color + '15',
                color: meta.color,
                borderLeft: `2px solid ${meta.color}`,
              }
            : {}
        }
      >
        <LayoutDashboard className="h-4 w-4 opacity-70 flex-shrink-0" />
        <span>Dashboard</span>
      </Link>
    )
  }

  const SidebarContent = () => (
    <div
      className="flex flex-col h-full bg-[#080c15]"
      style={{ borderRight: '1px solid var(--border)' }}
    >
      <div className="flex h-16 items-center flex-shrink-0 gap-3 px-5 border-b border-[#1a2540]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #c0392b, #e74c3c)' }}
        >
          MYO
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none tracking-tight">MYO Portal</p>
          <p className="text-[10px] mt-0.5 tracking-wider uppercase text-[#475569]">
            Rumeli Üniversitesi
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
        <TopLevelDashLink />
        
        {navGroups.map((group) => (
          <NavGroupComponent key={group.label} group={group} pathname={pathname} meta={meta} />
        ))}

        {role === 'bolum_baskani' && NAV_BOLUM_BASKANI_SINGLE.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                active ? 'text-white' : 'hover:bg-[#111827] text-[#94a3b8] hover:text-white'
              )}
              style={
                active
                  ? {
                      background: meta.color + '15',
                      color: meta.color,
                      borderLeft: `2px solid ${meta.color}`,
                    }
                  : {}
              }
            >
              <item.icon className="h-4 w-4 opacity-70 flex-shrink-0 transition-transform group-hover:scale-110" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Area */}
      <div className="p-3 border-t border-[#1a2540] space-y-1">
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg"
          style={{ background: '#0d1220' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{
              background: meta.color + '30',
              border: `1px solid ${meta.color}30`,
              color: meta.color,
            }}
          >
            {userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] truncate" style={{ color: meta.color }}>
              {meta.label}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[#111827] text-[#475569] hover:text-white mt-1"
        >
          <LogOut className="w-4 h-4" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg"
        style={{ background: '#0d1220', border: '1px solid #1a2540' }}
      >
        {open ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={clsx(
          'layout-sidebar transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
