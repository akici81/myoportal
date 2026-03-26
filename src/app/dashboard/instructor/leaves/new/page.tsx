'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react'

export default function NewLeaveRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaveType, setLeaveType] = useState('annual')

  const isHourly = leaveType === 'hourly'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    let start_date = formData.get('start_date') as string
    let end_date = formData.get('end_date') as string

    // Saatlik izin için tarih + saat birleştir
    if (isHourly) {
      const date = formData.get('hourly_date') as string
      const start_time = formData.get('start_time') as string
      const end_time = formData.get('end_time') as string

      if (!date || !start_time || !end_time) {
        setError('Lütfen tarih ve saat aralığını giriniz.')
        setLoading(false)
        return
      }

      start_date = `${date}T${start_time}`
      end_date = `${date}T${end_time}`
    }

    const data = {
      leave_type: formData.get('leave_type'),
      start_date,
      end_date,
      reason: formData.get('reason')
    }

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'İzin talebi oluşturulamadı.')
      }

      router.push('/dashboard/instructor/leaves')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/instructor/leaves" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-2 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> İzin Listesine Dön
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Yeni İzin Talebi
          </h1>
          <p className="mt-1 text-sm text-gray-500">Sistem yöneticisi ve bölüm sekreterine iletilmek üzere izin formu oluşturun.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/5 card/30 p-6">
        {error && (
          <div className="rounded-lg bg-rose-500/10 p-4 border border-rose-500/20 flex gap-3 text-rose-400">
             <AlertTriangle className="h-5 w-5 flex-shrink-0" />
             <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">İzin Türü</label>
          <select
            name="leave_type"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 card px-4 py-2.5 text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
          >
            <option value="annual">Yıllık İzin</option>
            <option value="sick">Hastalık / Sağlık Raporu</option>
            <option value="excuse">Mazeret İzni</option>
            <option value="hourly">Saatlik İzin</option>
            <option value="conference">Akademik Konferans / Sempozyum</option>
          </select>
        </div>

        {isHourly ? (
          /* Saatlik İzin Formu */
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <label className="text-sm font-medium text-gray-300">Tarih</label>
              <input
                type="date"
                name="hourly_date"
                required
                className="w-full rounded-xl border border-white/10 card px-4 py-2.5 text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Başlangıç Saati</label>
              <input
                type="time"
                name="start_time"
                required
                className="w-full rounded-xl border border-white/10 card px-4 py-2.5 text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Bitiş Saati</label>
              <input
                type="time"
                name="end_time"
                required
                className="w-full rounded-xl border border-white/10 card px-4 py-2.5 text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Süre</label>
              <div className="text-sm text-gray-500 px-4 py-2.5">
                Başlangıç ve bitiş saatini seçin
              </div>
            </div>
          </div>
        ) : (
          /* Günlük İzin Formu */
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Başlangıç Tarihi</label>
              <input
                type="date"
                name="start_date"
                required
                className="w-full rounded-xl border border-white/10 card px-4 py-2.5 text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Bitiş Tarihi</label>
              <input
                type="date"
                name="end_date"
                required
                className="w-full rounded-xl border border-white/10 card px-4 py-2.5 text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Açıklama / Mazeret</label>
          <textarea 
            name="reason" 
            rows={4}
            required
            placeholder="İzin talebinizin detaylarını buraya yazabilirsiniz..."
            className="w-full rounded-xl border border-white/10 card px-4 py-3 text-white outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 resize-none"
          ></textarea>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/5">
           <button
             type="submit"
             disabled={loading}
             className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {loading ? 'Gönderiliyor...' : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Talebi İlet
                </>
             )}
           </button>
        </div>
      </form>
    </div>
  )
}
