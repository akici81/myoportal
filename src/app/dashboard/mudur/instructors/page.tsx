'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  GraduationCap, Search, Mail, Phone, BookOpen, UserCircle, X, CalendarDays, Clock, MapPin, Tag, ChevronRight, ChevronLeft, List, Grid3X3, CalendarHeart
} from 'lucide-react'

// --- INSTRUCTORS READ ONLY COMPONENT ---
// This file is used in mudur/instructors, export it directly if needed in other folders

const TITLE_STYLES: Record<string, { color: string; badge: string }> = {
  'Prof. Dr.': { color: '#f59e0b', badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  'Doç. Dr.': { color: '#f97316', badge: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
  'Dr. Öğr. Üyesi': { color: '#8b5cf6', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  'Dr.': { color: '#a855f7', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  'Öğr. Gör. Dr.': { color: '#0ea5e9', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  'Öğr. Gör.': { color: '#3b82f6', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  'Arş. Gör.': { color: '#10b981', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  'Uzman': { color: '#64748b', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
}

const DEFAULT_STYLE = { color: '#8b5cf6', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' }

export default function InstructorsReadOnlyPage() {
  const supabase = createClient()
  const [instructors, setInstructors] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('instructors')
      .select(`
        *,
        departments:instructors_department_id_fkey(id, name, short_code)
      `)
      .order('full_name')
      
    if (!showInactive) q.eq('is_active', true)
    
    const { data } = await q
    setInstructors(data ?? [])
    setLoading(false)
  }, [showInactive, supabase])

  useEffect(() => {
    load()
    const fetchDeps = async () => {
      const { data } = await supabase.from('departments').select('id, name, short_code').eq('is_active', true).order('name')
      setDepartments(data ?? [])
    }
    fetchDeps()
  }, [load, supabase])

  const filtered = instructors.filter(i => {
    const q = search.toLowerCase()
    return (!q || i.full_name?.toLowerCase().includes(q) || i.email?.toLowerCase().includes(q)) &&
           (!filterDept || i.department_id === filterDept)
  })

  const deptGroups = [
    ...departments.map(d => ({
      dept: d,
      items: filtered.filter(i => i.department_id === d.id)
    })).filter(g => g.items.length > 0),
    ...(filtered.filter(i => !i.department_id).length > 0
      ? [{ dept: { id: 'none', name: 'Ortak Havuz / Bölüm Atanmamış', short_code: 'ORT' }, items: filtered.filter(i => !i.department_id) }]
      : [])
  ]

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/40 via-violet-900/20 to-gray-900 p-8 border border-indigo-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <GraduationCap className="w-48 h-48 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 flex items-center gap-3">
              Kadro ve Personel
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Üniversitemiz bünyesindeki akademik personelin bölüm ve unvan dağılımlarını inceleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between border border-gray-800/60">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600/50" />
            <input 
              className="w-full bg-gray-900/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-medium" 
              placeholder="İsim veya e-posta ara..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <select 
            className="w-full sm:w-60 bg-gray-900/50 border border-gray-700/50 rounded-lg px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
            value={filterDept} 
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="">🏫 Tüm Bölümler ({instructors.length})</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-6 text-sm whitespace-nowrap">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${showInactive ? 'bg-indigo-500/50' : 'bg-gray-700'}`}>
              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${showInactive ? 'translate-x-5' : ''}`}></div>
            </div>
            <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Pasifleri Göster</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 animate-pulse">
          <GraduationCap className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Akademik kadro yükleniyor...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card py-20 text-center rounded-xl border border-gray-800/60">
          <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Kayıt Bulunamadı</h3>
          <p className="text-gray-500 text-sm">Arama kriterlerinize uygun personel bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {deptGroups.map(({ dept, items }) => (
            <div key={dept.id} className="animate-in-delay-1">
              <div className="flex items-center gap-3 mb-5 pl-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-inner" style={{ background: `linear-gradient(135deg, #4f46e520, #4f46e510)`, border: `1px solid #4f46e530` }}>
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{dept.name}</h3>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mt-0.5">{items.length} Personel</p>
                </div>
                <div className="h-px bg-gradient-to-r from-indigo-800/40 to-transparent flex-1 ml-4"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(i => {
                  const style = TITLE_STYLES[i.title || ''] || DEFAULT_STYLE
                  const initials = i.full_name?.substring(0,2).toUpperCase() || 'ÖE'
                  
                  return (
                    <div 
                      key={i.id} 
                      className={`glass-card rounded-2xl border transition-all duration-300 flex flex-col group hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-900/20
                        ${i.is_active ? 'border-gray-700/50 hover:border-indigo-500/30' : 'border-red-900/20 bg-gray-900/50 opacity-60 grayscale hover:grayscale-0'}`}
                    >
                      <div className="h-1.5 w-full rounded-t-2xl opacity-80" style={{ backgroundColor: style.color }}></div>
                      
                      <div className="p-5 flex-1 flex flex-col relative overflow-hidden">
                        <div className="absolute right-4 top-4">
                          <div className={`w-2 h-2 rounded-full shadow-md ${i.is_active ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ring-2 ring-offset-2 ring-offset-[#0f1523]"
                            style={{ background: `${style.color}15`, color: style.color }}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 pr-4">
                            <h4 className="font-bold text-md text-white group-hover:text-indigo-200 transition-colors truncate">{i.full_name}</h4>
                            <div className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] uppercase font-bold tracking-wider border ${style.badge}`}>
                              {i.title || 'Belirtilmemiş'}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2.5 mt-2 bg-gray-900/40 rounded-xl p-3 border border-gray-800/40 backdrop-blur-sm">
                          <div className="flex items-center gap-2.5 text-xs text-gray-400">
                            <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span className="truncate group-hover:text-gray-300 transition-colors">{i.email || <span className="text-gray-600 italic">E-posta yok</span>}</span>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-gray-400">
                            <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span className="truncate group-hover:text-gray-300 transition-colors">{i.phone || <span className="text-gray-600 italic">Telefon yok</span>}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
