'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, CalendarDays, BookOpen, Building2, Users,
  GraduationCap, ClipboardList, Settings, LogOut, UserCog,
  ChevronRight, Menu, X, Link2, Wand2, User, AlertTriangle,
  Target, Briefcase, FileText, FileQuestion, ClipboardCheck,
} from 'lucide-react'
import { useState } from 'react'
import { ROLE_META, ROLE_ROUTES, type UserRole } from '@/types'
import clsx from 'clsx'

type NavItem  = { label: string; href: string; icon: React.ComponentType<{ className?: string }> }
type NavGroup = { label: string; icon: React.ComponentType<{ className?: string }>; items: NavItem[]; defaultOpen?: boolean }

// ── Navigasyon Tanımları ────────────────────────────────────────────────────

const NAV_CONFIG: Record<UserRole, { groups: NavGroup[]; singleItems?: NavItem[] }> = {
  system_admin: { groups: [
    { label: 'Platform Ayarları', icon: Settings, items: [
      { label: 'Kullanıcı Yönetimi', href: '/dashboard/system-admin/users', icon: UserCog },
      { label: 'Ders Saatleri',      href: '/dashboard/system-admin/time-slots', icon: CalendarDays },
    ]},
    { label: 'Akademik Birimler', icon: Building2, defaultOpen: true, items: [
      { label: 'Bölümler',              href: '/dashboard/system-admin/departments', icon: GraduationCap },
      { label: 'Önlisans Programları',  href: '/dashboard/system-admin/programs', icon: BookOpen },
      { label: 'Genel Ders Havuzu',     href: '/dashboard/system-admin/courses', icon: ClipboardList },
      { label: 'Derslikler',            href: '/dashboard/system-admin/classrooms', icon: Building2 },
      { label: 'Öğretim Elemanları',    href: '/dashboard/system-admin/instructors', icon: Users },
    ]},
    { label: 'Planlama', icon: CalendarDays, items: [
      { label: 'Ders Programları', href: '/dashboard/system-admin/schedule', icon: BookOpen },
      { label: 'Etkinlik Takvimi', href: '/dashboard/system-admin/events', icon: CalendarDays },
    ]},
  ]},
  mudur: { groups: [
    { label: 'Genel Görünüm', icon: Building2, defaultOpen: true, items: [
      { label: 'Bölümler',           href: '/dashboard/mudur/departments', icon: GraduationCap },
      { label: 'Öğretim Elemanları', href: '/dashboard/mudur/instructors', icon: Users },
      { label: 'Derslikler',         href: '/dashboard/mudur/classrooms', icon: Building2 },
    ]},
    { label: 'Personel İşlemleri', icon: Users, items: [
      { label: 'İzin Talepleri', href: '/dashboard/sekreter/leaves', icon: ClipboardList },
    ]},
    { label: 'Eğitim Planları', icon: BookOpen, items: [
      { label: 'Ders Programları', href: '/dashboard/mudur/schedule', icon: BookOpen },
    ]},
  ]},
  mudur_yardimcisi: { groups: [
    { label: 'Kurum Yönetimi', icon: LayoutDashboard, defaultOpen: true, items: [
      { label: 'Bölümler',           href: '/dashboard/mudur-yardimcisi/departments', icon: GraduationCap },
      { label: 'Eğitmen Listesi',    href: '/dashboard/mudur-yardimcisi/instructors', icon: Users },
      { label: 'Derslikler',         href: '/dashboard/mudur-yardimcisi/classrooms', icon: Building2 },
      { label: 'Kullanıcı Yönetimi', href: '/dashboard/mudur-yardimcisi/users', icon: UserCog },
    ]},
    { label: 'Akademik Birimler', icon: Target, items: [
      { label: 'Komisyon Yönetimi', href: '/dashboard/mudur-yardimcisi/commissions', icon: Target },
      { label: 'Staj İşlemleri',    href: '/dashboard/mudur-yardimcisi/internships', icon: Briefcase },
    ]},
    { label: 'Personel İşlemleri', icon: Users, items: [
      { label: 'Genel Talepler ve Dilekçe', href: '/dashboard/mudur-yardimcisi/requests', icon: FileText },
      { label: 'İzin Sistem Yönetimi',      href: '/dashboard/sekreter/leaves', icon: ClipboardList },
    ]},
    { label: 'Çizelgeler & Takvim', icon: CalendarDays, items: [
      { label: 'Tüm Ders Programları', href: '/dashboard/mudur-yardimcisi/schedule', icon: BookOpen },
      { label: 'Etkinlik Takvimi',     href: '/dashboard/mudur-yardimcisi/events', icon: CalendarDays },
    ]},
  ]},
  sekreter: { groups: [
    { label: 'Ders Yönetimi', icon: BookOpen, defaultOpen: true, items: [
      { label: 'Ders Programları',  href: '/dashboard/sekreter/schedule', icon: BookOpen },
      { label: 'Ders Takip Formu', href: '/dashboard/sekreter/lesson-tracking', icon: ClipboardCheck },
      { label: 'Ortak Dersler',    href: '/dashboard/sekreter/shared-courses', icon: Link2 },
      { label: 'Otomatik Program', href: '/dashboard/sekreter/auto-schedule', icon: Wand2 },
    ]},
    { label: 'Personel', icon: Users, items: [
      { label: 'İzin Talepleri (Onay)', href: '/dashboard/sekreter/leaves', icon: UserCog },
      { label: 'Hoca Kısıtları',        href: '/dashboard/sekreter/constraints', icon: ClipboardList },
      { label: 'Hoca Programları',      href: '/dashboard/sekreter/instructor-schedule', icon: User },
    ]},
    { label: 'Akademik Birimler', icon: GraduationCap, items: [
      { label: 'Bölümler',           href: '/dashboard/sekreter/departments', icon: GraduationCap },
      { label: 'Öğretim Elemanları', href: '/dashboard/sekreter/instructors', icon: Users },
    ]},
    { label: 'Derslikler', icon: Building2, items: [
      { label: 'Derslik Listesi',   href: '/dashboard/sekreter/classrooms', icon: Building2 },
      { label: 'Derslik Kullanımı', href: '/dashboard/sekreter/classroom-schedule', icon: CalendarDays },
    ]},
    { label: 'Kontrol & Raporlar', icon: AlertTriangle, items: [
      { label: 'Çakışma Raporu',    href: '/dashboard/sekreter/conflicts', icon: AlertTriangle },
      { label: 'Akademik Dönemler', href: '/dashboard/sekreter/periods', icon: Settings },
      { label: 'Etkinlik Takvimi',  href: '/dashboard/sekreter/events', icon: CalendarDays },
    ]},
  ]},
  bolum_baskani: {
    groups: [
      { label: 'Ders Yönetimi', icon: BookOpen, defaultOpen: true, items: [
        { label: 'Program Müfredatı',  href: '/dashboard/bolum-baskani/program-courses', icon: ClipboardList },
        { label: 'Ders Görevlendirme', href: '/dashboard/bolum-baskani/course-assignments', icon: UserCog },
        { label: 'Öğrenci Sayıları',   href: '/dashboard/bolum-baskani/student-enrollments', icon: Users },
        { label: 'Akıllı Yerleştirme', href: '/dashboard/bolum-baskani/auto-schedule', icon: Wand2 },
      ]},
      { label: 'Ders Programı', icon: CalendarDays, defaultOpen: true, items: [
        { label: 'Program Görüntüle',   href: '/dashboard/bolum-baskani/schedule', icon: BookOpen },
        { label: 'Derslik Programları', href: '/dashboard/bolum-baskani/classroom-schedule', icon: Building2 },
      ]},
      { label: 'Personel', icon: Users, items: [
        { label: 'Öğretim Elemanları', href: '/dashboard/bolum-baskani/instructors', icon: Users },
        { label: 'Hoca Kısıtları',     href: '/dashboard/bolum-baskani/instructor-constraints', icon: ClipboardList },
      ]},
    ],
    singleItems: [
      { label: 'Derslik Listesi',  href: '/dashboard/bolum-baskani/classrooms', icon: Building2 },
      { label: 'Etkinlik Takvimi', href: '/dashboard/bolum-baskani/events', icon: CalendarDays },
    ],
  },
  instructor: { groups: [
    { label: 'Akademik Planlama', icon: BookOpen, items: [
      { label: 'Ders Programım',   href: '/dashboard/instructor/schedule', icon: CalendarDays },
      { label: 'Ders Takip Formu', href: '/dashboard/instructor/lesson-tracking', icon: ClipboardCheck },
      { label: 'Kısıtlarım',       href: '/dashboard/instructor/constraints', icon: ClipboardList },
      { label: 'Etkinlik Takvimi', href: '/dashboard/instructor/events', icon: CalendarDays },
    ]},
    { label: 'Öğrenci & Birim', icon: Target, items: [
      { label: 'Komisyonlarım',     href: '/dashboard/instructor/commissions', icon: Target },
      { label: 'Staj Sicil Ekleme', href: '/dashboard/instructor/internships', icon: Briefcase },
    ]},
    { label: 'Personel İşlemleri', icon: Users, items: [
      { label: 'İzin Taleplerim',         href: '/dashboard/instructor/leaves', icon: ClipboardList },
      { label: 'Dilekçe & Evrak İstemi',  href: '/dashboard/instructor/requests', icon: FileText },
      { label: 'Birim İçi Değerlendirme', href: '/dashboard/instructor/evaluation', icon: FileQuestion },
    ]},
  ]},
}

// ── Sub-components ──────────────────────────────────────────────────────────

function NavGroupItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasActive = group.items.some(i => pathname === i.href)
  const [open, setOpen] = useState(group.defaultOpen || hasActive)

  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
        style={{ color: hasActive ? '#B71C1C' : 'rgba(255, 255, 255, 0.35)' }}
      >
        <span className="flex items-center gap-2">
          <group.icon className="h-3.5 w-3.5" />
          {group.label}
        </span>
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', opacity: 0.5 }}
        />
      </button>

      <div className={clsx(
        'overflow-hidden transition-all duration-200 ease-in-out',
        open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="mt-0.5 space-y-0.5 pl-2">
          {group.items.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={active
                  ? { background: '#B71C1C', color: '#FFFFFF', fontWeight: 600 }
                  : { color: '#c9d1e0' }
                }
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.07)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <item.icon className={clsx("h-4 w-4 flex-shrink-0", active ? "opacity-100" : "opacity-80")} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SingleNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
      style={active
        ? { background: '#B71C1C', color: '#FFFFFF', fontWeight: 600 }
        : { color: '#c9d1e0' }
      }
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.07)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <item.icon className={clsx("h-4 w-4 flex-shrink-0", active ? "opacity-100" : "opacity-80")} />
      <span>{item.label}</span>
    </Link>
  )
}

// ── Ana Sidebar ─────────────────────────────────────────────────────────────

interface SidebarProps {
  role: UserRole
  userName: string
  departmentName?: string
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname  = usePathname()
  const [open, setOpen] = useState(false)
  const { groups: navGroups, singleItems } = NAV_CONFIG[role]
  const meta      = ROLE_META[role]
  const dashboardLink = ROLE_ROUTES[role]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Çıkış yapıldı')
    window.location.href = '/auth/login'
  }

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#1a1f2e' }}>

      {/* Logo Alanı */}
      <div className="flex items-center gap-3 px-5 h-16 border-b flex-shrink-0" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#B71C1C' }}
        >
          <span className="text-white font-black text-xs tracking-tight">MYO</span>
        </div>
        <div>
          <p className="text-sm font-bold leading-none" style={{ color: '#FFFFFF' }}>MYO Portal</p>
          <p className="text-[10px] mt-0.5 tracking-wider uppercase" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
            Rumeli Üniversitesi
          </p>
        </div>
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">

        {/* Dashboard linki */}
        <SingleNavItem item={{ label: 'Dashboard', href: dashboardLink, icon: LayoutDashboard }} pathname={pathname} />

        <div className="my-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} />

        {navGroups.map(group => (
          <NavGroupItem key={group.label} group={group} pathname={pathname} />
        ))}

        {singleItems && (
          <>
            <div className="my-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} />
            {singleItems.map(item => (
              <SingleNavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Kullanıcı Alanı */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(183, 28, 28, 0.2)', color: '#FFFFFF', border: '1px solid rgba(183, 28, 28, 0.4)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: '#FFFFFF' }}>{userName}</p>
            <p className="text-[10px] truncate font-medium" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{meta.label}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(220, 38, 38, 0.15)'
            ;(e.currentTarget as HTMLElement).style.color = '#EF4444'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(255, 255, 255, 0.5)'
          }}
        >
          <LogOut className="w-4 h-4" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobil hamburger */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-xl transition-colors"
        style={{ background: '#FFFFFF', border: '1px solid #E4E7EE', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        {open ? <X className="w-5 h-5" style={{ color: '#374151' }} /> : <Menu className="w-5 h-5" style={{ color: '#374151' }} />}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.25)' }}
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={clsx(
        'layout-sidebar transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <SidebarContent />
      </aside>
    </>
  )
}