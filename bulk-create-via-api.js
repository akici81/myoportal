/**
 * Bulk Instructor User Creation via API
 *
 * Mevcut /api/admin/create-user endpoint'ini kullanarak toplu kullanıcı oluşturur
 *
 * Kullanım:
 * node bulk-create-via-api.js
 */

const fs = require('fs')
const path = require('path')

// CSV parse
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

// API'ye POST request
async function createUser(userData) {
  const url = 'https://myoportal.vercel.app/api/admin/create-user'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('🚀 Toplu Kullanıcı Oluşturma (API üzerinden)\n')

  const csvPath = path.join(__dirname, 'instructors_rows.csv')
  const instructors = parseCSV(csvPath)

  console.log(`📊 Toplam ${instructors.length} öğretim elemanı bulundu\n`)

  // Email olanları filtrele
  const withEmail = instructors.filter(i => i.email && i.email.trim() !== '')
  console.log(`✅ Email'i olan: ${withEmail.length}\n`)

  console.log('═══════════════════════════════════════════════════════\n')

  const results = []
  const password = 'Rumeli2025!' // Tüm kullanıcılar için aynı şifre

  for (const instructor of withEmail) {
    const { email, full_name, department_id } = instructor

    console.log(`📧 ${full_name} (${email})`)

    const userData = {
      email,
      password,
      full_name,
      role: 'instructor',
      department_id
    }

    const result = await createUser(userData)

    if (result.success) {
      console.log('   ✅ Başarılı')

      // Instructor profile_id linkini güncelle (ayrı bir işlem gerekli)
      results.push({
        success: true,
        instructor_id: instructor.id,
        email,
        full_name,
        user_id: result.data.userId
      })
    } else {
      console.log(`   ❌ Hata: ${result.error}`)
      results.push({
        success: false,
        email,
        full_name,
        error: result.error
      })
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n═══════════════════════════════════════════════════════\n')
  console.log('📊 ÖZET:\n')

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  console.log(`✅ Başarılı: ${successful.length}`)
  console.log(`❌ Başarısız: ${failed.length}\n`)

  if (successful.length > 0) {
    console.log('✅ OLUŞTURULANLAR:\n')
    successful.forEach(r => {
      console.log(`   ${r.email} → ${r.full_name}`)
    })
    console.log('')
  }

  if (failed.length > 0) {
    console.log('❌ BAŞARISIZLAR:\n')
    failed.forEach(r => {
      console.log(`   ${r.email} → ${r.error}`)
    })
    console.log('')
  }

  console.log('🔑 TÜM ŞİFRELER: Rumeli2025!\n')

  // Rapor kaydet
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
    'ORTAK ŞİFRE: Rumeli2025!',
    '',
    '───────────────────────────────────────────────────────',
    'BAŞARILI KULLANICILAR:',
    '───────────────────────────────────────────────────────',
    ...successful.map(r => `${r.email} - ${r.full_name} (ID: ${r.user_id})`),
    '',
    failed.length > 0 ? '───────────────────────────────────────────────────────' : '',
    failed.length > 0 ? 'BAŞARISIZ:' : '',
    failed.length > 0 ? '───────────────────────────────────────────────────────' : '',
    ...failed.map(r => `${r.email} - ${r.error}`)
  ].filter(Boolean).join('\n')

  const reportPath = path.join(__dirname, 'bulk-creation-report.txt')
  fs.writeFileSync(reportPath, report, 'utf-8')

  console.log(`📄 Rapor kaydedildi: ${reportPath}\n`)

  // SQL script oluştur (instructor profile_id güncellemesi için)
  if (successful.length > 0) {
    const sqlStatements = successful.map(r =>
      `UPDATE instructors SET profile_id = '${r.user_id}' WHERE id = '${r.instructor_id}';`
    )

    const sqlScript = [
      '-- Instructor Profile ID Güncelleme SQL',
      `-- ${new Date().toLocaleString('tr-TR')}`,
      '',
      ...sqlStatements
    ].join('\n')

    const sqlPath = path.join(__dirname, 'update-instructor-links.sql')
    fs.writeFileSync(sqlPath, sqlScript, 'utf-8')

    console.log(`📄 SQL script kaydedildi: ${sqlPath}`)
    console.log('   Bu SQL'i Supabase SQL Editor\'de çalıştırarak instructor linklerini güncelleyin.\n')
  }

  console.log('✨ İşlem tamamlandı!\n')
}

main().catch(console.error)
