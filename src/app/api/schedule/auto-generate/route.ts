import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface ProgramCourse {
  id: string
  program_id: string
  course_id: string
  instructor_id: string | null
  is_shared: boolean
  shared_group_id: string | null
  year_number: number
  semester: number
  student_count: number
  courses: any // To handle old/new db schema safely
  programs: any
  instructors: any
}

interface SchedulingGroup {
  id: string // shared_group_id if exists, otherwise pc.id
  programCourses: ProgramCourse[]
  weeklyHours: number
  instructorId: string | null
  studentCount: number
  isShared: boolean
  requiresLab: boolean
  requiresKitchen: boolean
  needsComputer: boolean
  needsProjector: boolean
}

interface Constraint {
  id: string
  instructor_id: string
  constraint_type: string
  day_of_week: number | null
  time_slot_id: string | null
  is_hard: boolean
}

interface TimeSlot {
  id: string
  slot_number: number
  start_time: string
  end_time: string
  is_uzem_slot?: boolean
}

interface Classroom {
  id: string
  name: string
  capacity: number
  building: string
  type: string
  has_projector: boolean
  has_smartboard: boolean
  has_computer: boolean
}

interface ScheduleEntry {
  program_course_id: string
  time_slot_id: string
  day_of_week: number
  classroom_id: string
  period_id: string
  instructor_id?: string | null
}

function isUzemCourse(pc: ProgramCourse): boolean {
  if (!pc.courses) return false
  const c = pc.courses
  // Check common prefixes indicating UZEM courses in TR universities
  if (['ATA', 'TRD', 'İNG', 'ING', 'YDL', 'ENF'].some(prefix => c.code?.toUpperCase().startsWith(prefix))) return true
  // Check DB flags if they exist
  if (c.is_uzem === true || c.is_common === true || c.course_type === 'distance') return true
  if (c.name?.toLowerCase().includes('uzaktan') || c.name?.toLowerCase().includes('uzem')) return true
  return false
}

function checkHardConstraints(
  pc: ProgramCourse,
  day: number,
  slot: TimeSlot,
  classroom: Classroom,
  existingEntries: ScheduleEntry[],
  allProgramCourses: ProgramCourse[],
  constraints: Constraint[],
  isUzem: boolean
): { valid: boolean; reason?: string; blockingCourseIds: string[] } {
  let blockingIds: string[] = []

  // 0. Zaten aynı derse atanmış mı?
  if (existingEntries.some(e => e.day_of_week === day && e.time_slot_id === slot.id && e.program_course_id === pc.id)) {
    return { valid: false, reason: 'Ders zaten bu slota atanmış', blockingCourseIds: [pc.id] }
  }

  // 1. Hoca Çakışması
  if (pc.instructor_id) {
    const blockingInst = existingEntries.filter(e => {
      if (e.day_of_week !== day || e.time_slot_id !== slot.id) return false
      const e_pc = allProgramCourses.find(p => p.id === e.program_course_id)
      return e_pc?.instructor_id === pc.instructor_id
    })
    if (blockingInst.length > 0) {
      blockingIds.push(...blockingInst.map(b => b.program_course_id))
    }
  }

  // 2. Derslik Çakışması (Eğer fiziki bir sınıfsa)
  if (!isUzem || classroom.name !== 'UZEM_VIRTUAL') {
    const blockingRoom = existingEntries.filter(e => e.day_of_week === day && e.time_slot_id === slot.id && e.classroom_id === classroom.id)
    if (blockingRoom.length > 0) {
      blockingIds.push(...blockingRoom.map(b => b.program_course_id))
    }
  }

  // 3. Öğrenci Grubu/Program Çakışması
  const programConflicts = existingEntries.filter((entry) => {
    if (entry.day_of_week !== day || entry.time_slot_id !== slot.id) return false
    const entryPC = allProgramCourses.find((p) => p.id === entry.program_course_id)
    if (!entryPC) return false
    
    const sameGroup = entryPC.program_id === pc.program_id && entryPC.year_number === pc.year_number
    if (sameGroup) {
        // AYNI SHARED GROUP İSE ÇATIŞMA DEĞİL (Aynı ders, farklı programlar)
        if (pc.shared_group_id && entryPC.shared_group_id && pc.shared_group_id === entryPC.shared_group_id) return false
        return true
    }
    return false
  })
  if (programConflicts.length > 0) {
    blockingIds.push(...programConflicts.map(b => b.program_course_id))
  }

  // 4. Hoca Kısıtları (Hard) - Bloklayan kurs yok, direkt sistem kısıtı
  if (pc.instructor_id) {
    for (const c of constraints.filter(c => c.instructor_id === pc.instructor_id && c.is_hard)) {
      if (c.constraint_type === 'unavailable_day' && c.day_of_week === day) return { valid: false, reason: 'Hoca bu gün müsait değil', blockingCourseIds: ['SYSTEM_HARD'] }
      if (c.constraint_type === 'unavailable_slot' && c.day_of_week === day && c.time_slot_id === slot.id) return { valid: false, reason: 'Hoca saatte müsait değil', blockingCourseIds: ['SYSTEM_HARD'] }
    }
  }

  // 5. Kapasite / Öncelikli Derslik
  if (!isUzem && classroom.name !== 'UZEM_VIRTUAL') {
    const students = pc.student_count || 30
    if (classroom.capacity < students * 0.8) return { valid: false, reason: 'Derslik kapasitesi küçük', blockingCourseIds: ['SYSTEM_HARD'] }
    
    // 6. Laboratuvar ihtiyaçları (Kesin kurallar)
    if (pc.courses?.requires_lab && classroom.type !== 'lab') return { valid: false, reason: 'Lab gerekli', blockingCourseIds: ['SYSTEM_HARD'] }
    if (pc.courses?.requires_kitchen && classroom.type !== 'kitchen') return { valid: false, reason: 'Mutfak gerekli', blockingCourseIds: ['SYSTEM_HARD'] }
    if (pc.courses?.needs_computer && !classroom.has_computer) return { valid: false, reason: 'Bilgisayar gerekli', blockingCourseIds: ['SYSTEM_HARD'] }
    if (pc.courses?.needs_projector && !classroom.has_projector) return { valid: false, reason: 'Projeksiyon gerekli', blockingCourseIds: ['SYSTEM_HARD'] }
  }

  // Unique Blocking Ids
  blockingIds = Array.from(new Set(blockingIds))

  if (blockingIds.length > 0) {
    return { valid: false, reason: 'Çakışma mevcut', blockingCourseIds: blockingIds }
  }

  return { valid: true, blockingCourseIds: [] }
}

function calculateScore(
  pc: ProgramCourse,
  day: number,
  slot: TimeSlot,
  classroom: Classroom,
  existingEntries: ScheduleEntry[],
  allProgramCourses: ProgramCourse[],
  constraints: Constraint[],
  dayDist: Map<number, number>,
  isUzem: boolean,
  classroomsData: Classroom[],
  timeSlotsData: TimeSlot[]
): number {
  let score = 0

  // 1. Cuma Öğle Namazı Saatini Boşalt (+100 Ceza)
  if (day === 5) {
    const startMins = parseInt(slot.start_time.split(':')[0]) * 60 + parseInt(slot.start_time.split(':')[1] || '0')
    if (startMins >= 12 * 60 && startMins <= 14 * 60 + 30) score += 100
  }

  // 1.1 Sabah 08:00 Ceza (Human-Like Layer)
  const startHour = parseInt(slot.start_time.split(':')[0])
  if (startHour === 8) score += 80 // 08:00 dersi sevilmez

  // 1.2 Prime Time Bonus (10:00 - 14:00)
  if (startHour >= 10 && startHour <= 14) score -= 40 // Negatif skor = Daha iyi

  // 2. Dağılım dengesi
  const minDay = Math.min(...Array.from(dayDist.values()))
  const maxDay = Math.max(...Array.from(dayDist.values()))
  const thisDay = dayDist.get(day) || 0
  if (thisDay === maxDay) score += 20
  if (thisDay === minDay) score -= 15

  // 3. Kapasite Bonusu (Öğrenci sayısına en yakın sınıf)
  if (!isUzem) {
    const diff = classroom.capacity - (pc.student_count || 30)
    if (diff >= 0 && diff <= 10) score -= 20
    if (diff > 30) score += 15
  }

  // 4. UZEM Optimizasyonu
  if (isUzem) {
     if (slot.is_uzem_slot) score -= 80
     const h = parseInt(slot.start_time.split(':')[0])
     if (h >= 17) score -= 50
     if (h >= 9 && h <= 15) score += 60 // Gündüzü meşgul etme
  } else {
     const h = parseInt(slot.start_time.split(':')[0])
     if (h >= 17) score += 60
  }

  // 5. Eğitmen Kısıtları (Soft)
  if (pc.instructor_id) {
    for (const c of constraints.filter(x => x.instructor_id === pc.instructor_id && !x.is_hard)) {
      if (c.constraint_type === 'prefer_morning' && parseInt(slot.start_time.split(':')[0]) >= 13) score += 15
      if (c.constraint_type === 'prefer_afternoon' && parseInt(slot.start_time.split(':')[0]) < 13) score += 15
      if (c.constraint_type === 'prefer_day' && c.day_of_week === day) score -= 25
    }
  }

  // ============================================
  // FAZ 8 İLERİ DÜZEY ZEKÂ KURALLARI
  // ============================================
  
  // A. Bina Değiştirme ve Anti-Gap (Öğrenci - Sınıf Bazlı)
  const sameProgramSameDay = existingEntries.filter((e) => {
    if (e.day_of_week !== day) return false;
    const e_pc = allProgramCourses.find(p => p.id === e.program_course_id);
    return e_pc && e_pc.program_id === pc.program_id && e_pc.year_number === pc.year_number;
  })

  sameProgramSameDay.forEach(entry => {
    const entrySlot = timeSlotsData.find(s => s.id === entry.time_slot_id);
    if (!entrySlot) return;

    const slotDiff = Math.abs(slot.slot_number - entrySlot.slot_number);
    
    // Blok/Ardışık Ders Kontrolü: 1 slot fark varsa ardışık derstir
    if (slotDiff === 1 && !isUzem) {
      score -= 15; // Blok dersler (yan yana saatler) her zaman daha iyidir (-15)
      
      // Bina Kontrolü: Eğer ardışık ise, ama BİNALAR FARKLIYSA büyük ceza
      const prevClassroom = classroomsData.find(c => c.id === entry.classroom_id);
      if (prevClassroom && prevClassroom.name !== 'UZEM_VIRTUAL') {
        if (prevClassroom.building && classroom.building && prevClassroom.building !== classroom.building) {
           score += 150; // Ardışık derste bina değiştirmek Faciadır!
        } else if (prevClassroom.id !== classroom.id) {
           score += 20; // Sınıf değiştirme tatlı bir ceza (Aynı sınıfı kullanmak best)
        }
      }
    }

    // GAP KONTROLÜ (Pencere Ders): Öğrencinin o gün dersi var, ama bu blok 2 ile 4 saat uzaklıkta
    // 2 saat boşluk = Gap. Öğrenci boş boş okulda bekler
    if (slotDiff >= 2 && slotDiff <= 4) {
      score += slotDiff * 25; // 2 saat boşluk = +50, 3 saat boşluk = +75 (Ceza)
    }
  })

  // B. Eğitmen Bina Jumper Kontrolü
  if (pc.instructor_id && !isUzem) {
    const instSameDay = existingEntries.filter((e) => {
      if (e.day_of_week !== day) return false;
      const e_pc = allProgramCourses.find(p => p.id === e.program_course_id);
      return e_pc && e_pc.instructor_id === pc.instructor_id;
    })

    instSameDay.forEach(entry => {
      const entrySlot = timeSlotsData.find(s => s.id === entry.time_slot_id);
      if (!entrySlot) return;
      if (Math.abs(slot.slot_number - entrySlot.slot_number) === 1) {
        const prevClassroom = classroomsData.find(c => c.id === entry.classroom_id);
        if (prevClassroom && prevClassroom.name !== 'UZEM_VIRTUAL' && prevClassroom.building !== classroom.building) {
           score += 100; // Hoca arka arkaya bina koşturmasın!
        }
      }
    })
  }

  // C. İzole Ders Saati Kontrolü (Single-hour isolation penalty)
  // Eğer o gün programın yılı/bölümü için çok az saat ders oluyorsa ceza ver
  const progYearEntries = existingEntries.filter(e => {
    if (e.day_of_week !== day) return false
    const e_pc = allProgramCourses.find(p => p.id === e.program_course_id)
    return e_pc && e_pc.program_id === pc.program_id && e_pc.year_number === pc.year_number
  })
  
  if (progYearEntries.length > 0 && progYearEntries.length < 2) {
    score += 70 // 1-2 saat için okula gelmek istemezler (Pencere ders veya izole saat)
  }

  return score
}

function calculateDifficulty(pc: ProgramCourse): number {
  let d = 0
  if (pc.courses?.requires_lab || pc.courses?.requires_kitchen) d += 200 // Lablar çok daha zor yerleşir
  if (pc.student_count > 50) d += 100 // Kalabalık sınıflar zor yerleşir
  if (pc.is_shared) d += 150 // Ortak dersler çakışma riski en yüksek olanlar
  if (isUzemCourse(pc)) d -= 100 // UZEM her yere sığar
  return d
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      academicPeriodId,
      clearExisting = false,
      programId,
      yearNumber,
      priorityClassroomIds,
      respectConstraints = true,
      departmentId,
    } = await request.json()

    if (!academicPeriodId) return NextResponse.json({ error: 'academicPeriodId gerekli' }, { status: 400 })

    // Data Loading
    const { data: rawPcs } = await supabase.from('program_courses').select(`*, courses(*), programs(*), instructors(*)`).eq('is_active', true)
    let programCourses = (rawPcs || []) as ProgramCourse[]
    
    // Filter Program
    if (programId) programCourses = programCourses.filter(p => p.program_id === programId)
    if (yearNumber && yearNumber > 0) programCourses = programCourses.filter(p => p.year_number === yearNumber)

    // Constraints & Enrolls
    let constraints: Constraint[] = []
    if (respectConstraints) {
      const { data: c } = await supabase.from('instructor_constraints').select('*')
      constraints = (c || []) as Constraint[]
    }

    const { data: enrolls } = await supabase
      .from('program_enrollments')
      .select('program_id, year_number, student_count')
      .eq('period_id', academicPeriodId)

    // Inject exact student_count into each course
    for (const pc of programCourses) {
       const match = (enrolls || []).find(e => e.program_id === pc.program_id && e.year_number === pc.year_number)
       pc.student_count = match ? match.student_count : 30 // Yoksa default 30 al
    }

    const { data: timeSlots } = await supabase.from('time_slots').select('*').order('slot_number')
    let { data: classrooms } = await supabase.from('classrooms').select('*').eq('is_active', true).order('capacity')
    
    if (!classrooms || !timeSlots) return NextResponse.json({ error: 'Sınıf/Süre veritabanı boş' }, { status: 400 })

    // Create UZEM Virtual Classroom if it doesn't exist
    let uzemClassroom = classrooms.find(c => c.name === 'UZEM_VIRTUAL' || c.name.toLowerCase().includes('uzem'))
    if (!uzemClassroom) {
      uzemClassroom = { id: 'uzem-1234', name: 'UZEM_VIRTUAL', capacity: 9999, building: 'Sanal', type: 'normal', has_projector: false, has_computer: false, has_smartboard: false } as Classroom
      classrooms.push(uzemClassroom)
    }

    // Reorder priorities
    if (priorityClassroomIds?.length > 0) {
      const pSet = new Set(priorityClassroomIds)
      const pC = classrooms.filter(c => pSet.has(c.id))
      const oC = classrooms.filter(c => !pSet.has(c.id))
      classrooms = [...pC, ...oC]
    }

    // Clear existing
    if (clearExisting && programCourses.length > 0) {
      await supabase.from('schedule_entries').delete().eq('period_id', academicPeriodId).in('program_course_id', programCourses.map(p => p.id))
    }

    const { data: exist } = await supabase.from('schedule_entries').select('*').eq('period_id', academicPeriodId)
    const existingEntries = (exist || []) as ScheduleEntry[]

    const dayDist = new Map<number, number>([[1,0],[2,0],[3,0],[4,0],[5,0]])
    existingEntries.forEach(e => dayDist.set(e.day_of_week, (dayDist.get(e.day_of_week) || 0) + 1))

    const sortedCourses = programCourses.sort((a, b) => calculateDifficulty(b) - calculateDifficulty(a))

    // GROUPING LOGIC (MANDATORY)
    const groupsMap = new Map<string, SchedulingGroup>()
    for (const pc of sortedCourses) {
      const groupId = pc.shared_group_id || `single-${pc.id}`
      if (!groupsMap.has(groupId)) {
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
        const group = groupsMap.get(groupId)!
        group.programCourses.push(pc)
        group.studentCount += (pc.student_count || 30)
      }
    }
    const schedulingGroups = Array.from(groupsMap.values())

    const result = { 
      placed: [] as ScheduleEntry[], 
      failed: [] as any[], 
      stats: { totalCourses: sortedCourses.length, placedCourses: 0, failedCourses: 0, totalHours: 0 } 
    }
    
    // FAZ 9: İNSAN GİBİ DÜŞÜNEN TABU SEARCH & BACKTRACKING MOTORU
    let queue = [...schedulingGroups]
    const evictionCounts = new Map<string, number>()
    const MAX_EVICTIONS_PER_GROUP = 5 // Limit arttırıldı
    let loopProtect = 0
    const MAX_LOOPS = schedulingGroups.length * 15

    while (queue.length > 0 && loopProtect < MAX_LOOPS) {
      loopProtect++
      const group = queue.shift()!
      
      // Herhangi bir programCourse üzerinden UZEM kontrolü (Grup içindekiler uyumlu olmalı)
      const isUzem = isUzemCourse(group.programCourses[0])
      const hoursNeeded = group.weeklyHours
      const days = [1, 2, 3, 4, 5]
      const usableClassrooms = isUzem ? [uzemClassroom] : classrooms.filter(c => c.name !== 'UZEM_VIRTUAL' && c.capacity >= group.studentCount)
      
      // Block Strategy (Human Layer): 4 saat ise 2+2 böl
      let blocksToPlace: number[] = []
      if (hoursNeeded === 4) blocksToPlace = [2, 2]
      else if (hoursNeeded > 4) blocksToPlace = [Math.floor(hoursNeeded/2), Math.ceil(hoursNeeded/2)]
      else blocksToPlace = [hoursNeeded]

      let groupPlacedFully = true
      let tempPlacedEntries: ScheduleEntry[] = []
      let groupHoursPlaced = 0

      for (const blockSize of blocksToPlace) {
        interface Candidate {
          day: number
          startSlotIdx: number
          classroom: Classroom
          score: number
          isValid: boolean
          blockingCourseIds: string[]
        }

        let candidatePool: Candidate[] = []

        // DAY-FIRST STRATEGY
        // Günleri önce değerlendiriyoruz (Basit bir day-ranking yapabiliriz)
        const dayScores = days.map(d => {
           let dScore = 0
           // O gün hoca/program yüküne bakılabilir (Gelecek fazlarda derinleştirilebilir)
           return { day: d, score: dScore }
        })
        
        for (const dayObj of dayScores) {
          const day = dayObj.day
          
          // Günlük 6 saat limiti kontrolü (HARD)
          // Her programCourse için ayrı ayrı kontrol edilmeli
          let dayLimitViolation = false
          for (const pc of group.programCourses) {
            const existingHours = [...existingEntries, ...result.placed, ...tempPlacedEntries]
              .filter(e => e.day_of_week === day && programCourses.find(p => p.id === e.program_course_id)?.program_id === pc.program_id)
              .length
            if (existingHours + blockSize > 6) {
              dayLimitViolation = true
              break
            }
          }
          if (dayLimitViolation) continue

          for (let startIdx = 0; startIdx <= timeSlots.length - blockSize; startIdx++) {
            const blockSlots = timeSlots.slice(startIdx, startIdx + blockSize)
            for (const classroom of usableClassrooms) {
              let isHardValid = true
              let tScore = 0
              let blockers = new Set<string>()

              for (const slot of blockSlots) {
                // Gruptaki TÜM dersler için çakışma kontrolü
                for (const pc of group.programCourses) {
                   const hardCheck = checkHardConstraints(pc, day, slot, classroom, [...existingEntries, ...result.placed, ...tempPlacedEntries], programCourses, constraints, isUzem)
                   if (!hardCheck.valid) {
                     isHardValid = false
                     hardCheck.blockingCourseIds.forEach(id => blockers.add(id))
                   }
                   tScore += calculateScore(pc, day, slot, classroom, [...existingEntries, ...result.placed, ...tempPlacedEntries], programCourses, constraints, dayDist, isUzem, classrooms, timeSlots)
                }
              }

              candidatePool.push({
                day, startSlotIdx: startIdx, classroom,
                score: tScore,
                isValid: isHardValid,
                blockingCourseIds: Array.from(blockers)
              })
            }
          }
        }

        // Değerlendirme
        let bestCandidate: Candidate | null = null
        const pureCandidates = candidatePool.filter(c => c.isValid)
        
        if (pureCandidates.length > 0) {
          pureCandidates.sort((a,b) => a.score - b.score)
          bestCandidate = pureCandidates[0]
        } else {
          // Eviction (Sökme) - ATOMIC
          const repairCandidates = candidatePool.filter(c => {
             if (c.blockingCourseIds.includes('SYSTEM_HARD')) return false
             return c.blockingCourseIds.every(cid => (evictionCounts.get(cid) || 0) < MAX_EVICTIONS_PER_GROUP) && c.blockingCourseIds.length <= 2
          })
          if (repairCandidates.length > 0) {
            repairCandidates.sort((a,b) => (a.score + a.blockingCourseIds.length * 100) - (b.score + b.blockingCourseIds.length * 100))
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
              const groupToReQueue = Array.from(groupsMap.values()).find(g => g.id === gId)
              if (groupToReQueue) {
                const groupIds = groupToReQueue.programCourses.map(p => p.id)
                result.placed = result.placed.filter(e => !groupIds.includes(e.program_course_id))
                evictionCounts.set(gId, (evictionCounts.get(gId) || 0) + 1)
                queue.push(groupToReQueue)
                result.stats.placedCourses -= groupToReQueue.programCourses.length
                dayDist.set(bestCandidate!.day, Math.max(0, (dayDist.get(bestCandidate!.day) || 0) - groupToReQueue.weeklyHours))
              }
            })
          }

          // Yerleştir
          const currentDay = bestCandidate.day
          const currentClassroom = bestCandidate.classroom
          const startIdx = bestCandidate.startSlotIdx
          const blockSlots = timeSlots.slice(startIdx, startIdx + blockSize)
          
          for (const slot of blockSlots) {
            for (const pc of group.programCourses) {
              tempPlacedEntries.push({ 
                program_course_id: pc.id, 
                time_slot_id: slot.id, 
                day_of_week: currentDay, 
                classroom_id: currentClassroom.id, 
                period_id: academicPeriodId,
                instructor_id: pc.instructor_id
              })
            }
          }
          groupHoursPlaced += blockSize
          dayDist.set(currentDay, (dayDist.get(currentDay) || 0) + blockSize)
        } else {
          groupPlacedFully = false
          break
        }
      }

      if (groupPlacedFully) {
        result.placed.push(...tempPlacedEntries)
        result.stats.placedCourses += group.programCourses.length
      } else {
        result.failed.push({ 
          group: group.id, 
          courses: group.programCourses.map(p => p.courses?.code).join(','),
          reason: 'Uygun yer bulunamadı veya günlük limit aşıldı (Atomic).' 
        })
      }
    }
    
    // Son İstatistik Toparlaması
    const placedSet = new Set(result.placed.map(e => e.program_course_id))
    result.stats.placedCourses = placedSet.size
    result.stats.failedCourses = sortedCourses.length - placedSet.size

    // Save success batches to DB
    if (result.placed.length > 0) {
      const insertChunks = []
      for (let i = 0; i < result.placed.length; i += 50) {
        insertChunks.push(result.placed.slice(i, i + 50))
      }
      for (const chunk of insertChunks) {
        await supabase.from('schedule_entries').insert(chunk)
      }
    }

    const dayDistributionStr = {} as Record<string, number>
    dayDist.forEach((val, key) => { dayDistributionStr[key.toString()] = val })

    return NextResponse.json({
      message: `${result.stats.placedCourses} / ${result.stats.totalCourses} ders programa yerleştirildi.`,
      result,
      dayDistribution: dayDistributionStr
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
