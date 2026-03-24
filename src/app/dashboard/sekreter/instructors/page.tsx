import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Mail, Phone } from 'lucide-react'

export default async function SekreterInstructorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rawInstructors } = await supabase
    .from('instructors')
    .select('id, full_name, title, department_id, email, phone')
    .eq('is_active', true)
    .order('full_name')

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, short_code')
    .eq('is_active', true)

  const deptMap: Record<string, { name: string; short_code: string }> = {}
  departments?.forEach(d => { deptMap[d.id] = { name: d.name, short_code: d.short_code } })

  const instructors = (rawInstructors ?? []).map(inst => ({
    ...inst,
    department: deptMap[inst.department_id] || null,
  }))

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-sky-900/20 to-gray-900 p-8 border border-blue-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12"><Users className="w-48 h-48 text-blue-400" /></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-400">Öğretim Elemanları</h1>
          <p className="mt-2 text-gray-400">Tüm eğitmenlerin listesi ve iletişim bilgileri</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-800/30 backdrop-blur-xl">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-900/50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-4">Ad Soyad</th>
              <th className="px-6 py-4">Unvan</th>
              <th className="px-6 py-4">Bölüm</th>
              <th className="px-6 py-4">İletişim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {instructors.map(inst => (
              <tr key={inst.id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4 font-medium text-white">{inst.full_name}</td>
                <td className="px-6 py-4 text-gray-400">{inst.title || '—'}</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-medium">{inst.department?.short_code || '—'}</span></td>
                <td className="px-6 py-4 text-gray-500 flex items-center gap-3">
                  {inst.email && <span className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" />{inst.email}</span>}
                  {inst.phone && <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" />{inst.phone}</span>}
                  {!inst.email && !inst.phone && '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
