import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Briefcase, FileText, CheckCircle2, Clock, MapPin } from 'lucide-react'
import AdminInternshipActions from '@/components/internship/AdminInternshipActions'

export const dynamic = 'force-dynamic'

export default async function AdminInternshipsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: internships } = await supabase
    .from('internship_records')
    .select(`
      *,
      supervisor:instructors(first_name, last_name, academic_title)
    `)
    .order('created_at', { ascending: false })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20"><CheckCircle2 className="mr-1 h-3 w-3"/> Yayında</span>
      case 'approved': return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3"/> Onaylandı</span>
      case 'rejected': return <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">Reddedildi</span>
      case 'revision': return <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400 border border-orange-500/20">Revizyon Bekliyor</span>
      case 'submitted': return <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400 border border-blue-500/20">Onaya Gönderildi</span>
      case 'draft': return <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-semibold text-gray-400 border border-gray-500/20">Taslak</span>
      case 'pending': return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20"><Clock className="mr-1 h-3 w-3"/> İnceleniyor</span>
      default: return null
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Öğrenci Staj İşlemleri (Tümü)
          </h1>
          <p className="mt-1 text-sm text-gray-500">Tüm programlardaki staj başvurularını, firma kabullerini ve danışman değerlendirmelerini izleyin.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 card/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="card text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Öğrenci Bilgisi</th>
                <th className="px-6 py-4 font-medium">Danışman (Sorumlu)</th>
                <th className="px-6 py-4 font-medium">Kurum / Firma</th>
                <th className="px-6 py-4 font-medium">Süre/Gün</th>
                <th className="px-6 py-4 font-medium">Harf Notu</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!internships || internships.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                     <Briefcase className="mx-auto mb-3 h-8 w-8 opacity-50" />
                     Sistemde kayıtlı bir staj bulunmuyor.
                  </td>
                </tr>
              ) : (
                internships.map((intern) => (
                  <tr key={intern.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{intern.student_name}</div>
                      <div className="text-xs text-gray-500">No: {intern.student_number}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-300">
                       {intern.supervisor ? `${intern.supervisor.academic_title} ${intern.supervisor.first_name} ${intern.supervisor.last_name}` : 'Atanmamış'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-cyan-500" />
                        {intern.company_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {intern.total_days} İş Günü
                    </td>
                    <td className="px-6 py-4">
                      {intern.grade ? (
                         <span className="font-bold text-cyan-400">{intern.grade}</span>
                      ) : (
                         <span className="text-gray-500 italic text-xs">Puanlanmadı</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(intern.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end items-center">
                         <button className="text-cyan-400 hover:text-cyan-300 text-xs font-medium bg-cyan-500/10 px-3 py-1.5 rounded-lg transition-colors border border-cyan-500/20">
                           Dosya
                         </button>
                         <AdminInternshipActions internshipId={intern.id} currentStatus={intern.status} />
                       </div>
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
