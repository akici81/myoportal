import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

const DAY_NAMES: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  
  const periodId = searchParams.get('period_id')
  const weekNumber = searchParams.get('week_number')
  
  if (!periodId || !weekNumber) {
    return NextResponse.json({ error: 'period_id ve week_number gerekli' }, { status: 400 })
  }

  // Kayıtları çek
  const { data: records, error } = await supabase
    .from('lesson_tracking_records')
    .select(`
      *,
      schedule_entries:schedule_entry_id (
        id,
        day_of_week,
        program_courses:program_course_id (
          year_number,
          courses:course_id (code, name),
          programs:program_id (name, short_code)
        ),
        time_slots:time_slot_id (start_time),
        classrooms:classroom_id (name),
        instructors:instructor_id (full_name, title)
      )
    `)
    .eq('period_id', periodId)
    .eq('week_number', parseInt(weekNumber))
    .order('lesson_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Dönem bilgisini al
  const { data: period } = await supabase
    .from('academic_periods')
    .select('academic_year, semester')
    .eq('id', periodId)
    .single()

  // Excel oluştur
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'MYO Portal'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(`${weekNumber}. Hafta`)

  // Başlık stili
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  }

  // Başlık satırı
  const headerRow = sheet.addRow([
    'DERS KODU',
    'DERS ADI',
    'DERSİ ALAN PROGRAM',
    'DERS GÜNÜ',
    'DERS BAŞLAMA SAATİ',
    'UZEM/ÖRGÜN',
    'EĞİTMEN ADI',
    'İMZA',
    'PDKS İMZA',
    'MEVCUT ÖĞRENCİ',
    'KATILIM'
  ])

  headerRow.eachCell(cell => {
    cell.style = headerStyle
  })

  // Sütun genişlikleri
  sheet.columns = [
    { width: 12 },  // Ders Kodu
    { width: 35 },  // Ders Adı
    { width: 25 },  // Program
    { width: 12 },  // Gün
    { width: 18 },  // Saat
    { width: 12 },  // UZEM/Örgün
    { width: 30 },  // Eğitmen
    { width: 15 },  // İmza
    { width: 15 },  // PDKS İmza
    { width: 15 },  // Mevcut
    { width: 10 },  // Katılım
  ]

  // Veri satırları - güne göre grupla
  const recordsByDay = records?.reduce((acc, record) => {
    const day = record.schedule_entries?.day_of_week || 0
    if (!acc[day]) acc[day] = []
    acc[day].push(record)
    return acc
  }, {} as Record<number, typeof records>) || {}

  // Her gün için satır ekle
  for (const day of [1, 2, 3, 4, 5]) {
    const dayRecords = recordsByDay[day] || []
    if (dayRecords.length === 0) continue

    // Gün başlık satırı
    const dayRow = sheet.addRow([DAY_NAMES[day]])
    dayRow.getCell(1).style = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }
    }
    sheet.mergeCells(`A${dayRow.number}:K${dayRow.number}`)

    // Ders satırları
    dayRecords
      .sort((a: any, b: any) => {
        const timeA = a.schedule_entries?.time_slots?.start_time || ''
        const timeB = b.schedule_entries?.time_slots?.start_time || ''
        return timeA.localeCompare(timeB)
      })
      .forEach((record: any) => {
        const se = record.schedule_entries
        const course = se?.program_courses?.courses
        const program = se?.program_courses?.programs
        const instructor = se?.instructors

        const signatureMap: Record<string, string> = {
          yapildi: 'Yapıldı',
          yapilmadi: 'Yapılmadı',
          telafi: 'Telafi Yapılacak'
        }

        const row = sheet.addRow([
          course?.code || '',
          course?.name || '',
          program?.short_code || '',
          DAY_NAMES[se?.day_of_week] || '',
          se?.time_slots?.start_time?.slice(0, 5) || '',
          record.attendance_type === 'uzem' ? 'UZEM' : 'ÖRGÜN',
          `${instructor?.title || ''} ${instructor?.full_name || ''}`.trim(),
          signatureMap[record.instructor_signature] || '-',
          signatureMap[record.pdks_signature] || '-',
          record.enrolled_students ?? '-',
          record.attending_students ?? '-'
        ])

        // Duruma göre renklendirme
        const signatureCell = row.getCell(8)
        if (record.instructor_signature === 'yapildi') {
          signatureCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } }
        } else if (record.instructor_signature === 'yapilmadi') {
          signatureCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }
        } else if (record.instructor_signature === 'telafi') {
          signatureCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } }
        }

        // Border
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        })
      })

    // Boş satır
    sheet.addRow([])
  }

  // Excel buffer oluştur
  const buffer = await workbook.xlsx.writeBuffer()

  // Response
  const filename = `Ders_Takip_Formu_${period?.academic_year || ''}_${period?.semester === 'fall' ? 'Guz' : 'Bahar'}_Hafta${weekNumber}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
