import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Belirli hafta/dönem için tüm ders takip kayıtlarını getir
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  
  const periodId = searchParams.get('period_id')
  const weekNumber = searchParams.get('week_number')
  const instructorId = searchParams.get('instructor_id')
  const programId = searchParams.get('program_id')
  
  if (!periodId) {
    return NextResponse.json({ error: 'period_id gerekli' }, { status: 400 })
  }

  let query = supabase
    .from('lesson_tracking_records')
    .select(`
      *,
      schedule_entries:schedule_entry_id (
        id,
        day_of_week,
        instructor_id,
        program_courses:program_course_id (
          id,
          year_number,
          courses:course_id (id, code, name),
          programs:program_id (id, name, short_code)
        ),
        time_slots:time_slot_id (id, start_time, end_time, slot_number),
        classrooms:classroom_id (id, name, building),
        instructors:instructor_id (id, full_name, title)
      ),
      filler:filled_by (id, full_name)
    `)
    .eq('period_id', periodId)
    .order('lesson_date', { ascending: true })

  if (weekNumber) {
    query = query.eq('week_number', parseInt(weekNumber))
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // İsteğe bağlı filtreleme
  let filtered = data || []
  
  if (instructorId) {
    filtered = filtered.filter(r => r.schedule_entries?.instructor_id === instructorId)
  }
  
  if (programId) {
    filtered = filtered.filter(r => r.schedule_entries?.program_courses?.programs?.id === programId)
  }

  return NextResponse.json(filtered)
}

// POST - Yeni ders takip kaydı oluştur veya güncelle (upsert)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  
  const {
    schedule_entry_id,
    period_id,
    week_number,
    lesson_date,
    attendance_type,
    instructor_signature,
    pdks_signature,
    enrolled_students,
    attending_students,
    makeup_date,
    makeup_note,
    filled_by
  } = body

  if (!schedule_entry_id || !period_id || !week_number || !lesson_date) {
    return NextResponse.json(
      { error: 'schedule_entry_id, period_id, week_number ve lesson_date gerekli' },
      { status: 400 }
    )
  }

  // Upsert: Varsa güncelle, yoksa oluştur
  const { data, error } = await supabase
    .from('lesson_tracking_records')
    .upsert({
      schedule_entry_id,
      period_id,
      week_number,
      lesson_date,
      attendance_type: attendance_type || 'orgon',
      instructor_signature,
      pdks_signature,
      enrolled_students,
      attending_students,
      makeup_date,
      makeup_note,
      filled_by,
      filled_at: filled_by ? new Date().toISOString() : null
    }, {
      onConflict: 'schedule_entry_id,week_number,period_id'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PUT - Mevcut kaydı güncelle
export async function PUT(req: NextRequest) {
  const supabase = await createClient()
  const body = await req.json()
  
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  }

  // filled_at güncelle
  if (updates.filled_by) {
    updates.filled_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('lesson_tracking_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE - Kayıt sil
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  }

  const { error } = await supabase
    .from('lesson_tracking_records')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
