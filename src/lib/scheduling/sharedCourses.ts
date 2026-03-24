/**
 * Shared Course Grouping Logic
 *
 * Ortak derslerin (shared_group_id ile) gruplandırılması ve
 * grup bazlı yerleştirme mantığı.
 */

import { ProgramCourse, SchedulingGroup } from './types'

/**
 * Program derslerini shared_group_id'ye göre gruplandır
 *
 * Mantık:
 * - Aynı shared_group_id'ye sahip dersler tek grup olarak yerleştirilir
 * - Grubun toplam öğrenci sayısı = tüm programların öğrenci sayıları toplamı
 * - Grubun weekly_hours = herhangi bir dersin weekly_hours'u (hepsi aynı olmalı)
 * - Grup olarak yerleştirildiğinde TÜM program_courses için entry oluşturulur
 */
export function groupProgramCourses(programCourses: ProgramCourse[]): SchedulingGroup[] {
  const groupsMap = new Map<string, SchedulingGroup>()

  for (const pc of programCourses) {
    // Grup ID: shared_group_id varsa onu kullan, yoksa unique ID
    const groupId = pc.shared_group_id || `single-${pc.id}`

    if (!groupsMap.has(groupId)) {
      // Yeni grup oluştur
      groupsMap.set(groupId, {
        id: groupId,
        programCourses: [pc],
        weeklyHours: pc.courses?.weekly_hours || 2,
        instructorId: pc.instructor_id,
        studentCount: pc.student_count || 30,
        isShared: !!pc.shared_group_id,
        requiresLab: !!pc.courses?.requires_lab,
        requiresKitchen: !!pc.courses?.requires_kitchen,
        needsComputer: !!pc.courses?.needs_computer,
        needsProjector: !!pc.courses?.needs_projector
      })
    } else {
      // Mevcut gruba ekle
      const group = groupsMap.get(groupId)!
      group.programCourses.push(pc)

      // Toplam öğrenci sayısını artır (ortak ders = tüm programlar birlikte)
      group.studentCount += (pc.student_count || 30)

      // Gereksinimler (ANY mantığı: herhangi biri gerektiriyorsa grup da gerektirir)
      if (pc.courses?.requires_lab) group.requiresLab = true
      if (pc.courses?.requires_kitchen) group.requiresKitchen = true
      if (pc.courses?.needs_computer) group.needsComputer = true
      if (pc.courses?.needs_projector) group.needsProjector = true
    }
  }

  return Array.from(groupsMap.values())
}

/**
 * Grup için zorluk skoru hesapla (priority sıralaması için)
 * Zorlu gruplar önce yerleştirilir
 */
export function calculateGroupDifficulty(group: SchedulingGroup): number {
  let difficulty = 0

  // Lab/Mutfak gereklilikleri = çok zor yerleşir
  if (group.requiresLab || group.requiresKitchen) {
    difficulty += 200
  }

  // Kalabalık gruplar zor yerleşir
  if (group.studentCount > 50) {
    difficulty += 100
  }

  // Ortak dersler (shared) çakışma riski yüksek
  if (group.isShared) {
    difficulty += 150
  }

  // UZEM dersler kolay yerleşir (negatif difficulty)
  // Not: UZEM kontrolü caller tarafından yapılmalı, burada sadece flag check edebiliriz
  // Ancak course bilgisi group içinde programCourses[0]'dan alınabilir

  return difficulty
}

/**
 * Shared grup içindeki derslerin çakışma kontrolü
 *
 * Önemli: Aynı shared_group_id'ye sahip dersler aynı saat-gün-sınıfta olabilir
 * (Çünkü birlikte işlenecekler). Bu ÇAKIŞMA DEĞİL, beklenen durumdur.
 */
export function isSameSharedGroup(pc1: ProgramCourse, pc2: ProgramCourse): boolean {
  return !!(
    pc1.shared_group_id &&
    pc2.shared_group_id &&
    pc1.shared_group_id === pc2.shared_group_id
  )
}

/**
 * Program çakışması kontrolü (öğrenci grubu çakışması)
 *
 * Çakışma olur:
 * - Aynı program_id + aynı year_number
 * - ANCAK aynı shared_group değiller
 */
export function checkProgramConflict(
  pc1: ProgramCourse,
  pc2: ProgramCourse
): boolean {
  // Aynı program ve yıl mı?
  const sameGroup = pc1.program_id === pc2.program_id && pc1.year_number === pc2.year_number

  if (!sameGroup) return false

  // Aynı shared group ise çakışma YOK
  if (isSameSharedGroup(pc1, pc2)) return false

  // Aksi halde ÇAKIŞMA VAR
  return true
}

/**
 * Grup bilgisi formatla (debug/log için)
 */
export function formatGroupInfo(group: SchedulingGroup): string {
  const courseNames = group.programCourses
    .map(pc => pc.courses?.code || pc.course_id)
    .join(' + ')

  const programNames = group.programCourses
    .map(pc => pc.programs?.short_code || pc.program_id.substring(0, 6))
    .join(' + ')

  return `[${group.isShared ? 'SHARED' : 'SINGLE'}] ${courseNames} (${programNames}) - ${group.studentCount} öğrenci - ${group.weeklyHours} saat/hafta`
}

/**
 * Grup için sınıf kapasitesi kontrolü
 */
export function checkGroupClassroomCapacity(
  group: SchedulingGroup,
  classroomCapacity: number
): boolean {
  // Toplam öğrenci sayısının %80'i sığmalı (tolerans için)
  return classroomCapacity >= group.studentCount * 0.8
}
