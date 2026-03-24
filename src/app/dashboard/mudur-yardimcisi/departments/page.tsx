import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GraduationCap, Users, BookOpen } from 'lucide-react'

export default async function MYDepartmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: departments } = await supabase
    .from('departments')
    .select('*, head:profiles!fk_dept_head(full_name)')
    .eq('is_active', true)
    .order('name')

  const { data: programs } = await supabase.from('programs').select('id, name, department_id').eq('is_active', true)
  const { data: instructors } = await supabase.from('instructors').select('department_id').eq('is_active', true)

  const instrCounts: Record<string, number> = {}
  instructors?.forEach((i: any) => { instrCounts[i.department_id] = (instrCounts[i.department_id] ?? 0) + 1 })

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900/40 via-pink-900/20 to-gray-900 p-8 border border-rose-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <GraduationCap className="w-48 h-48 text-rose-400" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400">
            Akademik Bölümler
          </h1>
          <p className="mt-2 text-gray-400">MYO bünyesindeki tüm bölümler, bölüm başkanları ve program dağılımları</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments?.map(d => {
          const deptProgs = programs?.filter(p => p.department_id === d.id) || []
          return (
            <div key={d.id} className="glass-card p-5 rounded-xl border border-gray-700/50 flex flex-col">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 font-bold text-lg flex items-center justify-center border border-rose-500/20 flex-shrink-0">
                  {d.short_code}
                </div>
                <div>
                  <h3 className="font-bold text-white">{d.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <GraduationCap className="w-3 h-3" /> Başkan: {(d.head as any)?.full_name || <span className="text-red-400/80 italic">Atanmamış</span>}
                  </p>
                </div>
              </div>
              {deptProgs.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {deptProgs.map(p => (
                    <span key={p.id} className="text-[11px] px-2 py-0.5 rounded bg-gray-800/60 text-gray-300 border border-gray-700/50 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-cyan-500" /> {p.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto pt-3 border-t border-gray-800/60 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {instrCounts[d.id] ?? 0} Eğitmen</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {deptProgs.length} Program</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
