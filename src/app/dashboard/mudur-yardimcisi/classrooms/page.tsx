import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Building2 } from 'lucide-react'

export default async function MYClassroomsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*')
    .eq('is_active', true)
    .order('name')

  const typeLabel: Record<string, string> = {
    classroom: 'Sınıf', lab: 'Laboratuvar', kitchen: 'Mutfak',
    amphitheater: 'Amfi', workshop: 'Atölye',
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-teal-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <Building2 className="w-48 h-48 text-teal-400" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-default" style={{ color: 'var(--text)' }}>
            Derslik Envanteri
          </h1>
          <p className="mt-2 text-muted">MYO bünyesindeki tüm fiziksel ve sanal derslikler</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classrooms?.map(c => (
          <div key={c.id} className="card p-5 rounded-xl border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 border border-teal-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-default">{c.name}</h3>
                <p className="text-xs text-gray-500">{c.building || 'Ana Bina'} {c.floor ? `· Kat ${c.floor}` : ''}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-medium">{typeLabel[c.type] || c.type}</span>
              <span className="px-2 py-0.5 rounded bg-gray-700 text-muted">Kapasite: {c.capacity || '?'}</span>
              {c.has_projector && <span className="px-2 py-0.5 rounded bg-red-600/10 text-red-400">Projeksiyon</span>}
              {c.has_smartboard && <span className="px-2 py-0.5 rounded bg-red-600/10 text-red-400">Akıllı Tahta</span>}
              {c.has_computer && <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">PC: {c.computer_count || '?'}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
