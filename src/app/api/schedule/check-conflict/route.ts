import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })

    const body = await request.json()
    const { period_id, program_course_id, classroom_id, instructor_id, day_of_week, time_slot_id } = body

    if (!period_id || !classroom_id || !instructor_id || day_of_week === undefined || !time_slot_id) {
      return NextResponse.json({ error: 'Eksik parametreler (period, classroom, instructor, day, slot zorunludur)' }, { status: 400 })
    }

    const conflicts: Array<{ type: string; detail: string }> = []

    // 1. Derslik Çakışması
    const { data: classroomConflict } = await supabase
      .from('schedule_entries')
      .select('id, program_courses(courses(name))')
      .eq('period_id', period_id)
      .eq('classroom_id', classroom_id)
      .eq('day_of_week', day_of_week)
      .eq('time_slot_id', time_slot_id)
      .maybeSingle()

    if (classroomConflict) {
      const cName = (classroomConflict as any)?.program_courses?.courses?.name ?? 'Bilinmeyen Ders'
      conflicts.push({ type: 'classroom_conflict', detail: `Derslik şu an dolu: (${cName}) işleniyor.` })
    }

    // 2. Hoca Çakışması
    const { data: instructorConflict } = await supabase
      .from('schedule_entries')
      .select('id, program_courses(courses(name))')
      .eq('period_id', period_id)
      .eq('instructor_id', instructor_id)
      .eq('day_of_week', day_of_week)
      .eq('time_slot_id', time_slot_id)
      .maybeSingle()

    if (instructorConflict) {
      const cName = (instructorConflict as any)?.program_courses?.courses?.name ?? 'Bilinmeyen Ders'
      conflicts.push({ type: 'instructor_conflict', detail: `Hoca bu saatte başka bir derste: (${cName})` })
    }

    // 3. Program (Sınıf) Çakışması
    if (program_course_id) {
      // Önce bu dersin hangi programa ve yıla ait olduğunu bulalım
      const { data: pcData } = await supabase.from('program_courses').select('program_id, year_number, is_shared, shared_group_id').eq('id', program_course_id).single()
      
      if (pcData) {
        // Bu program_id ve year_number için o saatte ders var mı?
        const { data: entryData } = await supabase.from('schedule_entries').select('program_course_id').eq('period_id', period_id).eq('day_of_week', day_of_week).eq('time_slot_id', time_slot_id)
        
        if (entryData && entryData.length > 0) {
          const entryIds = entryData.map(e => e.program_course_id)
          const { data: conflictingPcs } = await supabase.from('program_courses')
            .select('id, courses(name), is_shared, shared_group_id')
            .in('id', entryIds)
            .eq('program_id', pcData.program_id)
            .eq('year_number', pcData.year_number)
            
          if (conflictingPcs && conflictingPcs.length > 0) {
            // Eğer ikisi de ortak ders ve aynı gruptaysa çakışma sayılmaz (Zaten birlikte işleniyor)
            const isSameSharedGroup = pcData.is_shared && conflictingPcs.every(c => c.is_shared && c.shared_group_id === pcData.shared_group_id);
            if (!isSameSharedGroup) {
               conflicts.push({ type: 'program_conflict', detail: 'Öğrenci grubu (sınıf) bu saatte başka bir derse kayıtlı.' })
            }
          }
        }
      }
    }

    return NextResponse.json({ hasConflict: conflicts.length > 0, conflicts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
