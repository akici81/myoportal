import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, Plus, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'
import InstructorInternshipActions from '@/components/internship/InstructorInternshipActions'

export const dynamic = 'force-dynamic'

export default async function InstructorInternshipsPage() {
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
        <Briefcase className="h-12 w-12 text-rose-500/50 mb-4" />
        <h2 className="text-xl font-semibold text-default" style={{ color: 'var(--text)' }}>Eğitmen Profili Bulunamadı</h2>
      </div>
    )
  }

  // Eğitmenin supervisor (danışman) olduğu staj kayıtlarını getir
  const { data: rawInternships } = await supabase
    .from('internship_records')
    .select('*')
    .eq('supervisor_id', instructor.id)
    .order('created_at', { ascending: false })

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)

  const deptMap: Record<string, { name: string }> = {}
  departments?.forEach(d => { deptMap[d.id] = { name: d.name } })

  const internships = (rawInternships ?? []).map(r => ({
    ...r,
    department: deptMap[r.department_id] || null,
  }))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return <span className="inline-flex items-center rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-600/20"><CheckCircle2 className="mr-1 h-3 w-3"/> Yayında</span>
      case 'approved': return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3"/> Onaylandı</span>
      case 'rejected': return <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">Reddedildi</span>
      case 'revision': return <span className="inline-flex items-center rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400 border border-orange-500/20">Revizyon</span>
      case 'submitted': return <span className="inline-flex items-center rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-600/20">Gönderildi</span>
      case 'draft': return <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-semibold text-muted border border-gray-500/20">Taslak</span>
      case 'pending':
      default: return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">Değerlendirmede</span>
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-default flex items-center gap-3" style={{ color: 'var(--text)' }}>
            Öğrenci Staj Sicili
          </h1>
          <p className="mt-1 text-sm text-gray-500">Danışmanlığını yürüttüğünüz öğrencilerin staj başarı ve evrak notlarını yönetin.</p>
        </div>
        
        <button 
          className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-default shadow-lg transition-all hover:brightness-110 hover:shadow-cyan-500/30 active:scale-95" style={{ color: 'var(--text)' }}
          title="Modül geliştirme aşamasındadır"
        >
          <Plus className="mr-2 h-4 w-4" /> Yeni Stajyer Ekle
        </button>
      </div>

      <div className="rounded-2xl border border-white/5 card/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="card text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Öğrenci Bilgisi</th>
                <th className="px-6 py-4 font-medium">Staj Firması</th>
                <th className="px-6 py-4 font-medium">Süre (Gün)</th>
                <th className="px-6 py-4 font-medium">Değerlendirme Notu</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-right">Dosya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!internships || internships.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                     <AlertTriangle className="mx-auto mb-3 h-8 w-8 opacity-50" />
                     Sorumluluğunuzda kayıtlı bir staj dosyası bulunmuyor.
                  </td>
                </tr>
              ) : (
                internships.map((internship) => (
                  <tr key={internship.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="font-medium text-default">{internship.student_name}</div>
                      <div className="text-xs text-gray-500">No: {internship.student_number} | Dönem: {internship.academic_year}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-cyan-400">
                      {internship.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(internship.start_date).toLocaleDateString('tr-TR')} - {new Date(internship.end_date).toLocaleDateString('tr-TR')}
                      <div className="text-xs text-gray-500 mt-0.5">({internship.total_days} İş Günü)</div>
                    </td>
                    <td className="px-6 py-4">
                      {internship.score ? (
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-default">{internship.score} / 100</span>
                           <span className="text-xs text-gray-500">[{internship.grade}]</span>
                        </div>
                      ) : (
                         <span className="text-gray-500 italic">Not Girilmedi</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(internship.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {internship.file_url ? (
                          <a href={internship.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-cyan-400 hover:text-cyan-300 transition-colors">
                             <FileText className="h-4 w-4 mr-1" /> PDF
                          </a>
                        ) : (
                          <span className="text-gray-500 text-xs">Yok</span>
                        )}
                        <InstructorInternshipActions internshipId={internship.id} currentStatus={internship.status} />
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
