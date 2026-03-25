import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })

    const body = await request.json()
    const { period_id, day_of_week, time_slot_id, min_capacity = 0 } = body

    if (!period_id || day_of_week === undefined || !time_slot_id) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    // O saatte dolu olan sınıfların ID'lerini bul
    const { data: busyEntries } = await supabase
      .from('schedule_entries')
      .select('classroom_id')
      .eq('period_id', period_id)
      .eq('day_of_week', day_of_week)
      .eq('time_slot_id', time_slot_id)

    const busyClassroomIds = new Set((busyEntries || []).map(e => e.classroom_id))

    // Tüm aktif sınıfları çek
    const { data: allClassrooms, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('is_active', true)
      .gte('capacity', min_capacity)
      .order('capacity', { ascending: true })

    if (error) throw error

    // Her sınıfa müsaitlik bilgisi ekle
    const classroomsWithAvailability = (allClassrooms || []).map(c => ({
      ...c,
      is_available: !busyClassroomIds.has(c.id),
    }))

    const suggested = classroomsWithAvailability.filter(c => c.is_available)
    const busy = classroomsWithAvailability.filter(c => !c.is_available)

    return NextResponse.json({
      classrooms: suggested,              // geriye dönük uyumluluk
      all_classrooms: classroomsWithAvailability,  // tüm liste (doluluk dahil)
      suggested,
      busy,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
