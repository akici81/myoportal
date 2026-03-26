import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, AlertTriangle, ArrowLeft, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InstructorLeavesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: instructor } = await supabase
    .from('instructors')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!instructor) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in">
        <AlertTriangle className="h-12 w-12 text-rose-500/50 mb-4" />
        <h2 className="text-xl font-semibold text-white">Eğitmen Profili Bulunamadı</h2>
        <p className="mt-2 text-gray-400">İzin talep edebilmek için sistemde eğitmen olarak kayıtlı olmalısınız.</p>
        <Link href="/dashboard/instructor" className="mt-6 text-cyan-400 hover:text-cyan-300 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Ana Sayfaya Dön
        </Link>
      </div>
    )
  }

  const { data: leaves } = await supabase
    .from('leave_requests')
    .select(`
      *,
      approver:profiles!leave_requests_approved_by_fkey(full_name)
    `)
    .eq('instructor_id', instructor.id)
    .order('created_at', { ascending: false })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">Onaylandı</span>
      case 'rejected': return <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">Reddedildi</span>
      case 'pending':
      default: return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">Bekliyor</span>
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

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/instructor" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard'a Dön
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            İzin Taleplerim
          </h1>
          <p className="mt-1 text-sm text-gray-500">Geçmiş izin hareketlerinizi görüntüleyin ve yeni talep oluşturun.</p>
        </div>
        
        <Link 
          href="/dashboard/instructor/leaves/new"
          className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:brightness-110 hover:shadow-cyan-500/30 active:scale-95"
        >
          <Plus className="mr-2 h-4 w-4" /> Yeni İzin Talebi
        </Link>
      </div>

      <div className="rounded-2xl border border-white/5 card/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="card text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">İzin Türü</th>
                <th className="px-6 py-4 font-medium">Tarih Aralığı</th>
                <th className="px-6 py-4 font-medium">Mazeret/Açıklama</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium">İşlem Yapan</th>
                <th className="px-6 py-4 font-medium">Talep Tarihi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!leaves || leaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                     <CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-50" />
                     Henüz bir izin talebiniz bulunmuyor.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-medium text-white">
                      {getLeaveTypeStr(leave.leave_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(leave.start_date).toLocaleDateString('tr-TR')} - {new Date(leave.end_date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={leave.reason || ''}>
                      {leave.reason || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(leave.status)}
                    </td>
                    <td className="px-6 py-4">
                      {leave.approver ? leave.approver.full_name : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(leave.created_at).toLocaleDateString('tr-TR')}
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
