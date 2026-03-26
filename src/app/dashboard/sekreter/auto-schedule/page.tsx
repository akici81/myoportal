'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Wand2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Users,
  BookOpen,
  Blocks,
  Link2,
  Cpu,
  ShieldCheck,
  Info
} from 'lucide-react'
import clsx from 'clsx'

interface AcademicPeriod {
  id: string
  year: string
  semester: string
  is_active: boolean
}

interface PlacementResult {
  placedCount: number
  failed: Array<{
    course: string
    program: string
    reason: string
  }>
  stats: {
    totalCourses: number
    placedCourses: number
    failedCourses: number
    sharedGroups: number
    totalHours: number
  }
}

export default function AutoSchedulePage() {
  const supabase = createClient()
  const [periods, setPeriods] = useState<AcademicPeriod[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [clearExisting, setClearExisting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<PlacementResult | null>(null)
  const [dayDistribution, setDayDistribution] = useState<Record<string, number> | null>(null)

  const [stats, setStats] = useState({
    totalCourses: 0,
    totalConstraints: 0,
    sharedGroups: 0,
    existingEntries: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedPeriod) {
      loadPeriodStats()
    }
  }, [selectedPeriod])

  async function loadData() {
    setLoading(true)

    const { data: periodsData } = await supabase
      .from('academic_periods')
      .select('*')
      .order('is_active', { ascending: false })

    setPeriods((periodsData as AcademicPeriod[]) ?? [])

    const activePeriod = periodsData?.find((p) => p.is_active)
    if (activePeriod) {
      setSelectedPeriod(activePeriod.id)
    }

    const { count: courseCount } = await supabase
      .from('program_courses')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { count: constraintCount } = await supabase
      .from('instructor_constraints')
      .select('*', { count: 'exact', head: true })

    const { data: sharedData } = await supabase
      .from('program_courses')
      .select('shared_group_id')
      .eq('is_shared', true)
      .not('shared_group_id', 'is', null)

    const uniqueGroups = new Set(sharedData?.map((d) => d.shared_group_id))

    setStats((prev) => ({
      ...prev,
      totalCourses: courseCount || 0,
      totalConstraints: constraintCount || 0,
      sharedGroups: uniqueGroups.size,
    }))

    setLoading(false)
  }

  async function loadPeriodStats() {
    const { count } = await supabase
      .from('schedule_entries')
      .select('*', { count: 'exact', head: true })
      .eq('period_id', selectedPeriod)

    setStats((prev) => ({
      ...prev,
      existingEntries: count || 0,
    }))
  }

  async function generateSchedule() {
    if (!selectedPeriod) {
      toast.error('Akademik dönem seçin')
      return
    }

    if (clearExisting && stats.existingEntries > 0) {
      if (
        !confirm(`DİKKAT: Seçili dönemdeki tüm ${stats.existingEntries} yerleşim silinecek! İşleme devam etmek istediğinize emin misiniz?`)
      ) {
        return
      }
    }

    setGenerating(true)
    setResult(null)

    try {
      const response = await fetch('/api/schedule/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicPeriodId: selectedPeriod,
          clearExisting,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Merkezi yerleştirme motorunda bir hata oluştu.')
      }

      setResult(data.result)
      setDayDistribution(data.dayDistribution || null)
      toast.success(data.message)
      loadPeriodStats()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu')
    } finally {
      setGenerating(false)
    }
  }

  const selectedPeriodInfo = periods.find((p) => p.id === selectedPeriod)

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Premium Header Container */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-indigo-800/30">
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none">
          <Cpu className="w-48 h-48 text-red-400" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-default flex items-center gap-3" style={{ color: 'var(--text)' }}>
              Yapay Zeka Destekli Merkezi Program Oluşturucu
            </h1>
            <p className="mt-2 text-muted leading-relaxed">
              Tüm okulu kapsayan akademik ders programını; bölüm bazlı ortak dersler, eğitmenlerin kısıtlamaları ve derslik/öğrenci kapasite dengesini baz alan zeki bir algoritma (heuristics) yardımıyla saniyeler içinde taslaklandırın.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Data View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Settings & Stats) */}
        <div className="lg:col-span-1 space-y-6">
           
           {/* Stat Overview Boxes */}
           <div className="grid grid-cols-2 gap-4">
              <div className="card p-4 rounded-xl border border-red-600/20 bg-red-600/5">
                 <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center text-red-400 mb-3 border border-red-600/30">
                   <BookOpen className="w-5 h-5" />
                 </div>
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Havuzdaki Ders</p>
                 <p className="text-2xl font-black text-default mt-1" style={{ color: 'var(--text)' }}>{stats.totalCourses}</p>
              </div>
              <div className="card p-4 rounded-xl border border-red-600/20 bg-red-600/5">
                 <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center text-red-400 mb-3 border border-red-600/30">
                   <Blocks className="w-5 h-5" />
                 </div>
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Eğitmen Kısıtı</p>
                 <p className="text-2xl font-black text-default mt-1" style={{ color: 'var(--text)' }}>{stats.totalConstraints}</p>
              </div>
              <div className="card p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                 <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 border border-emerald-500/30">
                   <Link2 className="w-5 h-5" />
                 </div>
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ortak Grup</p>
                 <p className="text-2xl font-black text-default mt-1" style={{ color: 'var(--text)' }}>{stats.sharedGroups}</p>
              </div>
              <div className="card p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                 <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 mb-3 border border-amber-500/30">
                   <Calendar className="w-5 h-5" />
                 </div>
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mevcut Kayıt</p>
                 <p className="text-2xl font-black text-default mt-1" style={{ color: 'var(--text)' }}>{stats.existingEntries}</p>
              </div>
           </div>

           {/* Settings Card */}
           <div className="card p-6 rounded-2xl border card">
             <h3 className="font-bold text-default mb-5 flex items-center gap-2">
               <Wand2 className="w-5 h-5 text-red-400" />
               Motor Çalıştırma Parametreleri
             </h3>

             <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted ml-1">Hedef Akademik Dönem</label>
                  <select
                    className="w-full mt-1.5 bg-gray-950/50 border rounded-xl px-4 py-3 text-sm text-default focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-colors shadow-inner appearance-none cursor-pointer" style={{ color: 'var(--text)' }}
                    value={selectedPeriod}
                    disabled={generating}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    <option value="">— İşlem Yapılacak Dönemi Seçin —</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.year} - {p.semester} {p.is_active ? '✅ (Aktif Sezon)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="p-4 rounded-xl border bg-gray-950/40">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <div className="pt-0.5">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={clearExisting}
                          disabled={generating}
                          onChange={(e) => setClearExisting(e.target.checked)}
                          className="peer sr-only"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-red-600 peer-checked:to-red-600 transition-colors"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-muted group-hover:text-default transition-colors" style={{ color: 'var(--text)' }}>Hard Reset (Sıfırdan Başla)</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        Seçili dönemdeki tüm mevcut ders programını komple temize çeker, sadece sıfır kayıtlarla algoritmayı çalıştırır. Kapalıysa üstüne ekler.
                      </p>
                    </div>
                  </label>
                </div>

                {selectedPeriodInfo && stats.existingEntries > 0 && (
                  <div className={clsx(
                     "p-4 rounded-xl border flex items-start gap-3 transition-colors",
                     clearExisting ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
                  )}>
                    <AlertTriangle className={clsx("w-5 h-5 shrink-0 mt-0.5", clearExisting ? "text-red-400" : "text-amber-400")} />
                    <p className={clsx("text-xs leading-relaxed font-medium", clearExisting ? "text-red-400" : "text-amber-400")}>
                      Bu dönemde <strong>{stats.existingEntries}</strong> tablo satırı var. 
                      {clearExisting ? " İşlem onaylandığı an bu kayıtlar SİLİNECEK." : " İşlem bu kayıtlarla BİRLEŞTİRİLEREK yapılacak, çakışma riski olabilir."}
                    </p>
                  </div>
                )}
             </div>

             <button
               onClick={generateSchedule}
               disabled={generating || !selectedPeriod}
               className="w-full mt-6 btn-glow inline-flex border border-red-600/50 items-center justify-center gap-3 rounded-xl bg-cyan-600 px-6 py-3.5 font-bold text-default transition-all hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
             >
               {generating ? (
                 <>
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                   MERKEZİ MOTOR ÇALIŞIYOR...
                 </>
               ) : (
                 <>
                   <Cpu className="w-5 h-5" />
                   TÜM OKUL İÇİN PROGRAM OLUŞTUR
                 </>
               )}
             </button>
           </div>
        </div>

        {/* Right Column (Results & Info) */}
        <div className="lg:col-span-2 space-y-6">
           
           {!result && !generating && (
              <div className="card p-8 rounded-2xl border border-red-600/20 bg-gradient-to-br from-blue-900/10 to-transparent flex flex-col items-center justify-center min-h-[500px] text-center">
                 <div className="w-24 h-24 bg-red-600/10 rounded-full flex items-center justify-center border border-red-600/20 shadow-inner mb-6 relative">
                    <div className="absolute inset-0 bg-red-600/20 rounded-full animate-ping opacity-50"></div>
                    <Cpu className="w-12 h-12 text-red-400" />
                 </div>
                 <h2 className="text-2xl font-bold text-default mb-3" style={{ color: 'var(--text)' }}>Motor Beklemede</h2>
                 <p className="text-muted max-w-md mx-auto leading-relaxed mb-8">
                   Sol taraftaki panelden ayarlarınızı yapılandırıp butona tıkladığınızda otomasyon devreye girecektir.
                 </p>
                 
                 <div className="text-left w-full max-w-lg card border p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                    <h4 className="font-bold text-muted mb-4 flex items-center gap-2">
                       <Info className="w-4 h-4 text-red-400" />
                       Yapay Zeka Çalışma Sırası
                    </h4>
                    <ul className="space-y-4 relative z-10">
                      <li className="flex gap-3 items-start">
                        <span className="w-6 h-6 shrink-0 rounded bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-black border border-red-600/30">1</span>
                        <p className="text-sm text-muted leading-snug"><span className="text-muted font-semibold">Ortak Havuz Dersleri</span> en kısıtlı birimler olarak algılanır ve önce onlar bloklanır.</p>
                      </li>
                      <li className="flex gap-3 items-start">
                        <span className="w-6 h-6 shrink-0 rounded bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-black border border-red-600/30">2</span>
                        <p className="text-sm text-muted leading-snug"><span className="text-muted font-semibold">Hoca Kısıtları (Constraints)</span> incelenir ve kapalı saat/gün/saat limitleri harici zaman blokları işaretlenir.</p>
                      </li>
                      <li className="flex gap-3 items-start">
                        <span className="w-6 h-6 shrink-0 rounded bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-black border border-red-600/30">3</span>
                        <p className="text-sm text-muted leading-snug"><span className="text-muted font-semibold">Aktif Çakışma Önleme</span> ile Derslik Kapasiteleri ve program öğrenci sayıları eşleşerek slotlara dizilir.</p>
                      </li>
                    </ul>
                 </div>
              </div>
           )}

           {generating && (
              <div className="card p-8 rounded-2xl border border-red-600/30 card flex flex-col items-center justify-center min-h-[500px] text-center relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 card">
                    <div className="h-full bg-cyan-600 w-1/3 animate-[slide_1.5s_ease-in-out_infinite]"></div>
                 </div>
                 <div className="w-32 h-32 relative mb-8">
                    <div className="absolute inset-0 border-4 border-red-600/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Cpu className="w-10 h-10 text-red-400 animate-pulse" />
                    </div>
                 </div>
                 <h2 className="text-xl font-bold text-default mb-2 inline-flex items-center gap-2" style={{ color: 'var(--text)' }}>
                   Makine Öğrenimi Modeli İşleniyor <span className="flex gap-1"><span className="animate-bounce">.</span><span className="animate-bounce delay-75">.</span><span className="animate-bounce delay-150">.</span></span>
                 </h2>
                 <p className="text-muted max-w-sm mx-auto">
                   Binlerce ihtimal taranıyor, çakışmalar optimize ediliyor ve en uygun program şablonu çiziliyor. Bu işlem birkaç dakika sürebilir.
                 </p>
              </div>
           )}

           {result && !generating && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <div className="card p-8 rounded-2xl border border-emerald-500/30 bg-cyan-600 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 pointer-events-none">
                     <ShieldCheck className="w-64 h-64 text-emerald-400" />
                   </div>
                   
                   <div className="relative z-10">
                     <h3 className="text-2xl font-bold text-default mb-8 flex items-center gap-3" style={{ color: 'var(--text)' }}>
                       <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                         <CheckCircle className="w-5 h-5 text-emerald-400" />
                       </div>
                       Optimizasyon Raporu
                     </h3>

                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                       <div className="p-4 rounded-xl border card shadow-inner text-center">
                         <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Hedef Ders Modülü</p>
                         <p className="text-3xl font-black text-default mt-1" style={{ color: 'var(--text)' }}>{result.stats.totalCourses}</p>
                       </div>
                       <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 shadow-inner text-center">
                         <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Tamamlanan</p>
                         <p className="text-3xl font-black text-emerald-400 mt-1">{result.stats.placedCourses}</p>
                       </div>
                       <div className={clsx("p-4 rounded-xl border shadow-inner text-center", result.stats.failedCourses > 0 ? "border-red-500/20 bg-red-500/10" : "border-gray-800 card")}>
                         <p className={clsx("text-xs font-semibold uppercase tracking-wider", result.stats.failedCourses > 0 ? "text-red-400/80" : "text-gray-500")}>Dışarıda Kalan</p>
                         <p className={clsx("text-3xl font-black mt-1", result.stats.failedCourses > 0 ? "text-red-400" : "text-white")}>{result.stats.failedCourses}</p>
                       </div>
                       <div className="p-4 rounded-xl border border-red-600/20 bg-red-600/10 shadow-inner text-center">
                         <p className="text-xs font-semibold uppercase tracking-wider text-red-400/80">Net Ders Saati</p>
                         <p className="text-3xl font-black text-red-400 mt-1">{result.stats.totalHours}</p>
                       </div>
                     </div>

                     {/* Success Bar */}
                     <div className="mb-8">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-sm font-bold text-muted">Yerleştirme Başarı Oranı</span>
                           <span className="text-sm font-black text-emerald-400">
                             {result.stats.totalCourses > 0 ? Math.round((result.stats.placedCourses / result.stats.totalCourses) * 100) : 0}%
                           </span>
                        </div>
                        <div className="h-4 rounded-full card border overflow-hidden shadow-inner p-0.5">
                          <div
                            className="h-full rounded-full bg-cyan-600 relative overflow-hidden"
                            style={{
                              width: `${result.stats.totalCourses > 0 ? (result.stats.placedCourses / result.stats.totalCourses) * 100 : 0}%`,
                            }}
                          >
                             <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress_1s_linear_infinite]"></div>
                          </div>
                        </div>
                     </div>

                     {/* Distribution Histogram */}
                     {dayDistribution && (
                       <div className="pt-6 border-t">
                         <h4 className="text-sm font-bold text-muted mb-6 flex items-center gap-2">
                           <Calendar className="w-4 h-4 text-gray-500" />
                           Haftalık Dağılım Yoğunluğu
                         </h4>
                         <div className="grid grid-cols-5 gap-3 h-32 items-end">
                           {['Pzt', 'Sal', 'Çar', 'Per', 'Cum'].map((day, idx) => {
                             const count = dayDistribution[(idx + 1).toString()] || 0
                             const maxCount = Math.max(...Object.values(dayDistribution), 1)
                             const percentage = (count / maxCount) * 100
                             return (
                               <div key={day} className="flex flex-col items-center justify-end h-full relative group">
                                 <div className="opacity-0 group-hover:opacity-50 transition-opacity absolute -top-8 card text-default text-xs font-bold px-2 py-1 rounded shadow-lg pointer-events-none">
                                   {count} Saat
                                 </div>
                                 <div className="w-full max-w-[40px] bg-cyan-600 hover:brightness-110 transition-colors rounded-t-lg relative overflow-hidden shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                      style={{ height: `${percentage}%`, minHeight: count > 0 ? '12px' : '4px' }}>
                                 </div>
                                 <p className="text-xs font-bold text-muted mt-2">{day}</p>
                               </div>
                             )
                           })}
                         </div>
                       </div>
                     )}
                   </div>
                </div>

                {/* Failed Placements */}
                {result.failed.length > 0 && (
                  <div className="card p-6 rounded-2xl border border-amber-500/30 bg-cyan-600">
                    <h3 className="font-bold text-default mb-6 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                      Yerleşemeyen & Açıkta Kalan Dersler ({result.failed.length})
                    </h3>
                    <p className="text-sm text-muted mb-4 card p-3 rounded-lg border">
                      Aşağıdaki dersler, mevcut sınıf veya hoca kısıtlamaları (boş saat eksikliği vb.) sebebiyle sisteme otomatik <strong>yerleştirilememiştir</strong>. Lütfen bunları manuel yerleştirin.
                    </p>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {result.failed.map((f, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border card shadow-inner group hover:border-gray-700 transition-colors"
                        >
                          <div>
                            <p className="text-sm font-bold text-muted group-hover:text-default transition-colors" style={{ color: 'var(--text)' }}>{f.course}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{f.program}</p>
                          </div>
                          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            {f.reason}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
           )}

        </div>
      </div>
    </div>
  )
}
