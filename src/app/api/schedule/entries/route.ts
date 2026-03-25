import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const url = new URL(request.url)
    const period_id = url.searchParams.get('period_id')
    const program_id = url.searchParams.get('program_id')

    if (!period_id) return NextResponse.json({ error: 'period_id zorunlu' }, { status: 400 })

    let query = supabase.from('schedule_entries').select(`
      *,
      time_slots(*),
      classrooms(*),
      instructors(id, full_name, title),
      program_courses(
        id, year_number, semester,
        courses(id, name, code, course_type),
        programs(id, name, short_code)
      )
    `).eq('period_id', period_id)

    // Eger program_id verildiyse filtreleyebiliriz ama genelde frontend tum alip filtreliyor.
    // Şimdilik aynen dönüyoruz.

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })

    const body = await request.json()
    const { period_id, program_course_id, classroom_id, instructor_id, day_of_week, time_slot_id } = body

    if (!period_id || !program_course_id || !classroom_id || !instructor_id || day_of_week === undefined || !time_slot_id) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    // Insert
    const { data, error } = await supabase.from('schedule_entries').insert({
      period_id,
      program_course_id,
      classroom_id,
      instructor_id,
      day_of_week,
      time_slot_id
    }).select().single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Bu slot zaten dolu (Benzersiz kısıtlama hatası)' }, { status: 400 })
      throw error
    }

    return NextResponse.json({ success: true, entry: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })

    const body = await request.json()
    const { id, day_of_week, time_slot_id } = body

    if (!id || day_of_week === undefined || !time_slot_id) {
      return NextResponse.json({ error: 'id, day_of_week ve time_slot_id zorunlu' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('schedule_entries')
      .update({ day_of_week, time_slot_id })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Hedef slot zaten dolu' }, { status: 400 })
      throw error
    }

    return NextResponse.json({ success: true, entry: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'id zorunlu' }, { status: 400 })

    const { error } = await supabase.from('schedule_entries').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
