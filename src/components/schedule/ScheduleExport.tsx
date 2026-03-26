'use client'

import { useState, useRef } from 'react'
import { FileSpreadsheet, Printer, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { ScheduleEntry, TimeSlot } from '@/types'

interface ScheduleExportProps {
  entries: ScheduleEntry[]
  timeSlots: TimeSlot[]
  title: string
  compact?: boolean
}

function getInstructor(e: ScheduleEntry) { return (e as any).instructors ?? (e as any).instructor ?? null }
function getCourse(e: ScheduleEntry) {
  const pc = (e as any).program_courses ?? (e as any).program_course ?? null
  return pc?.courses ?? pc?.course ?? null
}
function getClassroom(e: ScheduleEntry) { return (e as any).classrooms ?? (e as any).classroom ?? null }

export function ScheduleExport({ entries, timeSlots, title }: ScheduleExportProps) {
  const [loading, setLoading] = useState<'pdf' | 'excel' | 'jpeg' | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  async function exportExcel() {
    setLoading('excel')
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Ders Programı')

      ws.mergeCells('A1:F1')
      const titleCell = ws.getCell('A1')
      titleCell.value = 'T.C. İstanbul Rumeli Üniversitesi MYO — ' + title
      titleCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0d1220' } }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      ws.getRow(1).height = 28

      const headerRow = ws.addRow(['Saat', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'])
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891b2' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      })

      for (const slot of timeSlots) {
        const row: string[] = [`${slot.start_time.slice(0, 5)}`]
        for (let d = 1; d <= 5; d++) {
          const e = entries.find(en => en.day_of_week === d && en.time_slot_id === slot.id)
          if (e) {
            const c = getCourse(e); const inst = getInstructor(e); const cls = getClassroom(e)
            row.push(`${c?.code ?? ''}\n${c?.name ?? ''}\n${inst?.full_name ?? ''}\n${cls?.name ?? ''}`)
          } else { row.push('') }
        }
        const dataRow = ws.addRow(row)
        dataRow.height = 52
        dataRow.eachCell(cell => {
          cell.alignment = { wrapText: true, vertical: 'top' }
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
        })
      }
      ws.columns = [{ width: 12 }, { width: 26 }, { width: 26 }, { width: 26 }, { width: 26 }, { width: 26 }]
      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${title}.xlsx`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Excel olarak indirildi')
    } catch (e: unknown) {
      toast.error('Excel hatası: ' + (e instanceof Error ? e.message : String(e)))
    }
    setLoading(null)
  }

  function exportPDF() {
    setLoading('pdf')
    const grid: Record<string, ScheduleEntry> = {}
    entries.forEach(e => { grid[`${e.day_of_week}_${e.time_slot_id}`] = e })

    const COLORS = ['#0ea5e9','#06b6d4','#14b8a6','#3b82f6','#8b5cf6','#f59e0b','#f97316','#ec4899','#ef4444','#84cc16']
    const instColorMap: Record<string, string> = {}
    let colorIdx = 0
    entries.forEach(e => { if (e.instructor_id && !instColorMap[e.instructor_id]) instColorMap[e.instructor_id] = COLORS[colorIdx++ % COLORS.length] })

    const instSet = new Map<string, { name: string; title: string; color: string }>()
    entries.forEach(e => {
      if (e.instructor_id && !instSet.has(e.instructor_id)) {
        const inst = getInstructor(e)
        instSet.set(e.instructor_id, { name: inst?.full_name ?? '—', title: inst?.title ?? '', color: instColorMap[e.instructor_id] })
      }
    })

    const tableRows = timeSlots.map(slot => {
      const cells = [1,2,3,4,5].map(day => {
        const e = grid[`${day}_${slot.id}`]
        if (!e) return '<td></td>'
        const color = (e.instructor_id ? instColorMap[e.instructor_id] : null) ?? '#64748b'
        const c = getCourse(e); const inst = getInstructor(e); const cls = getClassroom(e)
        return `<td><div class="cell" style="border-left:3px solid ${color};background:${color}18">
          <strong style="color:${color}">${c?.code ?? '—'}</strong><br>
          <span class="name">${c?.name ?? ''}</span><br>
          <span class="meta">${inst?.full_name?.split(' ').slice(-1)[0] ?? ''}</span>
          <span class="meta">${cls?.name ?? ''}</span>
        </div></td>`
      }).join('')
      return `<tr><td class="time">${slot.start_time.slice(0, 5)}${slot.is_uzem_slot ? ' ●' : ''}</td>${cells}</tr>`
    }).join('')

    const legendHtml = Array.from(instSet.values()).map(i =>
      `<span class="leg-item"><span class="dot" style="background:${i.color}"></span>${i.title} ${i.name}</span>`
    ).join('')

    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>${title}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#fff; color:#1a1a1a; padding:24px; }
h1 { text-align:center; font-size:15px; font-weight:800; letter-spacing:.5px; margin-bottom:4px; color:#083344; }
h2 { text-align:center; font-size:12px; color:#555; margin-bottom:16px; font-weight:600; }
.legend { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; padding:8px 12px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; }
.leg-item { display:flex; align-items:center; gap:5px; font-size:10px; color:#334155; font-weight:600; }
.dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
table { width:100%; border-collapse:collapse; font-size:9px; }
th { background:#0891b2; color:#fff; padding:8px 4px; text-align:center; border:1px solid #cbd5e1; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }
td { border:1px solid #cbd5e1; padding:3px; vertical-align:top; min-width:90px; height:36px; }
td.time { font-weight:700; text-align:right; white-space:nowrap; color:#475569; font-size:9px; min-width:46px; background:#f8fafc; padding-right:8px; vertical-align:middle; border-right:2px solid #cbd5e1; }
.cell { padding:4px 6px; border-radius:4px; height:100%; }
.cell strong { font-size:9px; display:block; margin-bottom:1px; }
.cell .name { font-size:8px; color:#1e293b; display:block; line-height:1.3; font-weight:600; margin-bottom:2px; }
.cell .meta { font-size:7.5px; color:#64748b; display:block; }
@media print { body { padding:12px; } @page { size:A4 landscape; margin:10mm; } }
</style></head><body>
<h1>T.C. İstanbul Rumeli Üniversitesi Meslek Yüksekokulu</h1>
<h2>${title} — Ders Programı</h2>
<div class="legend">${legendHtml}</div>
<table><thead><tr><th>Saat</th><th>Pazartesi</th><th>Salı</th><th>Çarşamba</th><th>Perşembe</th><th>Cuma</th></tr></thead>
<tbody>${tableRows}</tbody></table></body></html>`

    const w = window.open('', '_blank', 'width=1100,height=750')
    if (!w) { toast.error('Popup engellendi'); setLoading(null); return }
    w.document.write(html); w.document.close(); w.focus()
    setTimeout(() => { w.print(); setLoading(null) }, 600)
  }

  async function exportJPEG() {
    setLoading('jpeg')
    try {
      const html2canvasModule = await import('html2canvas')
      const html2canvas = html2canvasModule.default

      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.background = '#f5f0eb'
      container.style.padding = '24px'
      document.body.appendChild(container)

      const DAYS_MAP: Record<number, string> = { 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma' }
      const grid: Record<string, ScheduleEntry> = {}
      entries.forEach(e => { grid[`${e.day_of_week}_${e.time_slot_id}`] = e })
      const uniqueSlotIds = Array.from(new Set(entries.map(e => e.time_slot_id)))
      const sortedSlots = timeSlots.filter(s => uniqueSlotIds.includes(s.id))

      const tableHTML = `
        <div style="background: #f5f0eb; padding: 24px; width: 1200px;">
          <div style="background: #B71C1C; border-radius: 12px 12px 0 0; padding: 20px; text-align: center; color: white;">
            <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; opacity: 0.85; text-transform: uppercase;">MESLEK YÜKSEKOKULU</div>
            <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; text-transform: uppercase;">T.C. İSTANBUL RUMELİ ÜNİVERSİTESİ</div>
            <div style="font-size: 16px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">${title}</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 0 0 12px 12px; overflow: hidden;">
            <thead>
              <tr>
                <th style="background: #6d0000; color: white; padding: 10px; font-size: 12px; font-weight: 700; text-align: center; border: 1px solid #7a0000; width: 95px;">Saat</th>
                ${[1,2,3,4,5].map(d => `<th style="background: #8B0000; color: white; padding: 10px; font-size: 13px; font-weight: 700; text-align: center; border: 1px solid #7a0000;">${DAYS_MAP[d]}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${sortedSlots.map((slot, idx) => {
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#fdf8f5'
                return `
                  <tr style="background: ${rowBg};">
                    <td style="background: #8B0000; color: white; font-weight: 700; font-size: 11px; text-align: center; padding: 8px 4px; border: 1px solid #e8ddd5; white-space: nowrap;">
                      ${slot.start_time.slice(0,5)}<br/>${slot.end_time.slice(0,5)}
                    </td>
                    ${[1,2,3,4,5].map(day => {
                      const e = grid[`${day}_${slot.id}`]
                      if (!e) return '<td style="border: 1px solid #e8ddd5; min-height: 52px;"></td>'
                      const c = getCourse(e)
                      const inst = getInstructor(e)
                      const cls = getClassroom(e)
                      return `
                        <td style="border: 1px solid #e8ddd5; vertical-align: middle; text-align: center; padding: 6px 4px; min-height: 52px;">
                          <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                            ${c?.code ? `<span style="font-size: 9px; font-weight: 700; color: #8B0000; letter-spacing: 0.5px; text-transform: uppercase;">${c.code}</span>` : ''}
                            <span style="font-size: 10.5px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">${c?.name || ''}</span>
                            ${cls?.name ? `<span style="font-size: 9.5px; color: #6b7280; background: #f3f4f6; padding: 1px 6px; border-radius: 10px;">${cls.name}</span>` : ''}
                            ${inst?.full_name ? `<span style="font-size: 9px; color: #9ca3af; font-style: italic;">${inst.full_name}</span>` : ''}
                          </div>
                        </td>
                      `
                    }).join('')}
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>
      `

      container.innerHTML = tableHTML
      await new Promise<void>(resolve => setTimeout(resolve, 300))

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#f5f0eb',
        logging: false,
      })

      document.body.removeChild(container)

      const link = document.createElement('a')
      link.download = `${title.replace(/\s+/g, '-')}.jpeg`
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.click()

      toast.success('JPEG indirildi!')
    } catch (e: unknown) {
      toast.error('JPEG oluşturulamadı')
      console.error(e)
    }
    setLoading(null)
  }

  return (
    <>
      <div ref={tableRef} style={{ position: 'absolute', left: '-9999px' }} />

      <div className="flex items-center gap-2">
        <button
          onClick={exportExcel}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          title="Excel olarak indir"
        >
          {loading === 'excel'
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <FileSpreadsheet className="w-4 h-4" />
          }
          Excel
        </button>
        <button
          onClick={exportPDF}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-red-600 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          title="PDF olarak yazdır"
        >
          {loading === 'pdf'
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <Printer className="w-4 h-4" />
          }
          PDF
        </button>
        <button
          onClick={exportJPEG}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg disabled:opacity-50"
          style={{ background: 'var(--primary)' }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--accent-hover)' }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--primary)' }}
          title="JPEG olarak indir"
        >
          {loading === 'jpeg'
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <ImageIcon className="w-4 h-4" />
          }
          JPEG
        </button>
      </div>
    </>
  )
}