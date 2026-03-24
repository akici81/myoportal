import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Yeni İzin Talebi Oluştur
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // Eğitmen kimliğini bul
    const { data: instructor } = await supabase
      .from('instructors')
      .select('id')
      .eq('email', user.email)
      .single()

    if (!instructor) {
      return NextResponse.json({ error: 'Eğitmen profili bulunamadı.' }, { status: 403 })
    }

    const json = await request.json()
    const { start_date, end_date, leave_type, reason } = json

    if (!start_date || !end_date || !leave_type) {
      return NextResponse.json({ error: 'Eksik form bilgileri.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('leave_requests')
      .insert({
        instructor_id: instructor.id,
        start_date,
        end_date,
        leave_type,
        reason,
        status: 'pending'
      })

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT: İzin Durumunu Güncelle (Sekreter/Müdür yetkisi)
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // Yetki kontrolü (Sekreter veya Admin mi?)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['sekreter', 'system_admin', 'mudur', 'mudur_yardimcisi'].includes(profile.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
    }

    const json = await request.json()
    const { id, status } = json

    if (!id || !status || !['approved', 'rejected'].includes(status)) {
       return NextResponse.json({ error: 'Geçersiz parametreler.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        approved_by: user.id
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
