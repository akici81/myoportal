'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/layout/TopBar'
import { Clock, Trash2, Plus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function TimeSlotsPage() {
  const supabase = createClient()
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadSlots()
  }, [])

  async function loadSlots() {
    setLoading(true)
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .order('slot_number')
    setSlots(data ?? [])
    setLoading(false)
  }

  async function handleAutoCreate() {
    if (!confirm('08:00-20:50 arası standart ders saatlerini oluşturmak istiyor musunuz?')) return

    setCreating(true)
    const res = await fetch('/api/system/time-slots', { method: 'POST' })
    const data = await res.json()

    if (res.ok) {
      toast.success(data.message)
      loadSlots()
    } else {
      toast.error(data.error || 'Oluşturma başarısız')
    }
    setCreating(false)
  }

  async function handleDeleteAll() {
    if (!confirm('TÜM DERS SAATLERİNİ SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? Bu işlem geri alınamaz!')) return

    setDeleting(true)
    const res = await fetch('/api/system/time-slots', { method: 'DELETE' })
    const data = await res.json()

    if (res.ok) {
      toast.success('Tüm ders saatleri silindi')
      loadSlots()
    } else {
      toast.error(data.error || 'Silme başarısız')
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TopBar title="Ders Saatleri Yönetimi" subtitle="Haftalık ders slotlarını yönetin" />

      {/* Actions */}
      <div className="card p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-white">Toplam Slot: {slots.length}</h3>
            <p className="text-xs text-gray-400">
              {slots.filter(s => s.is_uzem_slot).length} UZEM, {slots.filter(s => !s.is_uzem_slot).length} Normal
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {slots.length === 0 && (
            <button
              onClick={handleAutoCreate}
              disabled={creating}
              className="btn-primary flex items-center gap-2"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Otomatik Oluştur (08:00-20:50)
            </button>
          )}

          {slots.length > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deleting}
              className="btn-danger flex items-center gap-2"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Tümünü Sil
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {slots.length === 0 && (
        <div className="card-hover border-dashed flex flex-col items-center justify-center py-32 text-center">
          <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
          <h3 className="text-xl font-black text-white mb-2">Ders Saatleri Tanımlanmamış</h3>
          <p className="text-gray-400 max-w-md mb-6">
            Sisteminizde henüz ders saati tanımlanmamış. Otomatik oluştur butonuna basarak standart MYO ders saatlerini (08:00-20:50) ekleyebilirsiniz.
          </p>
        </div>
      )}

      {/* Slots Grid */}
      {slots.length > 0 && (
        <div className="card p-6">
          <div className="grid gap-3">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-4 p-4 rounded-xl card border hover:card/50 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <span className="text-lg font-black text-cyan-400">{slot.slot_number}</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-lg font-bold text-white">
                      {slot.start_time.slice(0, 5)}
                    </span>
                    <span className="text-gray-600">→</span>
                    <span className="font-mono text-lg font-bold text-white">
                      {slot.end_time.slice(0, 5)}
                    </span>

                    {slot.is_uzem_slot && (
                      <span className="ml-3 px-2 py-1 text-xs font-bold uppercase bg-red-600/20 text-red-400 border border-red-600/30 rounded">
                        UZEM
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {slot.is_uzem_slot ? 'Uzaktan eğitim saati' : 'Normal ders saati'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-cyan-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-cyan-400 text-sm">Sistem Hazır</h4>
                <p className="text-xs text-cyan-300/80 mt-1">
                  Ders saatleri başarıyla yüklenmiş. Artık ders programı oluşturabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
