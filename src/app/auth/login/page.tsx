'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ROLE_ROUTES, type UserRole } from '@/types'
import { Eye, EyeOff, LogIn, Loader2, GraduationCap } from 'lucide-react'

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
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl" style={{ background: 'var(--card)' }}>
            <GraduationCap className="h-8 w-8 text-cyan-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">MYO Portal</h1>
          <p className="text-sm text-gray-400">İstanbul Rumeli Üniversitesi</p>
        </div>

        {/* Form Card */}
        <div className="card p-8">
          <h2 className="mb-1 text-lg font-semibold text-white">Giriş Yap</h2>
          <p className="mb-6 text-sm text-gray-400">Hesabınıza erişmek için bilgilerinizi girin</p>

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
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
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
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 pr-12 text-white placeholder-gray-500 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
            >
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
        <p className="mt-6 text-center text-xs text-gray-500">
          © 2025 İstanbul Rumeli Üniversitesi MYO
        </p>
      </div>
    </div>
  )
}
