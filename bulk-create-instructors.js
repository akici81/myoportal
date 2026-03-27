/**
 * Bulk Instructor User Creation Script
 *
 * Bu script instructors_rows.csv dosyasındaki email'i olan tüm hocalar için:
 * 1. Supabase Auth'a kullanıcı oluşturur
 * 2. Profiles tablosuna profil ekler
 * 3. Instructor.profile_id linkini günceller
 *
 * Kullanım:
 * node bulk-create-instructors.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Supabase credentials (.env.local'den alınmalı)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ltokdwxmaxjyqkcowxct.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // SERVICE ROLE KEY gerekli!

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY bulunamadı!')
  console.log('Lütfen .env.local dosyasına ekleyin:')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// CSV dosyasını parse et
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',')

  return lines.slice(1).map(line => {
    const values = line.split(',')
    const obj = {}
    headers.forEach((header, i) => {
      obj[header] = values[i] || ''
    })
    return obj
  })
}

// Email'den güvenli şifre oluştur
function generatePassword(email) {
  // Email'in ilk kısmı + Rumeli2025!
  const username = email.split('@')[0].replace(/\./g, '')
  return `Rumeli2025!`
}

// Türkçe karakterleri düzelt
function fixTurkishChars(text) {
  return text
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c')
}

async function createInstructorUser(instructor) {
  const { id: instructorId, email, full_name, department_id } = instructor

  if (!email || email.trim() === '') {
    console.log(`⏭️  Atlanıyor: ${full_name} (email yok)`)
    return { success: false, reason: 'no_email' }
  }

  console.log(`\n📧 İşleniyor: ${full_name} (${email})`)

  const password = generatePassword(email)

  try {
    // 1. Auth kullanıcısı oluştur
    console.log('   → Auth kullanıcısı oluşturuluyor...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Email doğrulaması gerekmesin
      user_metadata: {
        full_name: full_name
      }
    })

    if (authError) {
      // Kullanıcı zaten varsa hata ver ama devam et
      if (authError.message.includes('already registered')) {
        console.log('   ⚠️  Kullanıcı zaten kayıtlı, profil linkini kontrol ediyorum...')

        // Auth'dan kullanıcıyı bul
        const { data: users } = await supabase.auth.admin.listUsers()
        const existingUser = users?.users?.find(u => u.email === email)

        if (existingUser) {
          // Profile_id'yi güncelle
          const { error: updateError } = await supabase
            .from('instructors')
            .update({ profile_id: existingUser.id })
            .eq('id', instructorId)

          if (!updateError) {
            console.log(`   ✅ Profile link güncellendi: ${existingUser.id}`)
            return { success: true, userId: existingUser.id, existed: true }
          }
        }

        return { success: false, reason: 'already_exists' }
      }

      throw authError
    }

    const userId = authData.user.id
    console.log(`   ✅ Auth başarılı: ${userId}`)

    // 2. Profiles tablosuna ekle
    console.log('   → Profile oluşturuluyor...')
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: full_name,
        role: 'instructor',
        department_id: department_id
      })

    if (profileError) {
      console.error('   ❌ Profile hatası:', profileError.message)
      // Auth kullanıcısını sil (rollback)
      await supabase.auth.admin.deleteUser(userId)
      throw profileError
    }

    console.log('   ✅ Profile oluşturuldu')

    // 3. Instructor.profile_id linkini güncelle
    console.log('   → Instructor linki güncelleniyor...')
    const { error: linkError } = await supabase
      .from('instructors')
      .update({ profile_id: userId })
      .eq('id', instructorId)

    if (linkError) {
      console.error('   ❌ Link hatası:', linkError.message)
      throw linkError
    }

    console.log('   ✅ Instructor linki güncellendi')
    console.log(`   🔑 Şifre: ${password}`)

    return {
      success: true,
      userId,
      email,
      password,
      full_name
    }

  } catch (error) {
    console.error(`   ❌ HATA: ${error.message}`)
    return {
      success: false,
      error: error.message,
      email,
      full_name
    }
  }
}

async function main() {
  console.log('🚀 Toplu Öğretim Elemanı Kullanıcı Oluşturma Scripti\n')

  const csvPath = path.join(__dirname, 'instructors_rows.csv')

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV dosyası bulunamadı: ${csvPath}`)
    process.exit(1)
  }

  const instructors = parseCSV(csvPath)
  console.log(`📊 Toplam ${instructors.length} öğretim elemanı bulundu\n`)

  // Email olanları filtrele
  const withEmail = instructors.filter(i => i.email && i.email.trim() !== '')
  const withoutEmail = instructors.filter(i => !i.email || i.email.trim() === '')

  console.log(`✅ Email'i olan: ${withEmail.length}`)
  console.log(`⚠️  Email'i olmayan: ${withoutEmail.length}\n`)

  if (withoutEmail.length > 0) {
    console.log('📋 Email\'i olmayan hocalar:')
    withoutEmail.forEach(i => console.log(`   - ${i.full_name} (${i.title})`))
    console.log('')
  }

  console.log('═══════════════════════════════════════════════════════\n')
  console.log('🔄 Kullanıcı oluşturma başlıyor...\n')

  const results = []

  // Sırayla işle (paralel yapma, rate limit olabilir)
  for (const instructor of withEmail) {
    const result = await createInstructorUser(instructor)
    results.push(result)

    // Rate limit için bekle
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n═══════════════════════════════════════════════════════\n')
  console.log('📊 ÖZET RAPOR:\n')

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const existed = successful.filter(r => r.existed)
  const created = successful.filter(r => !r.existed)

  console.log(`✅ Başarılı: ${successful.length}`)
  console.log(`   - Yeni oluşturulan: ${created.length}`)
  console.log(`   - Zaten vardı (link güncellendi): ${existed.length}`)
  console.log(`❌ Başarısız: ${failed.length}\n`)

  if (created.length > 0) {
    console.log('🔑 OLUŞTURULAN KULLANICILAR VE ŞİFRELER:\n')
    created.forEach(r => {
      console.log(`   📧 ${r.email}`)
      console.log(`   👤 ${r.full_name}`)
      console.log(`   🔐 ${r.password}`)
      console.log('')
    })
  }

  if (failed.length > 0) {
    console.log('❌ BAŞARISIZ OLANLAR:\n')
    failed.forEach(r => {
      if (r.reason !== 'no_email') {
        console.log(`   - ${r.full_name} (${r.email})`)
        console.log(`     Sebep: ${r.reason || r.error}`)
      }
    })
  }

  // Sonuçları dosyaya kaydet
  const reportPath = path.join(__dirname, 'bulk-creation-report.txt')
  const report = [
    '═══════════════════════════════════════════════════════',
    'TOPLU KULLANICI OLUŞTURMA RAPORU',
    `Tarih: ${new Date().toLocaleString('tr-TR')}`,
    '═══════════════════════════════════════════════════════',
    '',
    `Toplam: ${results.length}`,
    `Başarılı: ${successful.length}`,
    `Başarısız: ${failed.length}`,
    '',
    '───────────────────────────────────────────────────────',
    'OLUŞTURULAN KULLANICILAR VE ŞİFRELER:',
    '───────────────────────────────────────────────────────',
    '',
    ...created.map(r => `${r.email}\n${r.full_name}\nŞifre: ${r.password}\n`)
  ].join('\n')

  fs.writeFileSync(reportPath, report, 'utf-8')
  console.log(`\n📄 Detaylı rapor kaydedildi: ${reportPath}`)
  console.log('\n✨ İşlem tamamlandı!\n')
}

main().catch(console.error)
