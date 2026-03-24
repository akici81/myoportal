/**
 * Auto-Generate Schedule API Route
 *
 * FAZ 9: İnsan Gibi Düşünen Otomatik Programlama Motoru
 *
 * Özellikler:
 * - Human-like scheduling (insan gibi akıllı kurallar)
 * - Shared course support (ortak ders gruplandırma)
 * - Tabu search & backtracking (eviction sistemi)
 * - Block strategy (4 saat = 2+2 bölme)
 * - Performance optimizations (Promise.all, singleton client)
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Type definitions
import {
  ProgramCourse,
  SchedulingGroup,
  Constraint,
  TimeSlot,
  Classroom,
  ScheduleEntry,
  SchedulingResult,
  Candidate,
} from '@/lib/scheduling/types'

// Modular functions
import { groupProgramCourses, calculateGroupDifficulty, formatGroupInfo, checkGroupClassroomCapacity } from '@/lib/scheduling/sharedCourses'
import { checkHardConstraints, isUzemCourse } from '@/lib/scheduling/constraints'
import { calculateScore } from '@/lib/scheduling/scoring'
import { determineBlockStrategy, checkDailyHourLimit } from '@/lib/scheduling/humanRules'

export const dynamic = 'force-dynamic'

/**
 * Ana API Handler
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Request parametreleri
    const {
      academicPeriodId,
      clearExisting = false,
      programId,
      yearNumber,
      priorityClassroomIds,
      respectConstraints = true,
      departmentId,
    } = await request.json()

    if (!academicPeriodId) {
      return NextResponse.json({ error: 'academicPeriodId gerekli' }, { status: 400 })
    }

    console.log('[Auto-Schedule] Başlıyor...')

    // =====================================================
    // 1. VERİ YÜKLEME (Paralel Promise.all ile Performance)
    // =====================================================
    const [
      programCoursesResult,
      constraintsResult,
      enrollsResult,
      timeSlotsResult,
      classroomsResult,
      existingResult
    ] = await Promise.all([
      supabase.from('program_courses').select(`*, courses(*), programs(*), instructors(*)`).eq('is_active', true),
      respectConstraints ? supabase.from('instructor_constraints').select('*') : Promise.resolve({ data: [], error: null }),
      supabase.from('program_enrollments').select('program_id, year_number, student_count').eq('period_id', academicPeriodId),
      supabase.from('time_slots').select('*').order('slot_number'),
      supabase.from('classrooms').select('*').eq('is_active', true).order('capacity'),
      supabase.from('schedule_entries').select('*').eq('period_id', academicPeriodId)
    ])

    if (programCoursesResult.error) throw programCoursesResult.error
    if (timeSlotsResult.error) throw timeSlotsResult.error
    if (classroomsResult.error) throw classroomsResult.error

    let programCourses = (programCoursesResult.data || []) as ProgramCourse[]
    const constraints = (constraintsResult.data || []) as Constraint[]
    const enrolls = enrollsResult.data || []
    const timeSlots = (timeSlotsResult.data || []) as TimeSlot[]
    let classrooms = (classroomsResult.data || []) as Classroom[]
    let existingEntries = (existingResult.data || []) as ScheduleEntry[]

    console.log(`[Auto-Schedule] ${programCourses.length} ders, ${classrooms.length} sınıf yüklendi`)

    // =====================================================
    // 2. FİLTRELEME
    // =====================================================
    if (programId) programCourses = programCourses.filter(p => p.program_id === programId)
    if (yearNumber && yearNumber > 0) programCourses = programCourses.filter(p => p.year_number === yearNumber)

    if (programCourses.length === 0) {
      return NextResponse.json({
        error: 'Filtrelere uygun ders bulunamadı',
        result: { placed: [], failed: [], stats: { totalCourses: 0, placedCourses: 0, failedCourses: 0, totalHours: 0 } }
      }, { status: 400 })
    }

    // =====================================================
    // 3. ÖĞRENCİ SAYILARINI ENJEKTE ET
    // =====================================================
    for (const pc of programCourses) {
      const match = enrolls.find(e => e.program_id === pc.program_id && e.year_number === pc.year_number)
      pc.student_count = match ? match.student_count : 30
    }

    // =====================================================
    // 4. UZEM SANAL SINIFI OLUŞTUR
    // =====================================================
    let uzemClassroom = classrooms.find(c => c.name === 'UZEM_VIRTUAL' || c.name.toLowerCase().includes('uzem'))

    if (!uzemClassroom) {
      uzemClassroom = {
        id: 'uzem-virtual-classroom',
        name: 'UZEM_VIRTUAL',
        capacity: 9999,
        building: 'Sanal',
        type: 'normal',
        has_projector: false,
        has_smartboard: false,
        has_computer: false
      } as Classroom
      classrooms.push(uzemClassroom)
    }

    // =====================================================
    // 5. ÖNCELİKLİ SINIFLAR
    // =====================================================
    if (priorityClassroomIds?.length > 0) {
      const pSet = new Set(priorityClassroomIds)
      const priorityClassrooms = classrooms.filter(c => pSet.has(c.id))
      const otherClassrooms = classrooms.filter(c => !pSet.has(c.id))
      classrooms = [...priorityClassrooms, ...otherClassrooms]
    }

    // =====================================================
    // 6. MEVCUT SCHEDULE'U TEMİZLE
    // =====================================================
    if (clearExisting && programCourses.length > 0) {
      await supabase.from('schedule_entries').delete().eq('period_id', academicPeriodId).in('program_course_id', programCourses.map(p => p.id))
      existingEntries = []
    }

    // =====================================================
    // 7. GRUPLAMA (Shared Course Logic)
    // =====================================================
    const schedulingGroups = groupProgramCourses(programCourses)
    console.log(`[Auto-Schedule] ${schedulingGroups.length} grup oluşturuldu`)

    // Zorluk sıralaması
    const sortedGroups = schedulingGroups.sort((a, b) => calculateGroupDifficulty(b) - calculateGroupDifficulty(a))

    // =====================================================
    // 8. GÜNLÜK DAĞILIM & RESULT INIT
    // =====================================================
    const dayDistribution = new Map<number, number>([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0]])
    existingEntries.forEach(e => dayDistribution.set(e.day_of_week, (dayDistribution.get(e.day_of_week) || 0) + 1))

    const result: SchedulingResult = {
      placed: [],
      failed: [],
      stats: { totalCourses: programCourses.length, placedCourses: 0, failedCourses: 0, totalHours: 0 }
    }

    // =====================================================
    // 9. TABU SEARCH & BACKTRACKING QUEUE
    // =====================================================
    const evictionCounts = new Map<string, number>()
    const MAX_EVICTIONS_PER_GROUP = 5
    let queue = [...sortedGroups]
    let loopProtect = 0
    const MAX_LOOPS = sortedGroups.length * 15

    while (queue.length > 0 && loopProtect < MAX_LOOPS) {
      loopProtect++
      const group = queue.shift()!

      const isUzem = isUzemCourse(group.programCourses[0])
      const usableClassrooms = isUzem ? [uzemClassroom] : classrooms.filter(c => c.name !== 'UZEM_VIRTUAL' && checkGroupClassroomCapacity(group, c.capacity))

      if (usableClassrooms.length === 0) {
        result.failed.push({ group: group.id, courses: formatGroupInfo(group), reason: 'Uygun kapasiteli sınıf yok' })
        continue
      }

      const blocksToPlace = determineBlockStrategy(group.weeklyHours)
      let groupPlacedFully = true
      let tempPlacedEntries: ScheduleEntry[] = []

      for (const blockSize of blocksToPlace) {
        const validDays = [1, 2, 3, 4, 5].filter(day => {
          for (const pc of group.programCourses) {
            if (!checkDailyHourLimit(pc, day, blockSize, [...existingEntries, ...result.placed, ...tempPlacedEntries], programCourses)) {
              return false
            }
          }
          return true
        })

        if (validDays.length === 0) {
          groupPlacedFully = false
          break
        }

        let candidatePool: Candidate[] = []

        for (const day of validDays) {
          for (let startIdx = 0; startIdx <= timeSlots.length - blockSize; startIdx++) {
            const blockSlots = timeSlots.slice(startIdx, startIdx + blockSize)

            for (const classroom of usableClassrooms) {
              let isHardValid = true
              let totalScore = 0
              let blockers = new Set<string>()

              for (const slot of blockSlots) {
                for (const pc of group.programCourses) {
                  const hardCheck = checkHardConstraints({
                    programCourse: pc,
                    day,
                    slot,
                    classroom,
                    existingEntries: [...existingEntries, ...result.placed, ...tempPlacedEntries],
                    allProgramCourses: programCourses,
                    constraints,
                    isUzem
                  })

                  if (!hardCheck.valid) {
                    isHardValid = false
                    hardCheck.blockingCourseIds.forEach(id => blockers.add(id))
                  }

                  totalScore += calculateScore({
                    programCourse: pc,
                    day,
                    slot,
                    classroom,
                    existingEntries: [...existingEntries, ...result.placed, ...tempPlacedEntries],
                    allProgramCourses: programCourses,
                    constraints,
                    dayDistribution,
                    isUzem,
                    classroomsData: classrooms,
                    timeSlotsData: timeSlots
                  })
                }
              }

              candidatePool.push({
                day,
                startSlotIdx: startIdx,
                classroom,
                score: totalScore,
                isValid: isHardValid,
                blockingCourseIds: Array.from(blockers)
              })
            }
          }
        }

        let bestCandidate: Candidate | null = null
        const pureCandidates = candidatePool.filter(c => c.isValid)

        if (pureCandidates.length > 0) {
          pureCandidates.sort((a, b) => a.score - b.score)
          bestCandidate = pureCandidates[0]
        } else {
          const repairCandidates = candidatePool.filter(c => {
            if (c.blockingCourseIds.includes('SYSTEM_HARD')) return false
            return c.blockingCourseIds.length <= 2 && c.blockingCourseIds.every(cid => (evictionCounts.get(cid) || 0) < MAX_EVICTIONS_PER_GROUP)
          })

          if (repairCandidates.length > 0) {
            repairCandidates.sort((a, b) => (a.score + a.blockingCourseIds.length * 100) - (b.score + b.blockingCourseIds.length * 100))
            bestCandidate = repairCandidates[0]
          }
        }

        if (bestCandidate) {
          if (!bestCandidate.isValid) {
            const victims = bestCandidate.blockingCourseIds
            const groupsToEvict = new Set<string>()

            victims.forEach(v_id => {
              const pc = programCourses.find(p => p.id === v_id)
              if (pc) groupsToEvict.add(pc.shared_group_id || `single-${pc.id}`)
            })

            groupsToEvict.forEach(gId => {
              const groupToReQueue = schedulingGroups.find(g => g.id === gId)
              if (groupToReQueue) {
                const groupIds = groupToReQueue.programCourses.map(p => p.id)
                result.placed = result.placed.filter(e => !groupIds.includes(e.program_course_id))
                evictionCounts.set(gId, (evictionCounts.get(gId) || 0) + 1)
                queue.push(groupToReQueue)
                result.stats.placedCourses -= groupToReQueue.programCourses.length
              }
            })
          }

          const blockSlots = timeSlots.slice(bestCandidate.startSlotIdx, bestCandidate.startSlotIdx + blockSize)

          for (const slot of blockSlots) {
            for (const pc of group.programCourses) {
              tempPlacedEntries.push({
                program_course_id: pc.id,
                time_slot_id: slot.id,
                day_of_week: bestCandidate.day,
                classroom_id: bestCandidate.classroom.id,
                period_id: academicPeriodId,
                instructor_id: pc.instructor_id
              })
            }
          }

          dayDistribution.set(bestCandidate.day, (dayDistribution.get(bestCandidate.day) || 0) + blockSize)
        } else {
          groupPlacedFully = false
          break
        }
      }

      if (groupPlacedFully) {
        result.placed.push(...tempPlacedEntries)
        result.stats.placedCourses += group.programCourses.length
      } else {
        result.failed.push({ group: group.id, courses: formatGroupInfo(group), reason: 'Uygun yer bulunamadı veya günlük limit aşıldı' })
      }
    }

    // =====================================================
    // 10. İSTATİSTİKLERİ TAMAMLA
    // =====================================================
    const placedSet = new Set(result.placed.map(e => e.program_course_id))
    result.stats.placedCourses = placedSet.size
    result.stats.failedCourses = programCourses.length - placedSet.size
    result.stats.totalHours = result.placed.length

    console.log(`[Auto-Schedule] Tamamlandı: ${result.stats.placedCourses}/${result.stats.totalCourses}`)

    // =====================================================
    // 11. VERİTABANINA KAYDET (Batch)
    // =====================================================
    if (result.placed.length > 0) {
      const BATCH_SIZE = 50
      for (let i = 0; i < result.placed.length; i += BATCH_SIZE) {
        const chunk = result.placed.slice(i, i + BATCH_SIZE)
        await supabase.from('schedule_entries').insert(chunk)
      }
    }

    // =====================================================
    // 12. RESPONSE
    // =====================================================
    const dayDistributionStr = {} as Record<string, number>
    dayDistribution.forEach((val, key) => { dayDistributionStr[key.toString()] = val })

    return NextResponse.json({
      message: `${result.stats.placedCourses} / ${result.stats.totalCourses} ders programa yerleştirildi.`,
      result,
      dayDistribution: dayDistributionStr,
      evictions: Array.from(evictionCounts.entries()).map(([groupId, count]) => ({ groupId, count }))
    })
  } catch (err: any) {
    console.error('[Auto-Schedule] HATA:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
