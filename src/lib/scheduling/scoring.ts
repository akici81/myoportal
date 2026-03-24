/**
 * Scoring System
 *
 * Ders yerleştirme için skor hesaplama sistemi.
 * Düşük skor = daha iyi yerleşim
 */

import {
  ProgramCourse,
  TimeSlot,
  Classroom,
  ScheduleEntry,
  Constraint,
} from './types'
import { calculateHumanScore } from './humanRules'

interface ScoringContext {
  programCourse: ProgramCourse
  day: number
  slot: TimeSlot
  classroom: Classroom
  existingEntries: ScheduleEntry[]
  allProgramCourses: ProgramCourse[]
  constraints: Constraint[]
  dayDistribution: Map<number, number>
  isUzem: boolean
  classroomsData: Classroom[]
  timeSlotsData: TimeSlot[]
}

/**
 * Günlük dağılım dengesi
 * Bazı günler çok yüklü, bazıları boş olmasın
 */
function applyDayDistributionScore(context: ScoringContext): number {
  const { day, dayDistribution } = context

  const values = Array.from(dayDistribution.values())
  const minDay = Math.min(...values)
  const maxDay = Math.max(...values)
  const thisDay = dayDistribution.get(day) || 0

  let score = 0

  // En yoğun güne ders ekleme = ceza
  if (thisDay === maxDay) {
    score += 20
  }

  // En boş güne ders ekleme = bonus
  if (thisDay === minDay) {
    score -= 15
  }

  return score
}

/**
 * Derslik kapasitesi uyumu
 * Öğrenci sayısına en uygun sınıfı bul
 */
function applyClassroomCapacityScore(context: ScoringContext): number {
  const { programCourse, classroom, isUzem } = context

  if (isUzem) return 0 // UZEM için geçerli değil

  const studentCount = programCourse.student_count || 30
  const diff = classroom.capacity - studentCount

  let score = 0

  // Mükemmel uyum (0-10 kişi fazla)
  if (diff >= 0 && diff <= 10) {
    score -= 20 // Bonus
  }

  // Çok büyük sınıf (30+ kişi fazla)
  if (diff > 30) {
    score += 15 // Ceza (küçük sınıfları boşa harcama)
  }

  return score
}

/**
 * UZEM slot optimizasyonu
 * UZEM dersler akşam saatlerine, normal dersler gündüze
 */
function applyUzemSlotScore(context: ScoringContext): number {
  const { slot, isUzem } = context

  const startHour = parseInt(slot.start_time.split(':')[0])

  if (isUzem) {
    // UZEM için özel slot varsa büyük bonus
    if (slot.is_uzem_slot) {
      return -80
    }

    // Akşam saatleri UZEM için ideal
    if (startHour >= 17) {
      return -50
    }

    // Gündüz UZEM = ceza (normal derslere yer aç)
    if (startHour >= 9 && startHour <= 15) {
      return 60
    }
  } else {
    // Normal dersler için akşam = ceza
    if (startHour >= 17) {
      return 60
    }
  }

  return 0
}

/**
 * Eğitmen soft constraint skoru
 * Tercihlere uygun yerleştirme
 */
function applyInstructorPreferenceScore(context: ScoringContext): number {
  const { programCourse, day, slot, constraints } = context

  if (!programCourse.instructor_id) return 0

  let score = 0

  const startHour = parseInt(slot.start_time.split(':')[0])

  // Soft constraint'lere bak
  for (const c of constraints.filter(x => x.instructor_id === programCourse.instructor_id && !x.is_hard)) {
    switch (c.constraint_type) {
      case 'prefer_morning':
        if (startHour >= 13) score += 15
        break
      case 'prefer_afternoon':
        if (startHour < 13) score += 15
        break
      case 'prefer_day':
        if (c.day_of_week === day) score -= 25 // Tercih edilen gün = bonus
        break
      case 'avoid_day':
        if (c.day_of_week === day) score += 25 // Kaçınılan gün = ceza
        break
    }
  }

  return score
}

/**
 * ANA SKOR HESAPLAMA FONKSİYONU
 * Tüm skor bileşenlerini topla
 */
export function calculateScore(context: ScoringContext): number {
  let totalScore = 0

  // 1. Human-like rules (en önemli)
  totalScore += calculateHumanScore({
    day: context.day,
    slot: context.slot,
    classroom: context.classroom,
    programCourse: context.programCourse,
    existingEntries: context.existingEntries,
    allProgramCourses: context.allProgramCourses,
    timeSlotsData: context.timeSlotsData,
    classroomsData: context.classroomsData,
    isUzem: context.isUzem
  })

  // 2. Günlük dağılım dengesi
  totalScore += applyDayDistributionScore(context)

  // 3. Derslik kapasitesi uyumu
  totalScore += applyClassroomCapacityScore(context)

  // 4. UZEM slot optimizasyonu
  totalScore += applyUzemSlotScore(context)

  // 5. Eğitmen tercihleri (soft)
  totalScore += applyInstructorPreferenceScore(context)

  return totalScore
}
