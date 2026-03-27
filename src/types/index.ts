// =============================================
// MYO PORTAL V2 - TYPE DEFINITIONS
// =============================================

export type UserRole = 
  | 'system_admin' 
  | 'mudur' 
  | 'mudur_yardimcisi' 
  | 'sekreter' 
  | 'bolum_baskani' 
  | 'instructor'

export const ROLE_META: Record<UserRole, { label: string; color: string }> = {
  system_admin: { label: 'Sistem Yöneticisi', color: '#ef4444' },
  mudur: { label: 'Müdür', color: '#8b5cf6' },
  mudur_yardimcisi: { label: 'Müdür Yardımcısı', color: '#a855f7' },
  sekreter: { label: 'Sekreter', color: '#3b82f6' },
  bolum_baskani: { label: 'Bölüm Başkanı', color: '#10b981' },
  instructor: { label: 'Öğretim Elemanı', color: '#f59e0b' },
}

export const ROLE_ROUTES: Record<UserRole, string> = {
  system_admin: '/dashboard/system-admin',
  mudur: '/dashboard/mudur',
  mudur_yardimcisi: '/dashboard/mudur-yardimcisi',
  sekreter: '/dashboard/sekreter',
  bolum_baskani: '/dashboard/bolum-baskani',
  instructor: '/dashboard/instructor',
}

// =============================================
// DATABASE TYPES
// =============================================

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  short_code: string
  head_id: string | null
  is_active: boolean
  created_at: string
}

export interface Program {
  id: string
  department_id: string
  name: string
  short_code: string
  duration_years: number
  is_active: boolean
  created_at: string
  // Joined
  departments?: Department
}

export interface Instructor {
  id: string
  user_id: string | null
  full_name: string
  email: string | null
  title: string
  is_active: boolean
  created_at: string
}

export interface Course {
  id: string
  code: string
  name: string
  weekly_hours: number
  course_type: 'theoretical' | 'practical' | 'mixed'
  requires_lab: boolean
  requires_kitchen: boolean
  needs_projector: boolean
  needs_smartboard: boolean
  needs_computer: boolean
  is_common: boolean
  is_elective: boolean
  is_active: boolean
  created_at: string
}

export interface Classroom {
  id: string
  name: string
  building: string
  capacity: number
  type: 'normal' | 'lab' | 'kitchen' | 'amfi' | 'atolye'
  has_projector: boolean
  has_smartboard: boolean
  has_computer: boolean
  computer_count: number
  is_active: boolean
  created_at: string
}

export interface TimeSlot {
  id: string
  slot_number: number
  start_time: string
  end_time: string
  is_uzem_slot: boolean
  is_active: boolean
}

export interface AcademicPeriod {
  id: string
  academic_year: string
  semester: 'fall' | 'spring'
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface ProgramCourse {
  id: string
  program_id: string
  course_id: string
  instructor_id: string | null
  year_number: 1 | 2
  semester: 'fall' | 'spring'
  is_active: boolean
  is_shared: boolean
  shared_group_id: string | null
  created_at: string
  // Joined
  courses?: Course
  programs?: Program
  instructors?: Instructor
}

export interface ProgramEnrollment {
  id: string
  program_id: string
  period_id: string
  year_number: 1 | 2
  student_count: number
  created_at: string
  // Joined
  programs?: Program
}

export interface ScheduleEntry {
  id: string
  program_course_id: string
  time_slot_id: string
  day_of_week: 1 | 2 | 3 | 4 | 5
  classroom_id: string
  instructor_id: string | null
  period_id: string
  created_at: string
  // Joined
  program_courses?: ProgramCourse & {
    courses?: Course
    programs?: Program
    instructors?: Instructor
  }
  time_slots?: TimeSlot
  classrooms?: Classroom
}

export interface InstructorConstraint {
  id: string
  instructor_id: string
  constraint_type: 'unavailable_day' | 'unavailable_slot' | 'prefer_day' | 'prefer_slot' | 'max_hours_per_day'
  day_of_week: number | null
  time_slot_id: string | null
  is_hard: boolean
  value: Record<string, unknown> | null
  created_at: string
}

// =============================================
// DERS TAKİP FORMU
// =============================================

export interface LessonTrackingRecord {
  id: string
  schedule_entry_id: string
  period_id: string
  week_number: number
  lesson_date: string
  attendance_type: 'orgon' | 'uzem'
  instructor_signature: 'yapildi' | 'yapilmadi' | 'telafi' | null
  pdks_signature: 'yapildi' | 'yapilmadi' | null
  enrolled_students: number | null
  attending_students: number | null
  makeup_date: string | null
  makeup_note: string | null
  filled_by: string | null
  filled_at: string | null
  created_at: string
  updated_at: string
  // Joined
  schedule_entries?: ScheduleEntry & {
    program_courses?: ProgramCourse & {
      courses?: Course
      programs?: Program
    }
    time_slots?: TimeSlot
    classrooms?: Classroom
    instructors?: Instructor
  }
}

export const SIGNATURE_STATUS: Record<string, { label: string; color: string }> = {
  yapildi:   { label: 'Yapıldı',           color: '#10b981' },
  yapilmadi: { label: 'Yapılmadı',         color: '#ef4444' },
  telafi:    { label: 'Telafi Yapılacak',  color: '#f59e0b' },
}

export const ATTENDANCE_TYPE: Record<string, string> = {
  orgon: 'ÖRGÜN',
  uzem:  'UZEM',
}

// =============================================
// HELPER TYPES
// =============================================

export const DAY_NAMES: Record<number, string> = {
  1: 'Pazartesi',
  2: 'Salı',
  3: 'Çarşamba',
  4: 'Perşembe',
  5: 'Cuma',
}

export const CLASSROOM_TYPES: Record<string, string> = {
  normal: 'Derslik',
  lab: 'Laboratuvar',
  kitchen: 'Mutfak',
  amfi: 'Amfi',
  atolye: 'Atölye',
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  address: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string
  instructor_id: string
  start_date: string
  end_date: string
  leave_type: 'annual' | 'sick' | 'excuse' | 'conference'
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  created_at: string
  updated_at: string
  
  // Joined
  instructors?: Instructor
  approver?: Profile
}

export interface Commission {
  id: string
  name: string
  type: string
  drive_folder_url: string | null
  created_at: string
}

export interface CommissionMember {
  id: string
  commission_id: string
  instructor_id: string
  role: 'baskan' | 'uye' | 'raportör'
  is_active: boolean
  created_at: string
  // Joined
  instructor?: Instructor
}

export interface MeetingRequest {
  id: string
  commission_id: string
  title: string
  proposed_date: string
  proposed_time: string
  location: string | null
  agenda: string | null
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requested_by: string
  approved_by: string | null
  notes: string | null
  created_at: string
  // Joined
  commission?: Commission
  requester?: Profile
  approver?: Profile
}

export interface InternshipRecord {
  id: string
  student_name: string
  student_number: string
  department_id: string | null
  supervisor_id: string | null
  company_name: string
  start_date: string
  end_date: string
  total_days: number
  score: number | null
  grade: string | null
  file_url: string | null
  notes: string | null
  academic_year: string
  status: 'draft' | 'submitted' | 'revision' | 'approved' | 'published' | 'rejected'
  created_at: string
  updated_at: string
  // Joined
  department?: Department
  supervisor?: Instructor
}

export interface GeneralRequest {
  id: string
  title: string
  description: string
  category: 'belge' | 'muafiyet' | 'diger'
  status: 'draft' | 'submitted' | 'revision' | 'approved' | 'published' | 'rejected'
  requester_id: string
  assignee_id: string | null
  attachment_url: string | null
  response: string | null
  created_at: string
  updated_at: string
  // Joined
  requester?: Profile
  assignee?: Profile
}


