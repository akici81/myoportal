import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Yetkisiz', { status: 401 })

    const url = new URL(request.url)
    const period_id = url.searchParams.get('period_id')
    const program_id = url.searchParams.get('program_id') // Opsiyonel (Tümü için boş)
    
    if (!period_id) return new NextResponse('period_id zorunlu', { status: 400 })

    // Tüm schedule verisini çekiyoruz
    let query = supabase.from('schedule_entries').select(`
      *,
      time_slots(id, start_time, end_time, slot_number),
      classrooms(name, building),
      instructors(full_name, title),
      program_courses(
        year_number,
        courses(name, code, course_type),
        programs(id, name, short_code)
      )
    `).eq('period_id', period_id)

    const { data: entries, error } = await query
    if (error) throw error

    // Sınıflara göre grupla (Örn: BIL 1. Sınıf, BIL 2. Sınıf)
    const programGroups = new Map<string, any[]>()
    for (const entry of (entries || [])) {
      const pc = entry.program_courses;
      if (!pc) continue;
      
      // Eğer spesifik bir program istendiyse filtrele
      if (program_id && pc.programs?.id !== program_id) continue;
      
      const groupKey = `${pc.programs?.short_code} - ${pc.year_number}. Sınıf`
      if (!programGroups.has(groupKey)) programGroups.set(groupKey, [])
      programGroups.get(groupKey)?.push(entry)
    }

    const { data: timeSlotsData } = await supabase.from('time_slots').select('*').order('slot_number')
    const timeSlots = timeSlotsData || []

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'MYO Portal V2'
    workbook.created = new Date()

    const days = [1, 2, 3, 4, 5]

    // Her grup için ayrı sayfa veya alt alta tablolar oluşturabiliriz. Alt alta yapalım.
    const sheet = workbook.addWorksheet('Ders Programları', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    })

    sheet.columns = [
      { header: 'SAATLER', key: 'time', width: 15 },
      { header: 'PAZARTESİ', key: '1', width: 30 },
      { header: 'SALI', key: '2', width: 30 },
      { header: 'ÇARŞAMBA', key: '3', width: 30 },
      { header: 'PERŞEMBE', key: '4', width: 30 },
      { header: 'CUMA', key: '5', width: 30 },
    ]
    
    // Header Row Stillendirme
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    })

    let currentRowNumber = 2;

    for (const [groupName, groupEntries] of Array.from(programGroups.entries())) {
      // Başlık Satırı
      const titleRow = sheet.addRow([groupName, '', '', '', '', ''])
      sheet.mergeCells(`A${currentRowNumber}:F${currentRowNumber}`)
      titleRow.font = { bold: true, size: 14 }
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' }
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      currentRowNumber++
      
      for (const slot of timeSlots) {
        const rowData: any = { time: `${slot.start_time}\n${slot.end_time}` }
        const r = sheet.addRow(rowData)
        r.height = 60 // Ders isimleri sığsın
        r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
        r.getCell(1).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        
        for (const day of days) {
          // Bu slota ait dersleri bul (Birden fazla seçmeli yan yana olabilir)
          const daySlotEntries = groupEntries.filter(e => e.day_of_week === day && e.time_slot_id === slot.id)
          let cellText = ''
          
          if (daySlotEntries.length > 0) {
            cellText = daySlotEntries.map((e: any) => {
              const courseName = e.program_courses?.courses?.name
              const teacher = e.instructors ? `${e.instructors.title} ${e.instructors.full_name}` : 'Bilinmiyor'
              const room = e.classrooms ? e.classrooms.name : 'Sanal Sınıf'
              return `${courseName}\n${teacher}\n(${room})`
            }).join('\n---\n')
          }
          
          const cell = r.getCell(day + 1)
          cell.value = cellText
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
          
          // Eğer UZEM veya boş ise hafif renklendir
          if (cellText === '') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
          }
        }
        currentRowNumber++
      }
      
      // Boşluk bırak (Her grup arasına)
      sheet.addRow([])
      currentRowNumber++
    }

    const buffer = await workbook.xlsx.writeBuffer()
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="MYO_Ders_Programi.xlsx"'
      }
    })

  } catch (err: any) {
    console.error('Export Error:', err)
    return new NextResponse(err.message, { status: 500 })
  }
}
