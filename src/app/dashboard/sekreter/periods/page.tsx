'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, CheckCircle2, CalendarDays, Clock, Settings, ArrowRight, PlayCircle } from 'lucide-react'
import type { AcademicPeriod } from '@/types'
import clsx from 'clsx'

export default function PeriodsPage() {
  const supabase = createClient()
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ academic_year: '2024-2025', semester: 1 })
  const [saving, setSaving] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('academic_periods')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('semester', { ascending: false })
    
    setPeriods(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    
    // Basit validasyon: Yıl formatı (Örn: 2024-2025)
    if (!/^\d{4}-\d{4}$/.test(form.academic_year)) {
      toast.error('Akademik yıl formatı YYYY-YYYY olmalıdır. (Örn: 2024-2025)')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('academic_periods').insert({ 
      academic_year: form.academic_year, 
      semester: form.semester === 1 ? 'fall' : 'spring', 
      is_active: false 
    })
    
    if (error) {
      toast.error('Dönem oluşturulamadı: ' + error.message)
    } else { 
      toast.success('Yeni akademik dönem başarıyla oluşturuldu')
      load() 
    }
    setSaving(false)
  }

  async function setActive(id: string) {
    setActivatingId(id)
    
    // Önce hepsini pasif yap (Supabase işlem sırası için iki aşamalı yapıyoruz)
    await supabase.from('academic_periods').update({ is_active: false }).neq('id', id)
    
    // Sonra istenileni aktif yap
    const { error } = await supabase.from('academic_periods').update({ is_active: true }).eq('id', id)
    
    if (error) {
      toast.error('Aktif dönem değiştirilemedi: ' + error.message)
    } else { 
      toast.success('Aktif dönem başarıyla güncellendi')
      load() 
    }
    setActivatingId(null)
  }

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-900/40 via-emerald-900/20 to-gray-900 p-8 border border-teal-800/30">
        <div className="absolute -right-10 -top-10 opacity-10 rotate-12">
          <CalendarDays className="w-48 h-48 text-teal-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 flex items-center gap-3">
              Akademik Dönemler
            </h1>
            <p className="mt-2 text-gray-400 max-w-xl">
              Sistemin üzerinde çalıştığı mevcut aktif dönemi belirleyin ve yeni eğitim-öğretim dönemleri için takvimi yönetin.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Side: Create Form */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass-card rounded-2xl border border-teal-500/20 p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-500/30 text-teal-400 shadow-inner">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Yeni Dönem Ekle</h3>
                  <p className="text-xs text-gray-400">Gelecek öğretim yılı için kayıt</p>
                </div>
              </div>

              <form onSubmit={create} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    Akademik Yıl
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/50" />
                    <input 
                      type="text"
                      className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors placeholder:text-gray-600" 
                      placeholder="Örn: 2024-2025" 
                      value={form.academic_year}
                      onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 block">
                    Dönem / Yarıyıl
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/50" />
                    <select 
                      className="w-full bg-gray-900/80 border border-gray-700/80 rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors appearance-none cursor-pointer"
                      value={form.semester} 
                      onChange={e => setForm(f => ({ ...f, semester: +e.target.value }))}
                      required
                    >
                      <option value={1}>Güz Dönemi (Fall)</option>
                      <option value={2}>Bahar Dönemi (Spring)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="w-full btn-glow bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Dönemi Oluştur</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="glass-card rounded-2xl border border-gray-800/60 p-5 bg-gray-900/40">
            <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-gray-500" /> Uyarılar & Bilgilendirme
            </h4>
            <ul className="text-xs text-gray-500 space-y-2 mt-3 list-disc pl-4 marker:text-teal-700">
              <li>Sistemde aynı anda yalnızca <strong>bir tane aktif dönem</strong> bulunabilir.</li>
              <li>Akıllı yerleştirme ve ders programları her zaman aktif döneme göre filtrelenmektedir.</li>
              <li>Geçmişe dönük kayıtları etkilememesi için eski dönemleri asla silmeyin.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Periods List */}
        <div className="xl:col-span-2">
          <div className="glass-card rounded-2xl border border-gray-800/60 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-gray-800/60 bg-gray-900/60 flex items-center justify-between">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                Tanımlı Dönemler 
                <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full border border-gray-700">{periods.length} Adet</span>
              </h3>
            </div>

            <div className="flex-1 p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 animate-pulse text-gray-500">
                  <Clock className="w-10 h-10 mb-4 opacity-50" />
                  <p className="font-medium">Dönemler yükleniyor...</p>
                </div>
              ) : periods.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500 bg-gray-900/30 rounded-xl border border-dashed border-gray-800">
                  <CalendarDays className="w-10 h-10 mb-3 opacity-50" />
                  <p className="font-medium text-gray-400">Henüz hiç dönem eklenmemiş</p>
                  <p className="text-xs mt-1">Sol taraftaki paneli kullanarak yeni bir akademik dönem başlatın.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {periods.map((p, index) => {
                    const isFall = p.semester === 'fall'
                    
                    return (
                      <div 
                        key={p.id} 
                        className={clsx(
                          'relative p-5 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group',
                          p.is_active 
                            ? 'bg-gradient-to-r from-teal-900/40 to-emerald-900/10 border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.1)]' 
                            : 'bg-gray-900/40 border-gray-800/80 hover:border-gray-600/60'
                        )}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {/* Status absolute indicator */}
                        {p.is_active && (
                          <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl pointer-events-none">
                            <div className="absolute top-[-20px] right-[-20px] w-14 h-14 bg-teal-500/20 rounded-full blur-xl"></div>
                            <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399] rounded-full animate-pulse"></div>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <div className={clsx(
                            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner transition-colors',
                            p.is_active ? 'bg-teal-500/20 border-teal-500/40 text-teal-400' : 'bg-gray-800 border-gray-700 text-gray-500 group-hover:bg-gray-700/80'
                          )}>
                            <CalendarDays className="w-6 h-6" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={clsx(
                                "text-lg font-bold tracking-tight transition-colors",
                                p.is_active ? 'text-white' : 'text-gray-300 group-hover:text-white'
                              )}>
                                {p.academic_year}
                              </h4>
                              {p.is_active && (
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Aktif Dönem
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm font-medium mt-0.5 flex items-center gap-2">
                              <span className={isFall ? 'text-orange-400' : 'text-sky-400'}>
                                {isFall ? '🍂 Güz Yarıyılı (1. Dönem)' : '🌱 Bahar Yarıyılı (2. Dönem)'}
                              </span>
                              <span className="text-gray-600 text-xs">— Eklenme: {new Date(p.created_at || new Date()).toLocaleDateString('tr-TR')}</span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 sm:mt-0 w-full sm:w-auto">
                          {!p.is_active ? (
                            <button 
                              onClick={() => setActive(p.id)}
                              disabled={activatingId === p.id}
                              className="w-full sm:w-auto px-4 py-2.5 bg-gray-800 hover:bg-teal-600 hover:text-white text-gray-400 rounded-xl text-sm font-bold transition-all border border-gray-700 hover:border-teal-500 hover:shadow-[0_0_15px_rgba(20,184,166,0.3)] flex items-center justify-center gap-2"
                            >
                              {activatingId === p.id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <PlayCircle className="w-4 h-4" />
                              )}
                              {activatingId === p.id ? 'Aktivasyon...' : 'Bu Dönemi Aktif Yap'}
                            </button>
                          ) : (
                            <div className="px-5 py-2.5 bg-gray-900/50 border border-gray-800/80 rounded-xl text-sm font-medium text-gray-400 flex items-center justify-center gap-2 cursor-default">
                              Şu Anki Dönem <ArrowRight className="w-4 h-4 opacity-50" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
