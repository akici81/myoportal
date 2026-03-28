import Link from 'next/link'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'

export interface StatItem {
  label: string
  value: number
  icon: LucideIcon
  iconBg: string
  iconColor: string
  topBar: string
  href?: string
}

export interface ActionItem {
  label: string
  href: string
  icon: LucideIcon
  description: string
  accentColor: string
  accentBg: string
  hoverShadow: string
}

interface DashboardPageProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  stats: StatItem[]
  actions: ActionItem[]
  children?: React.ReactNode
}

export function DashboardPage({ title, subtitle, badge, stats, actions, children }: DashboardPageProps) {
  const cols = Math.min(stats.length, 4)
  const gridCols =
    cols === 2 ? 'sm:grid-cols-2' :
    cols === 3 ? 'sm:grid-cols-3' :
                 'sm:grid-cols-2 lg:grid-cols-4'

  return (
    <div className="space-y-8">
      <TopBar title={title} subtitle={subtitle} actions={badge} />

      <div className={`grid gap-4 ${gridCols}`}>
        {stats.map((stat, i) => {
          const inner = (
            <div className={`mb-4 h-1 w-full rounded-full bg-gradient-to-r ${stat.topBar} opacity-60`} />
          )
          const card = (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{stat.label}</p>
                <p className="mt-1.5 text-3xl font-bold" style={{ color: 'var(--text)' }}>{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconBg} ring-1 ring-white/5`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          )
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="stat-card overflow-hidden block" style={{ animationDelay: `${i * 0.08}s` }}>
              {inner}{card}
            </Link>
          ) : (
            <div key={stat.label} className="stat-card overflow-hidden" style={{ animationDelay: `${i * 0.08}s` }}>
              {inner}{card}
            </div>
          )
        })}
      </div>

      <div className="animate-in-delay-2">
        <h2 className="mb-4 text-base font-semibold" style={{ color: 'var(--text)' }}>Hızlı İşlemler</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action, i) => (
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
              <p className="mt-1 text-sm line-clamp-2" style={{ color: 'var(--muted)' }}>{action.description}</p>
              <div className={`mt-auto pt-4 flex items-center text-sm font-medium ${action.accentColor}`}>
                Aç <ArrowRight className="ml-1 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {children}
    </div>
  )
}
