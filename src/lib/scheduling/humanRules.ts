/**
 * Human-Like Scheduling Rules
 *
 * İnsan gibi düşünen akıllı ders programlama kuralları.
 * Öğrenci ve eğitmen deneyimini optimize eden penalty/bonus sistemi.
 */

import { TimeSlot, Classroom, ScheduleEntry, ProgramCourse } from './types'

interface HumanRuleContext {
  day: number
  slot: TimeSlot
  classroom: Classroom
  programCourse: ProgramCourse
  existingEntries: ScheduleEntry[]
  allProgramCourses: ProgramCourse[]
  timeSlotsData: TimeSlot[]
  classroomsData: Classroom[]
  isUzem: boolean
}

/**
 * Golden Hours: 10:00-14:00 arası prime time saatleri
 * İnsanlar bu saatlerde en verimli ve aktiftir
 */
export function applyGoldenHourBonus(context: HumanRuleContext): number {
  const startHour = parseInt(context.slot.start_time.split(':')[0])

  // Prime time bonus
  if (startHour >= 10 && startHour <= 14) {
    return -50 // Negatif = daha iyi
  }

  return 0
}

/**
 * Early Morning Penalty: 08:00 dersleri sevilmez
 * Öğrenciler ve eğitmenler sabah erken saatleri tercih etmez
 */
export function applyEarlyMorningPenalty(context: HumanRuleContext): number {
  const startHour = parseInt(context.slot.start_time.split(':')[0])

  if (startHour === 8) {
    return 80 // Büyük ceza
  }

  return 0
}

/**
 * Late Hour Penalty: 17:00+ akşam dersleri
 * UZEM dersler için uygun, normal dersler için ceza
 */
export function applyLateHourPenalty(context: HumanRuleContext): number {
  const startHour = parseInt(context.slot.start_time.split(':')[0])

  if (startHour >= 17) {
    // UZEM için bonus, normal dersler için ceza
    return context.isUzem ? -50 : 60
  }

  // UZEM'e gündüz saatlerde ceza (akşam saatlere yer açsın)
  if (context.isUzem && startHour >= 9 && startHour <= 15) {
    return 60
  }

  return 0
}

/**
 * Friday Prayer Time: Cuma namazı saatini boşalt (12:00-14:30)
 * Kritik önem: Bu saatlerde ders olmamalı
 */
export function applyFridayPrayerPenalty(context: HumanRuleContext): number {
  if (context.day !== 5) return 0 // Sadece Cuma günleri

  const startMins = parseInt(context.slot.start_time.split(':')[0]) * 60
    + parseInt(context.slot.start_time.split(':')[1] || '0')

  // 12:00 - 14:30 arası Cuma namazı saati
  if (startMins >= 12 * 60 && startMins <= 14 * 60 + 30) {
    return 150 // Çok yüksek ceza
  }

  return 0
}

/**
 * Building Jump Penalty: Ardışık derslerde bina değiştirme
 * Öğrenci ve eğitmen için büyük sorun
 */
export function applyBuildingJumpPenalty(context: HumanRuleContext): number {
  const { day, slot, classroom, programCourse, existingEntries, allProgramCourses, timeSlotsData, classroomsData, isUzem } = context

  if (isUzem) return 0 // UZEM için geçerli değil

  let penalty = 0

  // Aynı program-yıl için o günkü dersler
  const sameProgramSameDay = existingEntries.filter((e) => {
    if (e.day_of_week !== day) return false
    const e_pc = allProgramCourses.find(p => p.id === e.program_course_id)
    return e_pc && e_pc.program_id === programCourse.program_id && e_pc.year_number === programCourse.year_number
  })

  sameProgramSameDay.forEach(entry => {
    const entrySlot = timeSlotsData.find(s => s.id === entry.time_slot_id)
    if (!entrySlot) return

    const slotDiff = Math.abs(slot.slot_number - entrySlot.slot_number)

    // Ardışık dersler (1 slot fark)
    if (slotDiff === 1) {
      const prevClassroom = classroomsData.find(c => c.id === entry.classroom_id)

      if (prevClassroom && prevClassroom.name !== 'UZEM_VIRTUAL') {
        // Bina kontrolü
        if (prevClassroom.building && classroom.building && prevClassroom.building !== classroom.building) {
          penalty += 150 // Ardışık derste bina değiştirme FACİADIR!
        } else if (prevClassroom.id !== classroom.id) {
          penalty += 20 // Sınıf değiştirme (aynı binada) hafif ceza
        } else {
          penalty -= 15 // Aynı sınıfta devam = BONUS
        }
      }
    }
  })

  return penalty
}

/**
 * Instructor Building Jump: Eğitmen için ardışık derslerde bina değiştirme
 */
export function applyInstructorBuildingJump(context: HumanRuleContext): number {
  const { day, slot, classroom, programCourse, existingEntries, allProgramCourses, timeSlotsData, classroomsData, isUzem } = context

  if (!programCourse.instructor_id || isUzem) return 0

  let penalty = 0

  // Hocanın o günkü tüm dersleri
  const instSameDay = existingEntries.filter((e) => {
    if (e.day_of_week !== day) return false
    const e_pc = allProgramCourses.find(p => p.id === e.program_course_id)
    return e_pc && e_pc.instructor_id === programCourse.instructor_id
  })

  instSameDay.forEach(entry => {
    const entrySlot = timeSlotsData.find(s => s.id === entry.time_slot_id)
    if (!entrySlot) return

    // Ardışık dersler
    if (Math.abs(slot.slot_number - entrySlot.slot_number) === 1) {
      const prevClassroom = classroomsData.find(c => c.id === entry.classroom_id)

      if (prevClassroom && prevClassroom.name !== 'UZEM_VIRTUAL' &&
          prevClassroom.building !== classroom.building) {
        penalty += 100 // Hoca arka arkaya bina koşturmasın!
      }
    }
  })

  return penalty
}

/**
 * Gap Penalty: Öğrencinin o gün dersleri arasında boşluk (pencere ders)
 * 2-4 saat arası boşluk çok kötü (öğrenci boş boş bekler)
 */
export function applyGapPenalty(context: HumanRuleContext): number {
  const { day, slot, programCourse, existingEntries, allProgramCourses, timeSlotsData } = context

  let penalty = 0

  // Aynı program-yıl için o günkü dersler
  const sameProgramSameDay = existingEntries.filter((e) => {
    if (e.day_of_week !== day) return false
    const e_pc = allProgramCourses.find(p => p.id === e.program_course_id)
    return e_pc && e_pc.program_id === programCourse.program_id && e_pc.year_number === programCourse.year_number
  })

  sameProgramSameDay.forEach(entry => {
    const entrySlot = timeSlotsData.find(s => s.id === entry.time_slot_id)
    if (!entrySlot) return

    const slotDiff = Math.abs(slot.slot_number - entrySlot.slot_number)

    // 2-4 saat arası boşluk = Gap (pencere ders)
    if (slotDiff >= 2 && slotDiff <= 4) {
      penalty += slotDiff * 25 // 2 saat = +50, 3 saat = +75
    }
  })

  return penalty
}

/**
 * Isolated Hour Penalty: İzole tek saat dersi
 * O gün programın sadece 1-2 saati varsa ceza (okula tek ders için gelmek)
 */
export function applyIsolatedHourPenalty(context: HumanRuleContext): number {
  const { day, programCourse, existingEntries, allProgramCourses } = context

  // O gün program-yıl için kaç saat ders var?
  const progYearEntries = existingEntries.filter(e => {
    if (e.day_of_week !== day) return false
    const e_pc = allProgramCourses.find(p => p.id === e.program_course_id)
    return e_pc && e_pc.program_id === programCourse.program_id && e_pc.year_number === programCourse.year_number
  })

  // 1-2 saat için okula gelmek istemezler
  if (progYearEntries.length > 0 && progYearEntries.length < 2) {
    return 70
  }

  return 0
}

/**
 * Daily Hour Limit: Günlük maksimum 6 saat kuralı
 * Hard constraint olarak kontrol edilir
 */
export function checkDailyHourLimit(
  programCourse: ProgramCourse,
  day: number,
  blockSize: number,
  existingEntries: ScheduleEntry[],
  allProgramCourses: ProgramCourse[]
): boolean {
  const existingHours = existingEntries
    .filter(e =>
      e.day_of_week === day &&
      allProgramCourses.find(p => p.id === e.program_course_id)?.program_id === programCourse.program_id
    )
    .length

  return (existingHours + blockSize) <= 6
}

/**
 * Block Strategy: 4 saat dersleri 2+2 olarak böl
 * İnsan odaklı: 4 saat üst üste ders çok yorucu
 */
export function determineBlockStrategy(weeklyHours: number): number[] {
  if (weeklyHours === 4) {
    return [2, 2] // 4 saat = 2+2 blok
  } else if (weeklyHours > 4) {
    // 5-6 saat için de mantıklı bölme
    return [Math.floor(weeklyHours / 2), Math.ceil(weeklyHours / 2)]
  } else {
    return [weeklyHours] // 2-3 saat tek blok
  }
}

/**
 * TÜM HUMAN RULES'u topla ve final skoru hesapla
 */
export function calculateHumanScore(context: HumanRuleContext): number {
  let score = 0

  score += applyGoldenHourBonus(context)
  score += applyEarlyMorningPenalty(context)
  score += applyLateHourPenalty(context)
  score += applyFridayPrayerPenalty(context)
  score += applyBuildingJumpPenalty(context)
  score += applyInstructorBuildingJump(context)
  score += applyGapPenalty(context)
  score += applyIsolatedHourPenalty(context)

  return score
}
