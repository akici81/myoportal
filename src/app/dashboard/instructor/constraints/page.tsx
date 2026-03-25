'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Clock, AlertTriangle, ShieldCheck, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'
import type { AcademicPeriod } from '@/types'

// Types
interface Constraint {
  id: string
  instructor_id: string
  period_id: string
  constraint_type: 'time_block' | 'max_hours' | 'days_off' | 'preferred_days'
  value: any
  reason?: string
  is_approved: boolean
  created_at: string
}

const CONSTRAINT_TYPES = [
  { id: 'time_block', label: 'Belirli Saatlerde Ders Veremem', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 'days_off', label: 'Tüm Gün Boşluk İsteği', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'max_hours', label: 'Haftalık Max Ders Saati', icon: HelpCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
]

export default function InstructorConstraintsPage() {
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [instructorId, setInstructorId] = useState<string | null>(null)
  const [period, setPeriod] = useState<AcademicPeriod | null>(null)
  const [constraints, setConstraints] = useState<Constraint[]>([])
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formType, setFormType] = useState<string>('time_block')
  const [formValue, setFormValue] = useState<any>({})
  const [formReason, setFormReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Profil ve aktif dönem çek
    const [profRes, perRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('academic_periods').select('*').eq('is_active', true).maybeSingle()
    ])

    setProfile(profRes.data)
    setPeriod((perRes.data as AcademicPeriod) ?? null)

    if (!perRes.data) {
       setLoading(false)
       return
    }

    // Eğitmen kimliğini çek
    const { data: inst } = await supabase.from('instructors').select('id').eq('user_id', user.id).maybeSingle()
    
    if (inst) {
       setInstructorId(inst.id)
       // Kısıtları getir
       const { data: cons } = await supabase
         .from('instructor_constraints')
         .select('*')
         .eq('instructor_id', inst.id)
         .eq('period_id', perRes.data.id)
         .order('created_at', { ascending: false })
         
       setConstraints(cons || [])
    }
    
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!instructorId || !period) return
    
    setSaving(true)
    try {
      const payload = {
        instructor_id: instructorId,
        period_id: period.id,
        constraint_type: formType,
        value: formValue,
        reason: formReason,
        is_approved: false // Sistem/Bölüm başkanı onaylamalı (V2 Mantığı)
      }

      const { error } = await supabase.from('instructor_constraints').insert([payload])
      if (error) throw error

      toast.success('Kısıt talebiniz başarıyla iletildi.')
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Kayıt sırasında bir hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, is_approved: boolean) {
    if (is_approved) {
      if (!confirm('Bu kısıt daha önceden ONAYLANMIŞ. Silerseniz yeniden sekreter/başkan onayı gerekecek. Silmek istediğinize emin misiniz?')) return
    } else {
      if (!confirm('Kısıt talebini silmek istediğinize emin misiniz?')) return
    }

    try {
      const { error } = await supabase.from('instructor_constraints').delete().eq('id', id)
      if (error) throw error
      toast.success('Kısıt silindi.')
      setConstraints(c => c.filter(x => x.id !== id))
    } catch (err: any) {
      toast.error('Silinemedi: ' + err.message)
    }
  }

  const formatValue = (type: string, val: any) => {
    try {
      if (type === 'time_block') {
         const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
         return `${days[val.day_of_week] || 'Bilinmeyen Gün'}: ${val.start_time} - ${val.end_time} arası müsait değilim.`
      }
      if (type === 'days_off') {
         const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
         return `${(val.days || []).map((d: number) => days[d]).join(', ')} günleri kampüste olamam.`
      }
      if (type === 'max_hours') {
         return `Haftada en fazla ${val.max_hours} saat derse girebilirim.`
      }
    } catch (e) {
      return JSON.stringify(val)
    }
    return '-'
  }

  if (loading) {
     return (
        <div className="flex items-center justify-center p-20 animate-pulse text-gray-400">
           Veriler yükleniyor...
        </div>
     )
  }

  if (!period) {
     return (
       <div className="card border border-amber-500/30 bg-amber-500/5 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
         <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500/50" />
         <p className="text-xl font-bold text-amber-400 mb-2">Aktif Dönem Kapalı</p>
         <p className="text-amber-500/70 max-w-md">Şu anda sistemde aktif bir akademik dönem bulunmadığı için kısıt talep edilemiyor.</p>
       </div>
     )
  }

  if (!instructorId) {
     return (
       <div className="card border border-red-500/30 bg-red-500/5 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
         <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
         <p className="text-xl font-bold text-red-400 mb-2">Eğitmen Profili Eksik</p>
         <p className="text-red-500/70 max-w-md">Kısıt girebilmeniz için sistemde kayıtlı bir eğitmen kodunuzun (Instructor Profile) olması gerekiyor.</p>
       </div>
     )
  }

  return (
    <div className="space-y-8 animate-in pb-20">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl card p-8 border border-amber-800/30 shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none">
          <AlertTriangle className="w-48 h-48 text-amber-400" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Çalışma Saatlerim & Kısıtlarım
            </h1>
            <p className="mt-2 text-gray-400 leading-relaxed text-sm">
              Bu panel üzerinden, haftalık ders programınız hazırlanırken algoritmanın ve bölüm idaresinin dikkate alması için görev yapılamayacak zamanları ("kısıtları") sisteme işleyebilirsiniz.
            </p>
            <div className="flex items-center gap-3 mt-4">
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                 {period.academic_year} / {period.semester}. Dönem
               </span>
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-xs font-bold">
                 Talep Edilen: {constraints.length}
               </span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-3">
             <button
               onClick={() => {
                 setFormType('time_block')
                 setFormValue({ day_of_week: 1, start_time: '08:00', end_time: '12:00' })
                 setFormReason('')
                 setIsModalOpen(true)
               }}
               className="btn-glow inline-flex border border-amber-500/50 items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition-all hover:scale-105"
             >
               <Plus className="w-5 h-5" />
               Yeni Kısıt Ekle
             </button>
          </div>
        </div>
      </div>

      {/* Constraints List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {constraints.length === 0 ? (
           <div className="col-span-full border border-gray-800 bg-gray-900/50 border-dashed rounded-2xl flex flex-col items-center justify-center p-16 text-center">
              <ShieldCheck className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-lg text-gray-300 font-bold">Kısıtlama Yok</p>
              <p className="text-gray-500 text-sm mt-1 max-w-sm">Haftanın her saati ve gününde ders programı algoritması için müsaitsiniz.</p>
           </div>
        ) : (
           constraints.map(c => {
             const typeDef = CONSTRAINT_TYPES.find(t => t.id === c.constraint_type)
             const Icon = typeDef?.icon || AlertTriangle

             return (
               <div key={c.id} className="card rounded-2xl border border-gray-800 bg-gray-900/80 overflow-hidden flex flex-col transition-all hover:border-gray-700">
                  <div className={clsx("h-1.5 w-full", c.is_approved ? "bg-emerald-500" : "bg-amber-500")}></div>
                  <div className="p-5 flex-1 relative">
                     <div className="flex justify-between items-start mb-4">
                        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center border", typeDef?.bg, typeDef?.color, `border-${typeDef?.color.split('-')[1]}-500/20`)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {c.is_approved ? (
                             <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                               <CheckCircle2 className="w-3 h-3" /> ONAYLANDI
                             </span>
                          ) : (
                             <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                               <Clock className="w-3 h-3" /> BEKLEMEDE
                             </span>
                          )}
                          <button
                            onClick={() => handleDelete(c.id, c.is_approved)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                            title="İptal Et"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                     </div>
                     
                     <h3 className="font-bold text-gray-200 text-sm mb-1">{typeDef?.label || c.constraint_type}</h3>
                     <p className="text-white font-medium text-lg leading-snug break-words">
                        {formatValue(c.constraint_type, c.value)}
                     </p>
                     
                     {c.reason && (
                        <div className="mt-4 p-3 rounded-lg bg-gray-950 border border-gray-800">
                           <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1">Açıklama / Sebep</p>
                           <p className="text-xs text-gray-300">{c.reason}</p>
                        </div>
                     )}
                  </div>
               </div>
             )
           })
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className="bg-[#0f111a] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold text-white">Yeni Kısıt Talebi</h3>
              <p className="text-sm text-gray-400">Algoritmanın dikkate almasını istediğiniz özel durumu belirtin.</p>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <form id="constraint-form" onSubmit={handleSave} className="space-y-4">
                
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Kısıt Tipi</label>
                  <select
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    value={formType}
                    onChange={(e) => {
                      setFormType(e.target.value)
                      if (e.target.value === 'time_block') setFormValue({ day_of_week: 1, start_time: '08:00', end_time: '12:00' })
                      if (e.target.value === 'days_off') setFormValue({ days: [1] })
                      if (e.target.value === 'max_hours') setFormValue({ max_hours: 15 })
                    }}
                  >
                    {CONSTRAINT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>

                <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/50 space-y-4">
                  {formType === 'time_block' && (
                     <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="md:col-span-2">
                             <label className="text-xs text-gray-500 mb-1 block">Hangi Gün?</label>
                             <select
                               className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
                               value={formValue.day_of_week}
                               onChange={(e) => setFormValue({...formValue, day_of_week: parseInt(e.target.value)})}
                             >
                                <option value={1}>Pazartesi</option>
                                <option value={2}>Salı</option>
                                <option value={3}>Çarşamba</option>
                                <option value={4}>Perşembe</option>
                                <option value={5}>Cuma</option>
                                <option value={6}>Cumartesi</option>
                                <option value={0}>Pazar</option>
                             </select>
                           </div>
                           <div>
                             <label className="text-xs text-gray-500 mb-1 block">Başlangıç Saati</label>
                             <input type="time" required
                               className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
                               value={formValue.start_time}
                               onChange={(e) => setFormValue({...formValue, start_time: e.target.value})}
                             />
                           </div>
                           <div>
                             <label className="text-xs text-gray-500 mb-1 block">Bitiş Saati</label>
                             <input type="time" required
                               className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white"
                               value={formValue.end_time}
                               onChange={(e) => setFormValue({...formValue, end_time: e.target.value})}
                             />
                           </div>
                        </div>
                     </>
                  )}

                  {formType === 'max_hours' && (
                     <div>
                       <label className="text-xs text-gray-500 mb-1 block">Haftalık Maksimum Saat</label>
                       <input type="number" required min="1" max="40"
                         className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xl font-bold text-white text-center"
                         value={formValue.max_hours}
                         onChange={(e) => setFormValue({ max_hours: parseInt(e.target.value) })}
                       />
                     </div>
                  )}

                  {formType === 'days_off' && (
                     <div>
                       <label className="text-xs text-gray-500 mb-2 block">Çalışılmayacak Gün(ler)</label>
                       <div className="flex flex-wrap gap-2">
                         {[1,2,3,4,5,6,0].map(d => {
                           const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
                           const isChecked = formValue.days?.includes?.(d)
                           return (
                             <button type="button" key={d}
                               onClick={() => {
                                 let dArr = formValue.days || []
                                 if (dArr.includes(d)) dArr = dArr.filter((x: number) => x !== d)
                                 else dArr = [...dArr, d]
                                 setFormValue({ days: dArr })
                               }}
                               className={clsx(
                                 "px-3 py-1.5 rounded-lg text-sm transition-colors border",
                                 isChecked ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
                               )}
                             >
                               {days[d]}
                             </button>
                           )
                         })}
                       </div>
                     </div>
                  )}
                </div>

                <div>
                   <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block flex items-center justify-between">
                     Gerekçe (Opsiyonel)
                     <span className="text-[10px] text-gray-600 normal-case tracking-normal">Sekreter görsün</span>
                   </label>
                   <textarea
                     rows={3}
                     className="w-full custom-scrollbar bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                     placeholder="Belirttiğiniz kısıtlamanın sebebi nedir? (Örn: Fakültede ders, hastalık vb.)"
                     value={formReason}
                     onChange={(e) => setFormReason(e.target.value)}
                   />
                </div>

              </form>
            </div>
            
            <div className="p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-900/50 rounded-b-2xl">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                onClick={() => setIsModalOpen(false)}
              >
                İptal
              </button>
              <button
                type="submit"
                form="constraint-form"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-lg"
              >
                {saving ? 'Kaydediliyor...' : 'Talebi İlet'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
