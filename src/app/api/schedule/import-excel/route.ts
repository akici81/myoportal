import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

/**
 * Excel Import API for Schedule
 *
 * Expects Excel format:
 * Row 1: Title (merged)
 * Row 2: Headers (Saat, Pazartesi, Salı, Çarşamba, Perşembe, Cuma)
 * Row 3+: Time slots with course data in format:
 *         CODE\nNAME\nINSTRUCTOR\nCLASSROOM
 *
 * Maps courses by matching:
 * - Course code → program_courses.courses.code
 * - Instructor name → instructors.full_name
 * - Classroom name → classrooms.name
 * - Time → time_slots.start_time
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const periodId = formData.get('period_id') as string
    const programId = formData.get('program_id') as string | null
    const yearNumber = formData.get('year_number') ? parseInt(formData.get('year_number') as string) : null
    const clearExisting = formData.get('clear_existing') === 'true'

    if (!file || !periodId) {
      return NextResponse.json({ error: 'File ve period_id zorunlu' }, { status: 400 })
    }

    // Parse Excel
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 })

    if (jsonData.length < 3) {
      return NextResponse.json({ error: 'Excel formatı hatalı (en az 3 satır olmalı)' }, { status: 400 })
    }

    // Skip title (row 0) and headers (row 1)
    const dataRows = jsonData.slice(2)

    // Load reference data
    const [timeSlotsRes, classroomsRes, instructorsRes, programCoursesRes] = await Promise.all([
      supabase.from('time_slots').select('id, start_time, end_time, slot_number').order('slot_number'),
      supabase.from('classrooms').select('id, name'),
      supabase.from('instructors').select('id, full_name'),
      supabase.from('program_courses').select(`
        id, program_id, year_number, semester, instructor_id,
        courses(id, code, name),
        programs(id, name, short_code)
      `).eq('period_id', periodId)
    ])

    if (timeSlotsRes.error) throw timeSlotsRes.error
    if (classroomsRes.error) throw classroomsRes.error
    if (instructorsRes.error) throw instructorsRes.error
    if (programCoursesRes.error) throw programCoursesRes.error

    const timeSlots = timeSlotsRes.data || []
    const classrooms = classroomsRes.data || []
    const instructors = instructorsRes.data || []
    let programCourses = programCoursesRes.data || []

    // Filter program courses if program/year specified
    if (programId) {
      programCourses = programCourses.filter(pc => pc.program_id === programId)
    }
    if (yearNumber !== null) {
      programCourses = programCourses.filter(pc => pc.year_number === yearNumber)
    }

    // Create lookup maps
    const timeSlotMap = new Map<string, string>() // start_time -> id
    timeSlots.forEach(slot => {
      const timeKey = slot.start_time.slice(0, 5) // "08:00"
      timeSlotMap.set(timeKey, slot.id)
    })

    const classroomMap = new Map<string, string>() // name -> id
    classrooms.forEach(room => {
      classroomMap.set(room.name.toLowerCase().trim(), room.id)
    })

    const instructorMap = new Map<string, string>() // full_name -> id
    instructors.forEach(inst => {
      instructorMap.set(inst.full_name.toLowerCase().trim(), inst.id)
    })

    const courseCodeMap = new Map<string, any>() // code -> program_course
    programCourses.forEach(pc => {
      const course = (pc as any).courses
      if (course?.code) {
        courseCodeMap.set(course.code.toUpperCase().trim(), pc)
      }
    })

    // Clear existing entries if requested
    if (clearExisting) {
      let deleteQuery = supabase.from('schedule_entries').delete().eq('period_id', periodId)
      if (programId) {
        // Need to find program_course_ids for this program
        const pcIds = programCourses.map(pc => pc.id)
        if (pcIds.length > 0) {
          deleteQuery = deleteQuery.in('program_course_id', pcIds)
        }
      }
      const { error: deleteError } = await deleteQuery
      if (deleteError) throw deleteError
    }

    // Parse data rows
    const entries: any[] = []
    const skipped: any[] = []
    const DAYS_MAP: Record<number, string> = { 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma' }

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row || row.length < 2) continue

      // First column is time
      const timeCell = String(row[0] || '').trim()
      const timeMatch = timeCell.match(/(\d{2}:\d{2})/)
      if (!timeMatch) continue

      const timeKey = timeMatch[1]
      const timeSlotId = timeSlotMap.get(timeKey)
      if (!timeSlotId) {
        skipped.push({ row: i + 3, reason: `Saat bulunamadı: ${timeKey}` })
        continue
      }

      // Process each day column (1-5)
      for (let day = 1; day <= 5; day++) {
        const cellIndex = day // columns are: 0=time, 1=Mon, 2=Tue...
        const cellValue = String(row[cellIndex] || '').trim()
        if (!cellValue) continue

        // Parse cell format: CODE\nNAME\nINSTRUCTOR\nCLASSROOM
        const lines = cellValue.split('\n').map(l => l.trim()).filter(l => l)
        if (lines.length < 2) {
          skipped.push({ row: i + 3, day: DAYS_MAP[day], reason: 'Hücre formatı eksik (min 2 satır)' })
          continue
        }

        const courseCode = lines[0].toUpperCase().trim()
        const instructorName = lines.length >= 3 ? lines[2].toLowerCase().trim() : null
        const classroomName = lines.length >= 4 ? lines[3].toLowerCase().trim() : null

        // Find program_course
        const programCourse = courseCodeMap.get(courseCode)
        if (!programCourse) {
          skipped.push({ row: i + 3, day: DAYS_MAP[day], code: courseCode, reason: 'Ders kodu program_courses tablosunda bulunamadı' })
          continue
        }

        // Find instructor (use from program_course or match by name)
        let instructorId = programCourse.instructor_id
        if (!instructorId && instructorName) {
          instructorId = instructorMap.get(instructorName) || null
        }
        if (!instructorId) {
          skipped.push({ row: i + 3, day: DAYS_MAP[day], code: courseCode, reason: 'Eğitmen bulunamadı' })
          continue
        }

        // Find classroom
        let classroomId: string | null = null
        if (classroomName) {
          classroomId = classroomMap.get(classroomName) || null
        }
        if (!classroomId) {
          // Try to find a default classroom
          const defaultClassroom = classrooms.find(c => c.name.includes('GENEL') || c.name.includes('A101'))
          classroomId = defaultClassroom?.id || null
        }
        if (!classroomId) {
          skipped.push({ row: i + 3, day: DAYS_MAP[day], code: courseCode, reason: 'Derslik bulunamadı' })
          continue
        }

        entries.push({
          period_id: periodId,
          program_course_id: programCourse.id,
          instructor_id: instructorId,
          classroom_id: classroomId,
          day_of_week: day,
          time_slot_id: timeSlotId
        })
      }
    }

    // Batch insert
    const BATCH_SIZE = 50
    const inserted: any[] = []
    const failed: any[] = []

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE)
      const { data, error } = await supabase.from('schedule_entries').insert(batch).select()

      if (error) {
        // If batch fails, try one by one
        for (const entry of batch) {
          const { data: singleData, error: singleError } = await supabase
            .from('schedule_entries')
            .insert(entry)
            .select()

          if (singleError) {
            failed.push({ entry, error: singleError.message })
          } else if (singleData) {
            inserted.push(...singleData)
          }
        }
      } else if (data) {
        inserted.push(...data)
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        total_rows: dataRows.length,
        entries_created: inserted.length,
        entries_failed: failed.length,
        entries_skipped: skipped.length
      },
      inserted,
      failed,
      skipped
    })

  } catch (err: any) {
    console.error('Import error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
