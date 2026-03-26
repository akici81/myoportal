import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Mail, Phone, Building2 } from 'lucide-react'

export default async function BolumBaskaniInstructorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Find department logic with fallback
  const { data: profile } = await supabase.from('profiles').select('department_id, role').eq('id', user.id).single()
  
  let targetDeptId = profile?.department_id

  if (!targetDeptId && profile?.role === 'bolum_baskani') {
    const { data: headDept } = await supabase.from('departments').select('id, name, short_code').eq('head_id', user.id).eq('is_active', true).single()
    if (headDept) targetDeptId = headDept.id
  }

  if (!targetDeptId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-red-800/60 border-dashed bg-red-900/10">
        <Building2 className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-2xl font-black text-red-400 tracking-tight">Yetkisiz Erişim / Bölüm Ataması Yok</h3>
        <p className="text-muted mt-3 max-w-md mx-auto leading-relaxed">
          Kullanıcı hesabınızda tanımlı bir bölüm bulunamadı. Lütfen sekreterlikle iletişime geçin.
        </p>
      </div>
    )
  }

  const { data: department } = await supabase
    .from('departments')
    .select('id, name, short_code')
    .eq('id', targetDeptId)
    .single()

  const { data: instructors } = await supabase
    .from('instructors')
    .select('id, full_name, title, email, phone')
    .eq('department_id', targetDeptId)
    .eq('is_active', true)
    .order('full_name')

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-cyan-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <Users className="w-48 h-48 text-cyan-400" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
             <span className="text-xs font-bold uppercase tracking-widest text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">{department?.name}</span>
          </div>
          <h1 className="text-3xl font-black text-default" style={{ color: 'var(--text)' }}>
            Bölüm Öğretim Elemanları
          </h1>
          <p className="mt-2 text-muted">Bölümünüzde görevli kadrolu hocaların ve dışarıdan atanan eğitmenlerin listesi</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 card/30 shadow-xl">
        <table className="w-full text-left text-sm text-muted">
          <thead className="card text-[11px] font-black uppercase text-gray-500 tracking-widest border-b">
            <tr>
              <th className="px-6 py-4">Ad Soyad</th>
              <th className="px-6 py-4">Unvan</th>
              <th className="px-6 py-4">Bölüm</th>
              <th className="px-6 py-4">İletişim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {instructors && instructors.length > 0 ? (
              instructors.map(inst => (
                <tr key={inst.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-bold text-default tracking-wide">{inst.full_name}</td>
                  <td className="px-6 py-4 text-cyan-400/80 font-medium">{inst.title || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider">
                      {department?.short_code || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 flex items-center gap-4">
                    {inst.email && <a href={`mailto:${inst.email}`} className="flex items-center gap-1.5 text-xs hover:text-cyan-400 transition-colors"><Mail className="w-3.5 h-3.5" />{inst.email}</a>}
                    {inst.phone && <a href={`tel:${inst.phone}`} className="flex items-center gap-1.5 text-xs hover:text-cyan-400 transition-colors"><Phone className="w-3.5 h-3.5" />{inst.phone}</a>}
                    {!inst.email && !inst.phone && '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-gray-500 font-medium">Bu bölüme kayıtlı aktif öğretim elemanı bulunmuyor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
