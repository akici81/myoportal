'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, CheckCircle2, ChevronRight, MessageSquare, Target, Lightbulb } from 'lucide-react'

export default function EvaluationPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simüle edilmiş sunucu isteği (V2 demo kurgusu)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1500)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center animate-in">
        <div className="rounded-full bg-emerald-500/20 p-4 mb-6 ring-4 ring-emerald-500/10">
           <CheckCircle2 className="h-16 w-16 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-default mb-2" style={{ color: 'var(--text)' }}>Değerlendirmeniz Alındı</h2>
        <p className="max-w-md text-muted mb-8">
          Katılımınız için teşekkür ederiz. Vermiş olduğunuz yanıtlar, MYO eğitim kalitesini artırmak üzere kalite komisyonuna anonim olarak iletilmiştir.
        </p>
        <Link 
          href="/dashboard/instructor" 
          className="inline-flex items-center justify-center rounded-xl card px-6 py-3 text-sm font-medium text-default transition-colors hover:bg-gray-700" style={{ color: 'var(--text)' }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Dashboard'a Dön
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in">
      {/* Header */}
      <div>
        <Link href="/dashboard/instructor" className="inline-flex items-center text-sm text-muted hover:text-default mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" /> Eğitmen Paneline Dön
        </Link>
        <h1 className="text-3xl font-bold text-default mb-2 tracking-tight" style={{ color: 'var(--text)' }}>
          Birim İçi Değerlendirme Formu
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          Bu anket, Rumeli Üniversitesi Meslek Yüksekokulu'ndaki akademik ve idari süreçleri değerlendirmenizi ve iyileştirme önerilerinizi toplamak amacıyla hazırlanmıştır.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Bölüm 1 */}
        <div className="rounded-2xl border border-white/5 card/30 overflow-hidden">
           <div className="bg-cyan-600 px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <Target className="h-5 w-5 text-cyan-400" />
              <h2 className="font-semibold text-default">Akademik Süreçler & Fiziksel Şartlar</h2>
           </div>
           <div className="p-6 space-y-6">
              <div className="space-y-3">
                 <label className="text-sm font-medium text-muted">1. Sınıf ve laboratuvarların fiziksel koşulları ders işlemeye ne derece uygundur?</label>
                 <select required className="w-full rounded-xl border border-white/10 card px-4 py-3 text-sm text-default focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none" style={{ color: 'var(--text)' }}>
                    <option value="">Lütfen seçiniz...</option>
                    <option value="5">Çok Uygun</option>
                    <option value="4">Kısmen Uygun</option>
                    <option value="3">Nötr</option>
                    <option value="2">Yetersiz</option>
                    <option value="1">Çok Yetersiz</option>
                 </select>
              </div>

              <div className="space-y-3">
                 <label className="text-sm font-medium text-muted">2. İdari birimlerle olan iletişim ve süreç yönetiminden memnuniyet dereceniz nedir?</label>
                 <select required className="w-full rounded-xl border border-white/10 card px-4 py-3 text-sm text-default focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none" style={{ color: 'var(--text)' }}>
                    <option value="">Lütfen seçiniz...</option>
                    <option value="5">Çok Memnunum</option>
                    <option value="4">Memnunum</option>
                    <option value="3">Kısmen Memnunum</option>
                    <option value="2">Memnun Değilim</option>
                    <option value="1">Hiç Memnun Değilim</option>
                 </select>
              </div>
           </div>
        </div>

        {/* Bölüm 2 */}
        <div className="rounded-2xl border border-white/5 card/30 overflow-hidden">
           <div className="bg-cyan-600 px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              <h2 className="font-semibold text-default">Açık Uçlu Değerlendirmeler</h2>
           </div>
           <div className="p-6 space-y-6">
              <div className="space-y-3">
                 <label className="text-sm font-medium text-muted">Derslerin işleyişi ve öğrenci katılımı hakkında eklemek/önermek istedikleriniz:</label>
                 <textarea 
                    rows={4} 
                    className="w-full rounded-xl border border-white/10 card px-4 py-3 text-sm text-default focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none" style={{ color: 'var(--text)' }}
                    placeholder="Deneyimlerinizi ve önerilerinizi yazabilirsiniz..."
                 />
              </div>

              <div className="space-y-3">
                 <label className="text-sm font-medium text-muted">Kurum içi işleyiş hakkında genel mülahazalarınız (İsteğe Bağlı):</label>
                 <div className="relative">
                   <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-gray-500" />
                   <textarea 
                      rows={3} 
                      className="w-full rounded-xl border border-white/10 card pl-12 pr-4 py-3 text-sm text-default focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none" style={{ color: 'var(--text)' }}
                      placeholder="Görüşleriniz..."
                   />
                 </div>
              </div>
           </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-4 pt-4">
           <Link href="/dashboard/instructor" className="text-sm font-medium text-muted hover:text-default px-4 py-2">
             İptal
           </Link>
           <button
             type="submit"
             disabled={loading}
             className="inline-flex items-center rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-default shadow-lg transition-all hover:bg-cyan-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group" style={{ color: 'var(--text)' }}
           >
             {loading ? 'Gönderiliyor...' : (
               <>
                 Değerlendirmeyi İlet 
                 <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
               </>
             )}
           </button>
        </div>
      </form>
    </div>
  )
}
