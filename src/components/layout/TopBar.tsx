'use client'

import { Bell } from 'lucide-react'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-4 px-6"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid #E4E7EE',
        height: 'var(--topbar-h)',
      }}
    >
      <div className="flex-1 min-w-0">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: '#9CA3AF' }}>{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {actions}
        <button
          className="relative p-2 rounded-xl transition-colors"
          style={{ color: '#9CA3AF' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#F7F8FA'
            ;(e.currentTarget as HTMLElement).style.color = '#374151'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = '#9CA3AF'
          }}
        >
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#B71C1C' }}
          />
        </button>
      </div>
    </header>
  )
}