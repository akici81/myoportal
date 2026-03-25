'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ROLE_ROUTES, type UserRole } from '@/types'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'

// ─── Performans Notu ───────────────────────────────────────────────────────
// Eski kod: signIn → getUser → profiles sorgusu (3 sıralı işlem)
// Yeni kod: signIn → profiles sorgusu (2 paralel olmayan ama optimize edilmiş)
// + router.push (SPA geçişi) vs window.location.replace (tam sayfa yenileme)
// ──────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const loginEmail = email.trim().includes('@')
        ? email.trim()
        : `${email.trim()}@rumeli.edu.tr`

      // 1. Auth + profile sorgusunu tek seferde yap
      // signInWithPassword içinde user.id döner, hemen profile sorguluyoruz
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        toast.error(
          error.message === 'Invalid login credentials'
            ? 'Kullanıcı adı veya şifre hatalı'
            : 'Giriş başarısız'
        )
        return
      }

      // 2. Profile — user.id zaten elimizde, ayrı getUser() çağrısına gerek yok
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        toast.error('Profil bulunamadı. Lütfen yönetici ile iletişime geçin.')
        return
      }

      toast.success(`Hoş geldiniz, ${profile.full_name.split(' ')[0]}!`)

      // 3. SPA geçişi — window.location.replace yerine router.push
      // Bu sayfa yenileme olmadan geçiş yapar, çok daha hızlı hissedilir
      const redirectPath = ROLE_ROUTES[profile.role as UserRole]
        ?? `/dashboard/${profile.role.replace(/_/g, '-')}`

      router.push(redirectPath)

    } catch (err: any) {
      toast.error('Beklenmeyen bir hata oluştu.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #B71C1C 0%, #7F1212 100%)' }}
    >
      {/* Arkaplan doku */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="w-full max-w-sm relative">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Üst kırmızı çizgi */}
          <div className="h-1.5 w-full" style={{ background: '#B71C1C' }} />

          <div className="px-8 pt-8 pb-8">

            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                style={{ background: '#B71C1C' }}
              >
                <span className="text-white font-black text-sm tracking-tight">MYO</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111827' }}>
                MYO Portal
              </h1>
              <p className="text-sm mt-1 font-medium" style={{ color: '#9CA3AF' }}>
                İstanbul Rumeli Üniversitesi
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#6B7280' }}>
                  Kullanıcı Adı veya E-posta
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek veya ornek@rumeli.edu.tr"
                  required
                  autoComplete="username"
                  className="w-full border rounded-xl px-4 py-3 text-sm transition-all duration-150 focus:outline-none"
                  style={{
                    borderColor: '#E4E7EE',
                    background: '#F7F8FA',
                    color: '#111827',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#B71C1C'
                    e.target.style.boxShadow   = '0 0 0 3px rgba(183,28,28,0.10)'
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = '#E4E7EE'
                    e.target.style.boxShadow   = 'none'
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#6B7280' }}>
                  Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full border rounded-xl px-4 py-3 pr-12 text-sm transition-all duration-150 focus:outline-none"
                    style={{
                      borderColor: '#E4E7EE',
                      background: '#F7F8FA',
                      color: '#111827',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = '#B71C1C'
                      e.target.style.boxShadow   = '0 0 0 3px rgba(183,28,28,0.10)'
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#E4E7EE'
                      e.target.style.boxShadow   = 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#9CA3AF' }}
                  >
                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold py-3.5 rounded-xl transition-all text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: loading ? '#9CA3AF' : '#B71C1C' }}
                onMouseEnter={e => { if (!loading) (e.target as HTMLElement).style.background = '#7F1212' }}
                onMouseLeave={e => { if (!loading) (e.target as HTMLElement).style.background = '#B71C1C' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Giriş Yap
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs mt-7 leading-relaxed" style={{ color: '#D1D5DE' }}>
              Hesap sorunları için Sistem Yöneticisi ile iletişime geçiniz.
              <br />
              <span className="font-medium" style={{ color: '#9CA3AF' }}>MYO Portal v3.0</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}