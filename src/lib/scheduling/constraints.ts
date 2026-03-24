/**
 * Constraint Checking & Conflict Detection
 *
 * Hard constraint kontrolleri ve çakışma tespiti
 */

import {
  ProgramCourse,
  TimeSlot,
  Classroom,
  ScheduleEntry,
  Constraint,
  ConflictCheckResult,
} from './types'
import { isSameSharedGroup, checkProgramConflict } from './sharedCourses'

interface ConstraintContext {
  programCourse: ProgramCourse
  day: number
  slot: TimeSlot
  classroom: Classroom
  existingEntries: ScheduleEntry[]
  allProgramCourses: ProgramCourse[]
  constraints: Constraint[]
  isUzem: boolean
}

/**
 * UZEM dersi mi kontrol et
 */
export function isUzemCourse(pc: ProgramCourse): boolean {
  if (!pc.courses) return false

  const c = pc.courses

  // Kod prefix kontrolü (Türk üniversitelerinde ortak dersler)
  const uzemPrefixes = ['ATA', 'TRD', 'İNG', 'ING', 'YDL', 'ENF']
  if (uzemPrefixes.some(prefix => c.code?.toUpperCase().startsWith(prefix))) {
    return true
  }

  // DB flag kontrolü
  if (c.is_uzem === true || c.is_common === true || c.course_type === 'distance') {
    return true
  }

  // İsim kontrolü
  if (c.name?.toLowerCase().includes('uzaktan') || c.name?.toLowerCase().includes('uzem')) {
    return true
  }

  return false
}

/**
 * Aynı derse zaten atanmış mı?
 */
function checkDuplicateAssignment(context: ConstraintContext): ConflictCheckResult {
  const { programCourse, day, slot, existingEntries } = context

  const duplicate = existingEntries.some(
    e => e.day_of_week === day && e.time_slot_id === slot.id && e.program_course_id === programCourse.id
  )

  if (duplicate) {
    return {
      valid: false,
      reason: 'Ders zaten bu slota atanmış',
      blockingCourseIds: [programCourse.id]
    }
  }

  return { valid: true, blockingCourseIds: [] }
}

/**
 * Eğitmen çakışması kontrolü
 */
function checkInstructorConflict(context: ConstraintContext): ConflictCheckResult {
  const { programCourse, day, slot, existingEntries, allProgramCourses } = context

  if (!programCourse.instructor_id) {
    return { valid: true, blockingCourseIds: [] }
  }

  const blockingInst = existingEntries.filter(e => {
    if (e.day_of_week !== day || e.time_slot_id !== slot.id) return false

    const e_pc = allProgramCourses.find(p => p.id === e.program_course_id)
    return e_pc?.instructor_id === programCourse.instructor_id
  })

  if (blockingInst.length > 0) {
    return {
      valid: false,
      reason: 'Eğitmen çakışması',
      blockingCourseIds: blockingInst.map(b => b.program_course_id)
    }
  }

  return { valid: true, blockingCourseIds: [] }
}

/**
 * Derslik çakışması kontrolü
 */
function checkClassroomConflict(context: ConstraintContext): ConflictCheckResult {
  const { day, slot, classroom, existingEntries, isUzem } = context

  // UZEM sanal sınıf çakışma yapmaz
  if (isUzem || classroom.name === 'UZEM_VIRTUAL') {
    return { valid: true, blockingCourseIds: [] }
  }

  const blockingRoom = existingEntries.filter(
    e => e.day_of_week === day && e.time_slot_id === slot.id && e.classroom_id === classroom.id
  )

  if (blockingRoom.length > 0) {
    return {
      valid: false,
      reason: 'Derslik çakışması',
      blockingCourseIds: blockingRoom.map(b => b.program_course_id)
    }
  }

  return { valid: true, blockingCourseIds: [] }
}

/**
 * Öğrenci grubu / Program çakışması kontrolü
 */
function checkStudentGroupConflict(context: ConstraintContext): ConflictCheckResult {
  const { programCourse, day, slot, existingEntries, allProgramCourses } = context

  const programConflicts = existingEntries.filter((entry) => {
    if (entry.day_of_week !== day || entry.time_slot_id !== slot.id) return false

    const entryPC = allProgramCourses.find((p) => p.id === entry.program_course_id)
    if (!entryPC) return false

    // Program conflict kontrolü (shared group aware)
    return checkProgramConflict(programCourse, entryPC)
  })

  if (programConflicts.length > 0) {
    return {
      valid: false,
      reason: 'Öğrenci grubu çakışması',
      blockingCourseIds: programConflicts.map(b => b.program_course_id)
    }
  }

  return { valid: true, blockingCourseIds: [] }
}

/**
 * Eğitmen hard constraint kontrolü
 */
function checkInstructorHardConstraints(context: ConstraintContext): ConflictCheckResult {
  const { programCourse, day, slot, constraints } = context

  if (!programCourse.instructor_id) {
    return { valid: true, blockingCourseIds: [] }
  }

  const hardConstraints = constraints.filter(
    c => c.instructor_id === programCourse.instructor_id && c.is_hard
  )

  for (const c of hardConstraints) {
    if (c.constraint_type === 'unavailable_day' && c.day_of_week === day) {
      return {
        valid: false,
        reason: 'Eğitmen bu gün müsait değil',
        blockingCourseIds: ['SYSTEM_HARD']
      }
    }

    if (c.constraint_type === 'unavailable_slot' && c.day_of_week === day && c.time_slot_id === slot.id) {
      return {
        valid: false,
        reason: 'Eğitmen bu saatte müsait değil',
        blockingCourseIds: ['SYSTEM_HARD']
      }
    }
  }

  return { valid: true, blockingCourseIds: [] }
}

/**
 * Derslik kapasite kontrolü
 */
function checkClassroomCapacity(context: ConstraintContext): ConflictCheckResult {
  const { programCourse, classroom, isUzem } = context

  // UZEM için kapasite kontrolü yapma
  if (isUzem || classroom.name === 'UZEM_VIRTUAL') {
    return { valid: true, blockingCourseIds: [] }
  }

  const students = programCourse.student_count || 30

  // %80 tolerance ile kapasite kontrolü
  if (classroom.capacity < students * 0.8) {
    return {
      valid: false,
      reason: 'Derslik kapasitesi yetersiz',
      blockingCourseIds: ['SYSTEM_HARD']
    }
  }

  return { valid: true, blockingCourseIds: [] }
}

/**
 * Derslik tip ve ekipman gereksinimleri
 */
function checkClassroomRequirements(context: ConstraintContext): ConflictCheckResult {
  const { programCourse, classroom, isUzem } = context

  // UZEM için gereksinim kontrolü yapma
  if (isUzem || classroom.name === 'UZEM_VIRTUAL') {
    return { valid: true, blockingCourseIds: [] }
  }

  const course = programCourse.courses

  // Lab gereksinimi
  if (course?.requires_lab && classroom.type !== 'lab') {
    return {
      valid: false,
      reason: 'Laboratuvar gerekli',
      blockingCourseIds: ['SYSTEM_HARD']
    }
  }

  // Mutfak gereksinimi
  if (course?.requires_kitchen && classroom.type !== 'kitchen') {
    return {
      valid: false,
      reason: 'Mutfak gerekli',
      blockingCourseIds: ['SYSTEM_HARD']
    }
  }

  // Bilgisayar gereksinimi
  if (course?.needs_computer && !classroom.has_computer) {
    return {
      valid: false,
      reason: 'Bilgisayarlı sınıf gerekli',
      blockingCourseIds: ['SYSTEM_HARD']
    }
  }

  // Projeksiyon gereksinimi
  if (course?.needs_projector && !classroom.has_projector) {
    return {
      valid: false,
      reason: 'Projeksiyonlu sınıf gerekli',
      blockingCourseIds: ['SYSTEM_HARD']
    }
  }

  return { valid: true, blockingCourseIds: [] }
}

/**
 * TÜM HARD CONSTRAINTS KONTROLÜ
 * Herhangi biri başarısız olursa yerleştirme geçersizdir
 */
export function checkHardConstraints(context: ConstraintContext): ConflictCheckResult {
  const checks = [
    checkDuplicateAssignment,
    checkInstructorConflict,
    checkClassroomConflict,
    checkStudentGroupConflict,
    checkInstructorHardConstraints,
    checkClassroomCapacity,
    checkClassroomRequirements
  ]

  let allBlockingIds: string[] = []

  for (const checkFn of checks) {
    const result = checkFn(context)
    if (!result.valid) {
      allBlockingIds.push(...result.blockingCourseIds)
    }
  }

  // Unique blocking IDs
  allBlockingIds = Array.from(new Set(allBlockingIds))

  if (allBlockingIds.length > 0) {
    return {
      valid: false,
      reason: 'Çakışma mevcut',
      blockingCourseIds: allBlockingIds
    }
  }

  return { valid: true, blockingCourseIds: [] }
}
