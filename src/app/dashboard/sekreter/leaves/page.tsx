'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'

export default function LeavesManagementPage() {
  const supabase = createClient()
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processLoading, setProcessLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaves()
  }, [])

  const fetchLeaves = async () => {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        instructor:instructors(first_name, last_name, academic_title, email),
        approver:profiles!leave_requests_approved_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (data) setLeaves(data)
    setLoading(false)
  }

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setProcessLoading(id)
    try {
      const res = await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })

      if (res.ok) {
        await fetchLeaves() // Yenile
      } else {
        alert('İşlem başarısız.')
      }
    } catch (err: any) {
      alert('Bir hata oluştu.')
    } finally {
      setProcessLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3"/> Onaylandı</span>
      case 'rejected': return <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20"><XCircle className="mr-1 h-3 w-3"/> Reddedildi</span>
      case 'pending':
      default: return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20"><Clock className="mr-1 h-3 w-3"/> Bekliyor</span>
    }
  }

  const getLeaveTypeStr = (type: string) => {
    switch(type) {
      case 'annual': return 'Yıllık İzin'
      case 'sick': return 'Hastalık/Rapor'
      case 'excuse': return 'Mazeret İzni'
      case 'conference': return 'Akademik/Konferans'
      default: return 'Diğer'
    }
  }

  if (loading) {
     return <div className="text-gray-400 p-8 text-center animate-pulse">İzin talepleri yükleniyor...</div>
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Personel İzin Yönetimi
          </h1>
          <p className="mt-1 text-sm text-gray-500">Tüm öğretim elemanlarının izin taleplerini onaylayın veya reddedin.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-gray-800/30 overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-900/50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Öğretim Elemanı</th>
                <th className="px-6 py-4 font-medium">İzin Türü</th>
                <th className="px-6 py-4 font-medium">Tarih Aralığı</th>
                <th className="px-6 py-4 font-medium">Mazeret/Açıklama</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                     <AlertTriangle className="mx-auto mb-3 h-8 w-8 opacity-50" />
                     Sistemde kayıtlı izin talebi bulunmuyor.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {leave.instructor?.academic_title || ''} {leave.instructor?.first_name} {leave.instructor?.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{leave.instructor?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-300">
                      {getLeaveTypeStr(leave.leave_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(leave.start_date).toLocaleDateString('tr-TR')} - {new Date(leave.end_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate" title={leave.reason || ''}>
                      {leave.reason || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(leave.status)}
                      {leave.status !== 'pending' && leave.approver && (
                        <div className="text-[10px] text-gray-500 mt-1" title="İşlem Yapan">({leave.approver.full_name})</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleAction(leave.id, 'approved')}
                            disabled={processLoading === leave.id}
                            className="inline-flex items-center justify-center rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleAction(leave.id, 'rejected')}
                            disabled={processLoading === leave.id}
                            className="inline-flex items-center justify-center rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            Reddet
                          </button>
                        </div>
                      ) : (
                         <span className="text-xs text-gray-600 italic">İşlem Tamamlandı</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
