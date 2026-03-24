"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Edit3 } from 'lucide-react'

interface InstructorInternshipActionsProps {
  internshipId: string
  currentStatus: string
}

export default function InstructorInternshipActions({ internshipId, currentStatus }: InstructorInternshipActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
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

  if (currentStatus === 'draft' || currentStatus === 'revision') {
    return (
      <button 
        onClick={() => handleStatusChange('submitted')}
        disabled={isLoading}
        className="inline-flex items-center text-blue-400 hover:text-blue-300 text-xs font-medium bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20 gap-1 ml-2"
        title="Yönetici onayı için gönder"
      >
        <Send className="h-3 w-3" /> {isLoading ? 'Gönderiliyor...' : 'Onaya Gönder'}
      </button>
    )
  }

  return null
}
