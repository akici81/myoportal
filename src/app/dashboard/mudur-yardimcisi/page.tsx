'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Users, CalendarDays, KeyRound, Building2, Briefcase, FileText, ClipboardList } from 'lucide-react'

export default function MudurYardimcisiDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    departments: 0,
    classrooms: 0,
    instructors: 0,
    programs: 0,
    internships: 12, // V1'den gelecek modül (Örnek Data)
    commissions: 4,  // V1'den gelecek modül (Örnek Data)
    requests: 28,    // V1'den gelecek modül (Örnek Data)
  })

  // Auth User
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setUserProfile(prof)
      }
    })

    async function loadStats() {
      const [dept, rooms, inst, prog] = await Promise.all([
        supabase.from('departments').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('classrooms').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('instructors').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('programs').select('id', { count: 'exact' }).eq('is_active', true),
      ])

      setStats({
        departments: dept.count ?? 0,
        classrooms: rooms.count ?? 0,
        instructors: inst.count ?? 0,
        programs: prog.count ?? 0,
        internships: 12, // V2 Premium eklentisi olarak faz sonrası bağlanacak
        commissions: 4, 
        requests: 28, 
      })
    }
    loadStats()
  }, [supabase])

  const STAT_CARDS = [
    { label: 'Aktif Program', value: stats.programs, icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { label: 'Derslik Sayısı', value: stats.classrooms, icon: Building2, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    { label: 'Öğretim Elemanı', value: stats.instructors, icon: Users, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  ]

  const V1_MODULE_CARDS = [
    { label: 'Staj Başvuruları', value: stats.internships, icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Onay bekleyen son başvurular' },
    { label: 'Aktif Komisyonlar', value: stats.commissions, icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', desc: 'Görevli komisyon sayısı' },
    { label: 'Personel Talepleri', value: stats.requests, icon: FileText, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', desc: 'İşleme alınmamış dilekçeler' },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-purple-800/30 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <KeyRound className="w-48 h-48 text-purple-400" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            Müdür Yardımcısı Paneli
          </h1>
          <p className="mt-2 text-gray-400 max-w-xl font-medium">
            Hoş geldiniz, <span className="text-gray-300 font-bold">{userProfile?.full_name ?? 'Yönetici'}</span>. 
            MYO'nun tüm staj, komisyon ve bölüm istatistiklerini bu merkezden yönetebilirsiniz.
          </p>
        </div>
      </div>

      {/* V1 Modules (Ported Features) */}
      <div>
        <h2 className="text-lg font-bold text-gray-300 mb-4 px-1">Öğrenci & İdari Süreçler</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {V1_MODULE_CARDS.map((stat, i) => (
            <div key={i} className={`rounded-xl p-6 bg-cyan-600 border ${stat.border} shadow-lg`}>
              <div className="flex items-center justify-between gap-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-black text-white mt-0.5 leading-none">{stat.value}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-[11px] text-gray-400 font-medium">
                  {stat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Stats */}
      <div>
        <h2 className="text-lg font-bold text-gray-300 mb-4 px-1">Genel İzleme</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STAT_CARDS.map((stat, i) => (
            <div key={i} className={`rounded-xl p-6 border ${stat.border} hover:scale-[1.02] transition-transform bg-gray-900/40 shadow-lg`}>
              <div className="flex items-center justify-between gap-4">
                <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                  <stat.icon className="w-7 h-7" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-white mt-0.5 leading-none">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  )
}
