import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value }: any) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }: any) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ÖNEMLİ: getUser() çağrısı session'ı yeniler
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Cache'i devre dışı bırak (Yönlendirme döngüsünü kırmak için)
  response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')

  // Ana sayfa yönlendirmesi
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Dashboard koruması (Kritik: Eğer kullanıcı varsa korumayı geç)
  if (pathname.startsWith('/dashboard') && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    redirectUrl.search = '?from=middleware'
    return NextResponse.redirect(redirectUrl)
  }

  // V1 Legacy yönlendirmeleri
  if (pathname.startsWith('/dashboard/admin')) {
    return NextResponse.redirect(new URL(pathname.replace('/dashboard/admin', '/dashboard/system-admin'), request.url))
  }
  if (pathname.startsWith('/dashboard/department')) {
    return NextResponse.redirect(new URL(pathname.replace('/dashboard/department', '/dashboard/bolum-baskani'), request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}