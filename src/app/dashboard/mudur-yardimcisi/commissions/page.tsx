import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Target, Users, Settings, Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminCommissionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Toplam komisyonları çek
  const { data: commissions } = await supabase
    .from('commissions')
    .select(`
      *,
      members:commission_members(count)
    `)
    .order('name', { ascending: true })

  // Bekleyen toplantı isteklerini çek
  const { data: pendingMeetings } = await supabase
    .from('meeting_requests')
    .select(`
      *,
      commission:commissions(name),
      requester:profiles!meeting_requests_requested_by_fkey(full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Akademik Komisyon Yönetimi
          </h1>
          <p className="mt-1 text-sm text-gray-500">MYO bünyesindeki tüm komisyonları, üye dağılımlarını ve toplantı taleplerini denetleyin.</p>
        </div>
        <button className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-400 active:scale-95 transition-all">
          <Plus className="mr-2 h-4 w-4" /> Yeni Komisyon Kur
        </button>
      </div>

      {pendingMeetings && pendingMeetings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-xl">
           <h2 className="text-lg font-semibold text-amber-400 flex items-center mb-4">
             <Target className="mr-2 h-5 w-5" />
             Onay Bekleyen Toplantı İstekleri ({pendingMeetings.length})
           </h2>
           <div className="space-y-3">
             {pendingMeetings.map((meeting: any) => (
                <div key={meeting.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-900/50 p-4 border border-white/5">
                   <div>
                     <h3 className="font-medium text-white">{meeting.title}</h3>
                     <p className="text-sm text-gray-400 mt-1">{meeting.commission.name} | İsteyen: {meeting.requester.full_name}</p>
                     <p className="text-xs text-gray-500 mt-0.5">Tarih: {new Date(meeting.proposed_date).toLocaleDateString('tr-TR')} - {meeting.proposed_time}</p>
                   </div>
                   <div className="flex gap-2">
                     <button className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">Onayla</button>
                     <button className="rounded-lg bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 border border-rose-500/20 hover:bg-rose-500/20">Reddet</button>
                   </div>
                </div>
             ))}
           </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {commissions?.map((com) => (
          <div key={com.id} className="relative rounded-2xl border border-white/5 bg-gray-800/30 p-6 backdrop-blur-xl group hover:border-cyan-500/30 transition-all cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-gray-900/50 p-3 ring-1 ring-inset ring-white/5 group-hover:ring-cyan-500/30">
                <Target className="h-6 w-6 text-cyan-400" />
              </div>
              <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                {com.members[0].count} Aktif Üye
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-white">{com.name}</h3>
              <p className="mt-1 text-sm text-gray-500 capitalize">Komisyon Türü: {com.type.replace('_',' ')}</p>
            </div>
            <div className="mt-6 flex gap-2">
               <button className="flex-1 inline-flex justify-center items-center rounded-lg bg-gray-900/50 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800">
                 <Users className="mr-2 h-4 w-4" /> Üyeler
               </button>
               <button className="flex-1 inline-flex justify-center items-center rounded-lg bg-gray-900/50 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800">
                 <Settings className="mr-2 h-4 w-4" /> Ayarlar
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
