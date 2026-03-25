import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/system/time-slots
 * Otomatik olarak 08:00-20:50 arası standart MYO ders saatlerini oluşturur
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // Kullanıcı system_admin mi kontrol et
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'system_admin') {
      return NextResponse.json({ error: 'Bu işlem için sistem yöneticisi yetkisi gerekli' }, { status: 403 })
    }

    // Standart MYO ders saatleri (50 dakikalık slotlar)
    const timeSlots = [
      { slot_number: 1, start_time: '08:00', end_time: '08:50', is_uzem_slot: false },
      { slot_number: 2, start_time: '09:00', end_time: '09:50', is_uzem_slot: false },
      { slot_number: 3, start_time: '10:00', end_time: '10:50', is_uzem_slot: false },
      { slot_number: 4, start_time: '11:00', end_time: '11:50', is_uzem_slot: false },
      { slot_number: 5, start_time: '12:00', end_time: '12:50', is_uzem_slot: false },
      { slot_number: 6, start_time: '13:00', end_time: '13:50', is_uzem_slot: false },
      { slot_number: 7, start_time: '14:00', end_time: '14:50', is_uzem_slot: false },
      { slot_number: 8, start_time: '15:00', end_time: '15:50', is_uzem_slot: false },
      { slot_number: 9, start_time: '16:00', end_time: '16:50', is_uzem_slot: false },
      { slot_number: 10, start_time: '17:00', end_time: '17:50', is_uzem_slot: true },
      { slot_number: 11, start_time: '18:00', end_time: '18:50', is_uzem_slot: true },
      { slot_number: 12, start_time: '19:00', end_time: '19:50', is_uzem_slot: true },
      { slot_number: 13, start_time: '20:00', end_time: '20:50', is_uzem_slot: true },
    ]

    // Mevcut kayıtları kontrol et
    const { count } = await supabase
      .from('time_slots')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0) {
      return NextResponse.json({
        error: 'Time slots tablosu zaten dolu. Önce mevcut kayıtları silmeniz gerekiyor.'
      }, { status: 400 })
    }

    // Toplu insert
    const { data, error } = await supabase
      .from('time_slots')
      .insert(timeSlots)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `${data.length} adet ders saati başarıyla oluşturuldu`,
      data
    })

  } catch (err: any) {
    console.error('Time slots oluşturma hatası:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/system/time-slots
 * Tüm time_slots kayıtlarını siler (temizlik için)
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'system_admin') {
      return NextResponse.json({ error: 'Bu işlem için sistem yöneticisi yetkisi gerekli' }, { status: 403 })
    }

    const { error } = await supabase.from('time_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Tüm time_slots silindi' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
