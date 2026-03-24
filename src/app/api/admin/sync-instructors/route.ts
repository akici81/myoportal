import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { data: profile } = await serverClient
      .from('profiles').select('role').eq('id', user.id).single()
    if (!['system_admin', 'mudur_yardimcisi'].includes(profile?.role || '')) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const adminClient = serviceKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : serverClient

    // 1. Tüm instructor rollerini çek
    const { data: profiles, error: pError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('role', 'instructor')
    
    if (pError || !profiles) throw new Error('Profilleri çekerken hata: ' + pError?.message)

    // 2. Tablodaki tüm hocaları çek
    const { data: instructors, error: iError } = await adminClient
      .from('instructors')
      .select('*')

    if (iError || !instructors) throw new Error('Hocaları çekerken hata: ' + iError?.message)

    let syncCount = 0
    let linkCount = 0

    // 3. Eşleştirme yap
    for (const p of profiles) {
      // Zaten profile_id ile eşleşmiş mi?
      const existingById = instructors.find(i => i.profile_id === p.id)
      if (existingById) continue // Zaten senkronize

      // Email ile eşleşen var mı? (Eskiden açılmış hoca kaydı olabilir)
      const existingByEmail = instructors.find(i => i.email === p.email)
      
      if (existingByEmail) {
        // profile_id si yoksa bağla
        await adminClient.from('instructors')
          .update({ profile_id: p.id })
          .eq('id', existingByEmail.id)
        linkCount++
      } else {
        // Hiç yok, yeni yarat
        await adminClient.from('instructors').insert({
          profile_id: p.id,
          department_id: p.department_id,
          full_name: p.full_name,
          title: p.title,
          email: p.email,
          phone: p.phone,
          is_active: p.is_active
        })
        syncCount++
      }
    }

    return NextResponse.json({ success: true, synced: syncCount, linked: linkCount })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
