'use client'

import { Bell, Search } from 'lucide-react'
import { useState } from 'react'

interface TopBarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const [search, setSearch] = useState('')

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 px-6 py-3.5 border-b"
            style={{ background: 'rgba(7,9,15,0.9)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)', height: 'var(--topbar-h)' }}>
      <div className="flex-1 min-w-0">
        <h1 className="page-title truncate">{title}</h1>
        {subtitle && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {actions}
        <button className="relative p-2 rounded-lg hover:bg-[#0d1220] transition-colors text-[#64748b] hover:text-white border border-transparent hover:border-[#1a2540]">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  )
}
