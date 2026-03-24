import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Çağıranın system_admin olduğunu doğrula
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { data: profile } = await serverClient
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'system_admin') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    // Service role key ile admin client oluştur
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY tanımlı değil' }, { status: 500 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await request.json()
    const { email, password, full_name, username, role, department_id, title, phone } = body

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'E-posta, şifre, ad soyad ve rol zorunlu' }, { status: 400 })
    }

    // Auth kullanıcısı oluştur
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // profiles tablosunu güncelle
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: newUser.user.id,
      email,
      full_name,
      username: username || email.split('@')[0],
      role,
      department_id: department_id || null,
      title: title || null,
      phone: phone || null,
      is_active: true,
    })

    if (profileError) {
      // Auth kullanıcısını geri al
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: newUser.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
