'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, Search, Projector, Monitor, Laptop, ChefHat, Hammer, Library, DoorOpen
} from 'lucide-react'

const TYPE_MAP: Record<string, any> = {
  classroom: { label: 'Standart Derslik', color: '#3b82f6', icon: DoorOpen },
  normal: { label: 'Standart Derslik', color: '#3b82f6', icon: DoorOpen },
  lab: { label: 'Laboratuvar', color: '#10b981', icon: Monitor },
  kitchen: { label: 'Mutfak / Aşçılık', color: '#f59e0b', icon: ChefHat },
  amfi: { label: 'Amfi', color: '#8b5cf6', icon: Library },
  atolye: { label: 'Atölye', color: '#ec4899', icon: Hammer },
}

const DEFAULT_TYPE = { label: 'Derslik', color: '#64748b', icon: DoorOpen }

export default function ClassroomsReadOnlyPage() {
  const supabase = createClient()
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = supabase.from('classrooms').select('*').order('name')
    if (!showInactive) q.eq('is_active', true)
    const { data } = await q
    setClassrooms(data ?? [])
    setLoading(false)
  }, [showInactive, supabase])

  useEffect(() => {
    load()
  }, [load])

  const filtered = classrooms.filter(
    (c: any) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.building?.toLowerCase().includes(search.toLowerCase())
  )

  const buildings = Array.from(new Set(filtered.map((c: any) => c.building ?? 'Diğer'))).sort()

  return (
    <div className="space-y-6 animate-in">
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-emerald-800/30">
        <div className="absolute -right-10 -top-10 opacity-5 rotate-12">
          <Building2 className="w-48 h-48 text-emerald-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Derslik Katalogu
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Yerleşke genelindeki sınıf, laboratuvar ve atölyeleri görüntüleyin ve envanterlerini inceleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Object.entries(TYPE_MAP).map(([type, info], i) => {
          const count = classrooms.filter((c: any) => (c.type === type || (type === 'classroom' && c.type === 'normal')) && c.is_active).length
          const totalCap = classrooms
            .filter((c: any) => (c.type === type || (type === 'classroom' && c.type === 'normal')) && c.is_active && c.capacity)
            .reduce((s: number, c: any) => s + (c.capacity ?? 0), 0)
            
          if (type === 'normal') return null
          const IconObj = info.icon
          
          return (
            <div key={type} className={`glass-card p-4 rounded-xl border relative overflow-hidden animate-in-delay-${(i % 3) + 1}`}>
              <div className="absolute -right-4 -top-4 opacity-[0.03]">
                <IconObj className="w-24 h-24" style={{ color: info.color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: info.color }}>
                {loading ? '...' : count}
              </div>
              <div className="text-xs font-semibold text-gray-300 mt-1 flex items-center gap-1.5">
                <IconObj className="w-3 h-3 truncate" style={{ color: info.color }} />
                {info.label}
              </div>
              {totalCap > 0 && (
                <div className="text-[10px] mt-2 font-medium text-gray-500 card inline-block px-2 py-0.5 rounded border">
                  Kapasite: {totalCap}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/50" />
          <input 
            className="w-full card border rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all font-medium" 
            placeholder="Derslik ID veya Bina adı ara..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${showInactive ? 'bg-emerald-500/50' : 'bg-gray-700'}`}>
              <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${showInactive ? 'translate-x-5' : ''}`}></div>
            </div>
            <span className="text-gray-400 font-medium group-hover:text-gray-300 transition-colors">Pasifleri Göster</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 animate-pulse">
          <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Yerleşke bilgileri yükleniyor...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-20 text-center rounded-xl border">
          <div className="w-16 h-16 card/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">Derslik Bulunamadı</h3>
          <p className="text-gray-500 text-sm">Kriterlerinize uygun bir derslik kaydı yok.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {buildings.map((bldg: any) => {
            const bldgRooms = filtered.filter((c: any) => (c.building ?? 'Diğer') === bldg)
            const bldgColor = bldg.startsWith('A') ? '#3b82f6' : bldg.startsWith('B') ? '#10b981' : bldg.startsWith('C') ? '#f59e0b' : bldg.startsWith('D') ? '#8b5cf6' : '#64748b'
            
            return (
              <div key={bldg} className="animate-in-delay-1">
                <div className="flex items-center gap-3 mb-4 pl-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner" style={{ background: `linear-gradient(135deg, ${bldgColor}20, ${bldgColor}10)`, border: `1px solid ${bldgColor}30` }}>
                    <Building2 className="w-4 h-4" style={{ color: bldgColor }} />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {bldg} <span className="text-gray-500 font-normal text-sm ml-2">({bldgRooms.length} Kayıt)</span>
                  </h3>
                  <div className="h-px card/60 flex-1 ml-4 shadow-[0_1px_0_0_rgba(255,255,255,0.02)]"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {bldgRooms.map((c: any) => {
                    const typeInfo = TYPE_MAP[c.type === 'normal' ? 'classroom' : c.type] ?? DEFAULT_TYPE
                    const IconObj = typeInfo.icon
                    
                    return (
                      <div 
                        key={c.id} 
                        className={`glass-card rounded-xl border transition-all duration-300 flex flex-col group hover:shadow-xl hover:shadow-black/20 ${c.is_active ? 'border-gray-700/50 hover:border-gray-600' : 'border-red-900/20 card opacity-60 grayscale-[50%] hover:grayscale-0'}`}
                      >
                        <div className="h-1 w-full rounded-t-xl" style={{ backgroundColor: typeInfo.color }}></div>
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                             <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg text-white group-hover:text-cyan-100 transition-colors uppercase tracking-wider">{c.name}</h4>
                              </div>
                              <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border" style={{ background: typeInfo.color + '10', color: typeInfo.color, borderColor: typeInfo.color + '30' }}>
                                <IconObj className="w-3 h-3" />
                                {typeInfo.label}
                              </span>
                            </div>
                            {c.capacity && (
                              <div className="text-center card rounded-lg px-2 py-1 border shadow-inner">
                                <div className="text-xs font-bold text-white">{c.capacity}</div>
                                <div className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Kapasite</div>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 mb-4">
                            <h5 className="text-[10px] uppercase font-bold text-gray-600 mb-2 tracking-wider">Donanımlar</h5>
                            <div className="flex flex-wrap gap-2">
                              {c.has_projector ? (
                                <span title="Projeksiyon" className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center gap-1 text-[11px] font-medium text-blue-400">
                                  <Projector className="w-3 h-3" /> Projeksiyon
                                </span>
                              ) : null}
                              {c.has_smartboard ? (
                                <span title="Akıllı Tahta" className="px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center gap-1 text-[11px] font-medium text-purple-400">
                                  <Monitor className="w-3 h-3" /> Akıllı Tahta
                                </span>
                              ) : null}
                              {c.has_computer ? (
                                <span title={`${c.computer_count || 'Var'} Bilgisayar`} className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                  <Laptop className="w-3 h-3" /> {c.computer_count ? `${c.computer_count} Pc` : 'Pc'}
                                </span>
                              ) : null}
                              {!c.has_projector && !c.has_smartboard && !c.has_computer && (
                                <span className="text-xs text-gray-600 italic">Kayıtlı donanım yok</span>
                              )}
                            </div>
                          </div>

                          <div className="mt-auto pt-3 border-t flex items-center justify-between">
                            <span className={`badge ${c.is_active ? 'badge-emerald' : 'badge-amber'} scale-90 origin-left`}>
                              {c.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
