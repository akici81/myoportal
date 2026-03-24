"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, CheckCircle, RefreshCcw, Send, Settings, XCircle } from 'lucide-react'

interface AdminInternshipActionsProps {
  internshipId: string
  currentStatus: string
}

export default function AdminInternshipActions({ internshipId, currentStatus }: AdminInternshipActionsProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    setIsOpen(false)
    try {
      const res = await fetch('/api/submissions/update-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_type: 'internship', entity_id: internshipId, new_status: newStatus })
      })
      if (!res.ok) throw new Error('Güncelleme başarısız')
      router.refresh()
    } catch (err) {
      console.error(err)
      alert('Durum güncellenemedi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative inline-block text-left">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="inline-flex items-center text-cyan-400 hover:text-cyan-300 text-xs font-medium bg-cyan-500/10 px-3 py-1.5 rounded-lg transition-colors border border-cyan-500/20 gap-1 ml-2"
      >
        {isLoading ? '...' : <><MoreVertical className="h-3 w-3" /> İşlem</>}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-gray-800 border border-white/10 shadow-xl z-20 py-1 flex flex-col">
            {currentStatus !== 'approved' && currentStatus !== 'published' && (
              <button onClick={() => handleStatusChange('approved')} className="px-4 py-2 text-xs text-left text-emerald-400 hover:bg-white/5 flex items-center gap-2">
                <CheckCircle className="h-3 w-3" /> Onayla
              </button>
            )}
            {currentStatus !== 'revision' && currentStatus !== 'published' && (
              <button onClick={() => handleStatusChange('revision')} className="px-4 py-2 text-xs text-left text-amber-400 hover:bg-white/5 flex items-center gap-2">
                <RefreshCcw className="h-3 w-3" /> Revizyona Gönder
              </button>
            )}
            {currentStatus === 'approved' && (
              <button onClick={() => handleStatusChange('published')} className="px-4 py-2 text-xs text-left text-purple-400 hover:bg-white/5 flex items-center gap-2">
                <Send className="h-3 w-3" /> Yayınla
              </button>
            )}
            {currentStatus !== 'rejected' && currentStatus !== 'published' && (
              <button onClick={() => handleStatusChange('rejected')} className="px-4 py-2 text-xs text-left text-rose-400 hover:bg-white/5 flex items-center gap-2">
                <XCircle className="h-3 w-3" /> Reddet
              </button>
            )}
            {currentStatus === 'revision' && (
              <button onClick={() => handleStatusChange('submitted')} className="px-4 py-2 text-xs text-left text-blue-400 hover:bg-white/5 flex items-center gap-2">
                <Settings className="h-3 w-3" /> İncelemeye Al
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
