import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Target, CalendarPlus, FileText, ArrowLeft, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InstructorCommissionsPage() {
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
        <Target className="h-12 w-12 text-rose-500/50 mb-4" />
        <h2 className="text-xl font-semibold text-white">Eğitmen Profili Bulunamadı</h2>
      </div>
    )
  }

  // Hocanın üye olduğu komisyonları ve atanma rolünü çek (V1 Mantığı)
  const { data: myCommissions } = await supabase
    .from('commission_members')
    .select(`
      id,
      role,
      is_active,
      commission:commissions (
         id,
         name,
         type,
         drive_folder_url
      )
    `)
    .eq('instructor_id', instructor.id)
    .eq('is_active', true)

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'baskan': return <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20">Komisyon Başkanı</span>
      case 'raportör': return <span className="inline-flex items-center rounded-md bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-400 ring-1 ring-inset ring-cyan-500/20">Raportör</span>
      default: return <span className="inline-flex items-center rounded-md bg-gray-500/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-500/20">Üye</span>
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Komisyon Görevlerim
          </h1>
          <p className="mt-1 text-sm text-gray-500">Üyesi olduğunuz akademik/idari komisyonları ve dokümanlarını yönetin.</p>
        </div>
        
        <Link 
          href="/dashboard/instructor/commissions/meeting-request"
          className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:brightness-110 hover:shadow-cyan-500/30 active:scale-95"
        >
          <CalendarPlus className="mr-2 h-4 w-4" /> Toplantı İsteği
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {!myCommissions || myCommissions.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-white/5 card/30 p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-500/50 mb-3" />
            <h3 className="text-lg font-medium text-white">Aktif Görev Yok</h3>
            <p className="mt-1 text-sm text-gray-400">Şu anda atandığınız aktif bir komisyon görevi bulunmamaktadır.</p>
          </div>
        ) : (
          myCommissions.map((member: any) => (
            <div key={member.id} className="relative rounded-2xl border border-white/5 card/30 p-6 transition-all hover:border-cyan-500/30">
              <div className="flex items-start justify-between gap-4">
                <div className="rounded-xl card p-3">
                  <Target className="h-6 w-6 text-cyan-400" />
                </div>
                {getRoleBadge(member.role)}
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-white">{member.commission.name}</h3>
                <p className="mt-1 text-sm text-gray-500 capitalize">{member.commission.type.replace('_', ' ')}</p>
              </div>

              <div className="mt-6 border-t border-white/5 pt-4">
                {member.commission.drive_folder_url ? (
                   <a target="_blank" rel="noopener noreferrer" href={member.commission.drive_folder_url} className="inline-flex w-full items-center justify-center rounded-xl card px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:card hover:text-white border border-white/5">
                     <FileText className="mr-2 h-4 w-4" /> Ortak Klasör
                   </a>
                ) : (
                   <button disabled className="inline-flex w-full items-center justify-center rounded-xl card px-4 py-2 text-sm font-medium text-gray-500 border border-white/5 cursor-not-allowed">
                     Evraklar (Bağlantı Yok)
                   </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
