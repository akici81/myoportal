import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Belirli bir hafta için tüm schedule_entries için boş kayıtlar oluştur
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  
  const { period_id, week_number, start_date } = body

  if (!period_id || !week_number || !start_date) {
    return NextResponse.json(
      { error: 'period_id, week_number ve start_date gerekli' },
      { status: 400 }
    )
  }

  // Önce bu dönemdeki tüm aktif schedule_entries'i al
  const { data: entries, error: entriesError } = await supabase
    .from('schedule_entries')
    .select(`
      id,
      day_of_week,
      program_courses:program_course_id (
        courses:course_id (id, code, name),
        programs:program_id (id, name)
      ),
      time_slots:time_slot_id (start_time),
      instructors:instructor_id (id, full_name)
    `)
    .eq('period_id', period_id)

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 })
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: 'Bu dönemde ders programı bulunamadı' }, { status: 404 })
  }

  // Her entry için lesson_date hesapla
  const baseDate = new Date(start_date)
  const records = entries.map(entry => {
    // day_of_week: 1=Pazartesi, 5=Cuma
    const dayOffset = (entry.day_of_week - 1) // Pazartesi = 0
    const lessonDate = new Date(baseDate)
    lessonDate.setDate(baseDate.getDate() + dayOffset)
    
    return {
      schedule_entry_id: entry.id,
      period_id,
      week_number,
      lesson_date: lessonDate.toISOString().split('T')[0],
      attendance_type: 'orgon' as const
    }
  })

  // Toplu upsert
  const { data, error } = await supabase
    .from('lesson_tracking_records')
    .upsert(records, {
      onConflict: 'schedule_entry_id,week_number,period_id',
      ignoreDuplicates: true
    })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    created: data?.length || 0,
    total_entries: entries.length
  })
}
