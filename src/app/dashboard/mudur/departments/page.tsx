'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap, Search, Users, BookOpen, Building2 } from 'lucide-react'

export default function DepartmentsReadOnlyPage() {
  const supabase = createClient()
  const [departments, setDepts] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [instrCounts, setInstrCounts] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('departments').select('*, head:profiles!fk_dept_head(id, full_name)').order('name')
    if (!showInactive) q.eq('is_active', true)
    const { data } = await q
    setDepts(data ?? [])
    
    const { data: progs } = await supabase.from('programs').select('*').eq('is_active', true).order('name')
    setPrograms(progs ?? [])
    
    const { data: instrs } = await supabase.from('instructors').select('department_id').eq('is_active', true)
    const counts: Record<string, number> = {}
    instrs?.forEach((i: any) => { counts[i.department_id] = (counts[i.department_id] ?? 0) + 1 })
    setInstrCounts(counts)
    
    setLoading(false)
  }, [showInactive, supabase])

  useEffect(() => { load() }, [load])

  const filtered = departments.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.short_code?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-red-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <Building2 className="w-48 h-48 text-red-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-default flex items-center gap-3" style={{ color: 'var(--text)' }}>
              Bölümler Kataloğu
            </h1>
            <p className="mt-2 text-muted max-w-xl">
              Üniversitedeki akademik bölümleri, aktif programları ve öğretim görevlisi yüklerini görüntüleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            className="w-full card border rounded-lg pl-10 pr-4 py-2.5 text-sm text-muted placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all font-medium" 
            placeholder="Bölüm adı veya kısa kod ara..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${showInactive ? 'bg-red-500/50' : 'bg-gray-700'}`}>
              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${showInactive ? 'translate-x-5' : ''}`}></div>
            </div>
            <span className="text-muted font-medium group-hover:text-muted transition-colors">Pasifleri Göster</span>
          </label>
          <div className="hidden sm:block w-px h-6 card"></div>
          <div className="text-muted font-medium">Toplam <span className="text-default">{filtered.length}</span> Bölüm</div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="card h-48 rounded-xl border p-5 flex flex-col justify-between animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 card rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 card rounded w-3/4" />
                  <div className="h-3 card/50 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 text-center rounded-xl border flex flex-col items-center justify-center">
          <div className="w-16 h-16 card/50 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-default mb-1">Bölüm Bulunamadı</h3>
          <p className="text-gray-500 text-sm">Arama kriterlerinize uyan kayıt yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d, i) => {
            const deptPrograms = programs.filter(p => p.department_id === d.id)
            return (
              <div 
                key={d.id} 
                className={`glass-card p-5 rounded-xl border transition-all duration-300 group hover:shadow-xl hover:shadow-black/20 animate-in-delay-${(i % 3) + 1} flex flex-col h-full
                  ${d.is_active ? 'border-gray-700/50 hover:border-gray-600' : 'border-red-900/30 bg-red-900/5 opacity-70 grayscale-[30%] hover:grayscale-0'}`}
              >
                <div className="flex items-start gap-4 mb-5">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-inner"
                    style={{ background: d.is_active ? 'linear-gradient(135deg, #ef444420, #ea580c10)' : '#1f2937', color: d.is_active ? '#ef4444' : '#6b7280', border: '1px solid ' + (d.is_active ? '#ef444430' : '#374151') }}
                  >
                    {d.short_code}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-bold text-muted text-base leading-tight truncate group-hover:text-default transition-colors" style={{ color: 'var(--text)' }} title={d.name}>
                      {d.name}
                    </h3>
                    <div className="text-xs font-medium text-gray-500 mt-1.5 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5" />
                      Yönetici: {d.head?.full_name || <span className="text-red-400/80 italic">Atanmamış</span>}
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  {/* Program Tags */}
                  {deptPrograms.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {deptPrograms.slice(0, 3).map(p => (
                        <span key={p.id} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded card/60 text-muted border">
                          <BookOpen className="w-3 h-3 text-cyan-500" />
                          {p.name}
                        </span>
                      ))}
                      {deptPrograms.length > 3 && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded card/30 text-gray-500">
                          +{deptPrograms.length - 3} program
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 text-[11px] text-gray-600 italic px-2">Kayıtlı program yok</div>
                  )}
                </div>

                {/* Footer Stats */}
                <div className="pt-4 mt-auto border-t flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted" title="Öğretim Elemanları">
                      <Users className="w-4 h-4 text-gray-500" />
                      {instrCounts[d.id] ?? 0} Eğitmen
                    </div>
                    <span className={`badge ${d.is_active ? 'badge-emerald' : 'badge-amber'} scale-90 origin-left`}>
                      {d.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
