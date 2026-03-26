import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, CheckCircle2, Clock, Search, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminRequestsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: requests } = await supabase
    .from('general_requests')
    .select(`
      *,
      requester:profiles!general_requests_requester_id_fkey(full_name, role)
    `)
    .order('created_at', { ascending: false })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="mr-1 h-3 w-3"/> Onaylandı / Çözüldü</span>
      case 'rejected': return <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20"><XCircle className="mr-1 h-3 w-3"/> Reddedildi</span>
      case 'in_review': return <span className="inline-flex items-center rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-semibold text-red-400 border border-red-600/20"><Search className="mr-1 h-3 w-3"/> İnceleniyor</span>
      case 'pending': 
      default: return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20"><Clock className="mr-1 h-3 w-3"/> Yeni Talep</span>
    }
  }

  const getCategoryStr = (cat: string) => {
     switch(cat) {
        case 'belge': return 'Belge Talebi'
        case 'muafiyet': return 'Muafiyet Kararı'
        case 'diger': return 'Diğer / Çeşitli'
        default: return 'Genel'
     }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-default flex items-center gap-3" style={{ color: 'var(--text)' }}>
            Genel Talepler ve Dilekçe Yönetimi
          </h1>
          <p className="mt-1 text-sm text-gray-500">Personelden gelen dijital dilekçeleri, belge isteklerini ve görüşleri yönetin.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 card/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-muted">
            <thead className="card text-xs uppercase text-gray-500">
              <tr>
                <th className="px-6 py-4 font-medium">Talep Eden (Profil)</th>
                <th className="px-6 py-4 font-medium">Kategori</th>
                <th className="px-6 py-4 font-medium">Konu / Başlık</th>
                <th className="px-6 py-4 font-medium">Tarih</th>
                <th className="px-6 py-4 font-medium">Durum</th>
                <th className="px-6 py-4 font-medium text-right">Eylem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {!requests || requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                     <FileText className="mx-auto mb-3 h-8 w-8 opacity-50" />
                     Gelen kutusu boş.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="font-medium text-default">{req.requester?.full_name}</div>
                      <div className="text-xs text-gray-500">{req.requester?.role.replace('_', ' ').toUpperCase()}</div>
                    </td>
                    <td className="px-6 py-4 text-cyan-400 font-medium">
                       {getCategoryStr(req.category)}
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <div className="font-medium text-default mb-1 truncate">{req.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-2" title={req.description}>{req.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-muted">
                      {new Date(req.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button className="inline-flex items-center justify-center rounded-lg card px-3 py-1.5 text-xs font-medium text-muted hover:text-default hover:card border border-white/5 shadow-sm">
                         Detayı İncele
                       </button>
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
