'use client'
import { useState } from 'react'
import { FileText, Send, CheckCircle2, ChevronRight, MessageSquare, Target, Lightbulb } from 'lucide-react'

export default function GeneralRequestsForm() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simüle edilmiş sunucu isteği (V2 demo kurgusu, Faz 12 API'ye bağlanacak)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1200)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center animate-in">
        <div className="rounded-full bg-cyan-500/20 p-4 mb-6 ring-4 ring-cyan-500/10">
           <CheckCircle2 className="h-16 w-16 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Talebiniz Alındı</h2>
        <p className="max-w-md text-gray-400 mb-8">
          Dilekçeniz kayıt numarası ile MYO Müdür Yardımcısı paneline iletilmiştir. Süreci "Taleplerim" sekmesindeki listeden takip edebilirsiniz. (Bu özellik tam onay mekanizmasına bağlanacaktır.)
        </p>
        <button 
          onClick={() => setSubmitted(false)}
          className="inline-flex items-center justify-center rounded-xl card px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Yeni Bir Dilekçe Daha Oluştur
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-cyan-400" />
          Dilekçe & Evrak İstemi
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Kurum içine iletilmesini istediğiniz fiziki belgelerin dijital eşleniklerini ve resmi taleplerinizi bildirin. Talebiniz anında Sekreterlik ve MYO yönetimine düşecektir.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/5 card/30 p-8">
        
        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Talep Konusu / Başlık</label>
            <input 
              type="text" 
              required
              placeholder="Örn: Konferans Görevlendirme Evrakı Hakkında"
              className="w-full rounded-xl border border-white/10 card px-4 py-3 text-sm text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none" 
            />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Talep Türü</label>
            <select required className="w-full rounded-xl border border-white/10 card px-4 py-3 text-sm text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none">
              <option value="belge">Belge Talebi (Katılım, Görev vs.)</option>
              <option value="muafiyet">Muafiyet / İntibak Kararı Önerisi</option>
              <option value="diger">Diğer Resmi Dilekçeler</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Ek (PDF veya Link) - Opsiyonel</label>
            <input 
              type="text" 
              placeholder="Google Drive veya Dosya Linki"
              className="w-full rounded-xl border border-white/10 card px-4 py-3 text-sm text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none" 
            />
          </div>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Dilekçe İçeriği / Detaylı Talep</label>
            <textarea 
               rows={6} 
               required
               className="w-full rounded-xl border border-white/10 card px-4 py-3 text-sm text-white focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 outline-none resize-y"
               placeholder="Makamınıza iletmek istediğim konunun detayları şunlardır..."
            />
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-white/5">
           <button
             type="submit"
             disabled={loading}
             className="inline-flex items-center rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-cyan-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
           >
             {loading ? 'Sisteme İletiliyor...' : (
               <>
                 Talebi Resmi Kayıtlara Ekle 
                 <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
               </>
             )}
           </button>
        </div>
      </form>
    </div>
  )
}
