/**
 * Scheduling System Type Definitions
 *
 * Otomatik programlama sistemi için kullanılan tüm tipler
 */

export interface ProgramCourse {
  id: string
  program_id: string
  course_id: string
  instructor_id: string | null
  is_shared: boolean
  shared_group_id: string | null
  year_number: number
  semester: number
  student_count: number
  courses: any // Course detayları (code, name, weekly_hours, requires_lab, vb.)
  programs: any // Program detayları (short_code, name, vb.)
  instructors: any // Eğitmen detayları
}

export interface SchedulingGroup {
  id: string // shared_group_id varsa o, yoksa "single-{pc.id}"
  programCourses: ProgramCourse[] // Gruptaki tüm program dersler
  weeklyHours: number // Haftalık ders saati
  instructorId: string | null // Eğitmen ID
  studentCount: number // Toplam öğrenci sayısı (shared ise toplamı)
  isShared: boolean // Ortak ders mi?
  requiresLab: boolean // Lab gereksinimi
  requiresKitchen: boolean // Mutfak gereksinimi
  needsComputer: boolean // Bilgisayar gereksinimi
  needsProjector: boolean // Projeksiyon gereksinimi
}

export interface Constraint {
  id: string
  instructor_id: string
  constraint_type: string // 'unavailable_day', 'unavailable_slot', 'prefer_morning', vb.
  day_of_week: number | null // 1=Pazartesi, 5=Cuma
  time_slot_id: string | null
  is_hard: boolean // Hard constraint = kesin kural, soft = tercih
}

export interface TimeSlot {
  id: string
  slot_number: number // Sıralı numara (1, 2, 3...)
  start_time: string // "08:00"
  end_time: string // "08:50"
  is_uzem_slot?: boolean // UZEM için özel slot mu?
}

export interface Classroom {
  id: string
  name: string
  capacity: number
  building: string
  type: string // 'normal', 'lab', 'kitchen', vb.
  has_projector: boolean
  has_smartboard: boolean
  has_computer: boolean
}

export interface ScheduleEntry {
  program_course_id: string
  time_slot_id: string
  day_of_week: number // 1-5 (Pazartesi-Cuma)
  classroom_id: string
  period_id: string // Academic period ID
  instructor_id?: string | null
}

export interface ConflictCheckResult {
  valid: boolean
  reason?: string
  blockingCourseIds: string[] // Çakışmaya neden olan ders ID'leri
}

export interface Candidate {
  day: number
  startSlotIdx: number
  classroom: Classroom
  score: number
  isValid: boolean
  blockingCourseIds: string[]
}

export interface SchedulingResult {
  placed: ScheduleEntry[]
  failed: FailedGroup[]
  stats: {
    totalCourses: number
    placedCourses: number
    failedCourses: number
    totalHours: number
  }
}

export interface FailedGroup {
  group: string
  courses: string
  reason: string
}
