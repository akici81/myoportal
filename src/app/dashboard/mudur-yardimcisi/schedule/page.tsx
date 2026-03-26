import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookOpen, Building2, Users, CalendarDays } from 'lucide-react'
import Link from 'next/link'

export default async function MYSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: period } = await supabase.from('academic_periods').select('*').eq('is_active', true).maybeSingle()

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, short_code')
    .eq('is_active', true)
    .order('name')

  // Her bölümün program sayısını hesapla
  const { data: programs } = await supabase.from('programs').select('id, name, department_id').eq('is_active', true)

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-indigo-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12"><CalendarDays className="w-48 h-48 text-red-400" /></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-default" style={{ color: 'var(--text)' }}>Tüm Ders Programları</h1>
          <p className="mt-2 text-muted">
            {period ? `${period.academic_year} · ${period.semester === 1 ? 'Güz' : 'Bahar'} Dönemi` : 'Aktif dönem bulunamadı'}
          </p>
        </div>
      </div>

      {!period ? (
        <div className="card py-16 text-center rounded-xl border">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-600" />
          <p className="font-medium text-default">Aktif akademik dönem bulunamadı</p>
          <p className="text-sm text-muted mt-1">Lütfen Sekreterlikten bir dönem aktif edilmesini isteyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments?.map(d => {
            const deptProgs = programs?.filter(p => p.department_id === d.id) || []
            return (
              <div key={d.id} className="card p-5 rounded-xl border flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-600/10 text-red-400 font-bold text-lg flex items-center justify-center border border-red-600/20 flex-shrink-0">
                    {d.short_code}
                  </div>
                  <div>
                    <h3 className="font-bold text-default">{d.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{deptProgs.length} Program</p>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {deptProgs.map(p => (
                    <Link key={p.id} href={`/dashboard/sekreter/schedule?program=${p.id}`}
                      className="flex items-center gap-2 text-sm text-muted hover:text-default p-2 rounded-lg hover:card/50 transition group">
                      <BookOpen className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition" />
                      {p.name}
                    </Link>
                  ))}
                  {deptProgs.length === 0 && (
                    <p className="text-xs text-gray-600 italic px-2">Kayıtlı program yok</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
