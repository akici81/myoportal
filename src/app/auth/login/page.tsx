'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ROLE_ROUTES, type UserRole } from '@/types'
import { Eye, EyeOff, LogIn, Loader2, GraduationCap, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      let loginEmail = email.trim()
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@rumeli.edu.tr`
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        toast.error('Giriş başarısız', {
          description: error.message === 'Invalid login credentials' 
            ? 'E-posta veya şifre hatalı' 
            : error.message,
        })
        return
      }

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single()

        if (profileError || !profile) {
          toast.error('Profil bulunamadı')
          return
        }

        toast.success(`Hoş geldiniz, ${profile.full_name}!`)
        
        const roleKey = profile.role as UserRole
        let redirectPath = ROLE_ROUTES[roleKey]
        
        if (!redirectPath) {
          redirectPath = `/dashboard/${profile.role.replace(/_/g, '-')}`
        }
        
        console.log('Navigating to:', redirectPath)
        window.location.replace(redirectPath)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      toast.error('Bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #0a0e1a 40%, #0f172a 100%)' }}>
      
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0.05) 40%, transparent 70%)',
            animation: 'orb-drift 12s ease-in-out infinite',
            filter: 'blur(40px)',
          }} />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.05) 40%, transparent 70%)',
            animation: 'orb-drift 16s ease-in-out infinite reverse',
            filter: 'blur(40px)',
          }} />
        <div className="absolute left-1/2 top-1/4 h-80 w-80 -translate-x-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, rgba(139,92,246,0.03) 50%, transparent 70%)',
            animation: 'orb-drift 20s ease-in-out infinite 4s',
            filter: 'blur(50px)',
          }} />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            animation: 'orb-drift 14s ease-in-out infinite 2s',
            filter: 'blur(60px)',
          }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }} />

        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md" style={{ animation: 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl relative"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 50%, #8b5cf6 100%)',
              boxShadow: '0 0 0 8px rgba(6,182,212,0.1), 0 0 60px rgba(6,182,212,0.3), 0 0 120px rgba(37,99,235,0.15)',
              animation: 'pulseGlow 3s ease-in-out infinite',
            }}>
            <GraduationCap className="h-10 w-10 text-white drop-shadow-lg" />
            {/* Sparkle decorator */}
            <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-cyan-300 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight"
            style={{ background: 'linear-gradient(135deg, #fff 30%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            MYO Portal
          </h1>
          <p className="mt-2 text-sm text-gray-500">İstanbul Rumeli Üniversitesi</p>
        </div>

        {/* Glass form card */}
        <div className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px) saturate(1.2)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
          {/* Inner glow effect */}
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.4), transparent 70%)' }} />

          <h2 className="mb-1 text-lg font-semibold text-white">Giriş Yap</h2>
          <p className="mb-6 text-sm text-gray-500">Hesabınıza erişmek için bilgilerinizi girin</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                Kullanıcı Adı veya E-posta
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek veya ornek@rumeli.edu.tr"
                required
                className="w-full rounded-xl border px-4 py-3 text-white placeholder-gray-600 transition-all duration-300 focus:outline-none focus:ring-2"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(6,182,212,0.5)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1), 0 0 20px rgba(6,182,212,0.1)'
                  e.target.style.background = 'rgba(6,182,212,0.03)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.boxShadow = 'none'
                  e.target.style.background = 'rgba(255,255,255,0.03)'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
                Şifre
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border px-4 py-3 pr-12 text-white placeholder-gray-600 transition-all duration-300 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(6,182,212,0.5)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,0.1), 0 0 20px rgba(6,182,212,0.1)'
                    e.target.style.background = 'rgba(6,182,212,0.03)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                    e.target.style.boxShadow = 'none'
                    e.target.style.background = 'rgba(255,255,255,0.03)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 transition-colors hover:text-gray-300 p-1 rounded-lg hover:bg-white/5"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 50%, #7c3aed 100%)',
                boxShadow: loading ? 'none' : '0 0 30px rgba(6,182,212,0.3), 0 8px 20px -4px rgba(37,99,235,0.4)',
              }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                  animation: 'shimmerSlide 2s ease-in-out infinite',
                }} />
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Giriş Yap
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          © 2025 İstanbul Rumeli Üniversitesi MYO — Tüm hakları saklıdır
        </p>
      </div>
    </div>
  )
}
