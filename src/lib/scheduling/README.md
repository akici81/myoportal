# 🧠 MYO Portal v2 - İnsan Gibi Düşünen Otomatik Programlama Motoru

**Faz 9: Human-Like Scheduling Engine**

## 📋 Genel Bakış

Bu modül, İstanbul Rumeli Üniversitesi Meslek Yüksekokulu için geliştirilmiş, insan zekası ve deneyimini taklit eden otomatik ders programlama motorudur.

## 🏗️ Modüler Yapı

### 1. **types.ts** - Tip Tanımları
Tüm scheduling sistemi için kullanılan TypeScript tipleri.

```typescript
- ProgramCourse
- SchedulingGroup
- Constraint
- TimeSlot
- Classroom
- ScheduleEntry
- ConflictCheckResult
- Candidate
- SchedulingResult
```

### 2. **sharedCourses.ts** - Ortak Ders Yönetimi
Ortak derslerin (shared_group_id) gruplandırılması ve yönetimi.

**Özellikler:**
- `groupProgramCourses()` - Dersleri grup ID'ye göre gruplandırır
- `calculateGroupDifficulty()` - Grup zorluk skoru hesaplar
- `checkGroupClassroomCapacity()` - Grup için kapasite kontrolü
- `formatGroupInfo()` - Grup bilgilerini formatlar (debug için)
- `isSameSharedGroup()` - Aynı ortak ders grubu mu kontrol eder
- `checkProgramConflict()` - Program çakışması kontrolü (shared-aware)

**Önemli:** Aynı `shared_group_id`'ye sahip dersler **tek grup** olarak yerleştirilir ve aynı slot'ta olmalarına izin verilir (çünkü farklı programlardan gelen öğrenciler birlikte ders görür).

### 3. **constraints.ts** - Kısıt Kontrolü
Hard constraint kontrolleri ve çakışma tespiti.

**Kontroller:**
- ✅ Duplicate assignment (aynı derse zaten atanmış mı)
- ✅ Eğitmen çakışması
- ✅ Derslik çakışması
- ✅ Öğrenci grubu/program çakışması (shared-aware)
- ✅ Eğitmen hard constraints (müsait olmayan günler/saatler)
- ✅ Derslik kapasite kontrolü
- ✅ Derslik tip ve ekipman gereksinimleri (lab, mutfak, bilgisayar, projeksiyon)

**UZEM Desteği:**
- `isUzemCourse()` - Ders UZEM mi kontrol eder (prefix, flag, isim kontrolü)
- UZEM dersleri sanal sınıfta, fiziksel çakışma yapmaz

### 4. **humanRules.ts** - İnsan Gibi Kurallar
İnsan zekası ve deneyimini taklit eden akıllı kurallar.

**Kurallar:**

#### 🌟 Golden Hours (10:00-14:00)
En verimli çalışma saatleri. Bu saatlere ders yerleştirme **bonusu** (-50).

#### ⏰ Early Morning Penalty (08:00)
Sabah erken saatler sevilmez. 08:00 dersi **cezası** (+80).

#### 🌙 Late Hour Penalty (17:00+)
- Normal dersler için **ceza** (+60)
- UZEM dersleri için **bonus** (-50)
- UZEM'e gündüz saatlerde ceza (akşam saatlere yer açmak için)

#### 🕌 Friday Prayer Time (Cuma 12:00-14:30)
Cuma namazı saatinde ders **kesinlikle** olmamalı. Çok yüksek ceza (+150).

#### 🏢 Building Jump Penalty
**Ardışık derslerde bina değiştirme:**
- Öğrenci ardışık derslerde bina değiştirirse: **FACİA** (+150)
- Aynı binada sınıf değiştirirse: Hafif ceza (+20)
- Aynı sınıfta devam: **BONUS** (-15)

#### 👨‍🏫 Instructor Building Jump
Eğitmen ardışık derslerde bina koşturmamalı (+100 ceza).

#### 📅 Gap Penalty (Pencere Ders)
Öğrencinin o gün dersleri arasında 2-4 saat boşluk:
- 2 saat boşluk: +50 ceza
- 3 saat boşluk: +75 ceza
- 4 saat boşluk: +100 ceza

#### 🏝️ Isolated Hour Penalty
O gün sadece 1-2 saat ders varsa (tek ders için okula gelmek): +70 ceza.

#### 📦 Block Strategy
**4 saat dersler 2+2 olarak bölünür.** 4 saat üst üste ders çok yorucu.

#### ⏱️ Daily Hour Limit
**Günlük maksimum 6 saat** kuralı (HARD constraint).

### 5. **scoring.ts** - Skor Hesaplama
Tüm skor bileşenlerini toplar ve en iyi yerleşimi bulur.

**Skor Bileşenleri:**
1. Human-like rules (en önemli)
2. Günlük dağılım dengesi
3. Derslik kapasitesi uyumu
4. UZEM slot optimizasyonu
5. Eğitmen tercihleri (soft constraints)

**Kural:** Düşük skor = daha iyi yerleşim

### 6. **route.ts** - Ana API Handler
Tüm modülleri birleştiren ana API endpoint.

**Akış:**

```
1. Veri Yükleme (Paralel Promise.all)
   ↓
2. Filtreleme (program, yıl)
   ↓
3. Öğrenci Sayıları Enjekte
   ↓
4. UZEM Sanal Sınıfı Oluştur
   ↓
5. Öncelikli Sınıflar Ayarla
   ↓
6. Mevcut Schedule Temizle (opsiyonel)
   ↓
7. Gruplama (Shared Course Logic)
   ↓
8. Zorluk Sıralaması (zor gruplar önce)
   ↓
9. TABU SEARCH & BACKTRACKING
   ├─ Adayları Değerlendir (Day-First Strategy)
   ├─ Hard Constraint Kontrolü
   ├─ Skor Hesapla
   ├─ En İyi Adayı Seç
   └─ Eviction (gerekirse başka dersi sök, yeniden kuyruğa al)
   ↓
10. İstatistikleri Tamamla
   ↓
11. Veritabanına Kaydet (Batch Insert)
   ↓
12. Response Döndür
```

## 🚀 Performans Optimizasyonları

### 1. Paralel Veri Yükleme
```typescript
const [pc, cons, enrolls, slots, rooms, existing] = await Promise.all([...])
```
Tüm veritabanı sorguları aynı anda paralel çalışır.

### 2. Batch Insert
```typescript
const BATCH_SIZE = 50
for (let i = 0; i < entries.length; i += BATCH_SIZE) {
  await supabase.insert(chunk)
}
```
50'şer kayıt halinde veritabanına yazılır.

### 3. Singleton Supabase Client
`createClient()` fonksiyonu singleton pattern kullanır, her çağrıda yeni client oluşturmaz.

### 4. Tabu Search (Eviction Limit)
```typescript
const MAX_EVICTIONS_PER_GROUP = 5
```
Bir grup maksimum 5 kere sökülüp yeniden kuyruğa alınabilir. Sonsuz döngüyü önler.

## 📊 Kullanım

### API Request
```typescript
POST /api/schedule/auto-generate

{
  "academicPeriodId": "uuid",
  "clearExisting": true,        // Opsiyonel: Mevcut programı temizle
  "programId": "uuid",           // Opsiyonel: Sadece bu program
  "yearNumber": 1,               // Opsiyonel: Sadece bu yıl
  "priorityClassroomIds": [],    // Opsiyonel: Öncelikli sınıflar
  "respectConstraints": true,    // Opsiyonel: Eğitmen kısıtlarını uygula
  "departmentId": "uuid"         // Opsiyonel: Sadece bu bölüm
}
```

### API Response
```typescript
{
  "message": "45 / 50 ders programa yerleştirildi.",
  "result": {
    "placed": ScheduleEntry[],
    "failed": FailedGroup[],
    "stats": {
      "totalCourses": 50,
      "placedCourses": 45,
      "failedCourses": 5,
      "totalHours": 180
    }
  },
  "dayDistribution": {
    "1": 36,  // Pazartesi
    "2": 36,  // Salı
    "3": 36,  // Çarşamba
    "4": 36,  // Perşembe
    "5": 36   // Cuma
  },
  "evictions": [
    { "groupId": "shared-abc", "count": 2 }
  ]
}
```

## 🧪 Test Senaryoları

### Senaryo 1: Ortak Ders (Shared Course)
```
ATA101 (Atatürk İlkeleri)
├─ BLG Program 1. Sınıf (30 öğrenci)
├─ MBH Program 1. Sınıf (25 öğrenci)
└─ OLH Program 1. Sınıf (20 öğrenci)

Toplam: 75 öğrenci
Yerleşim: Tek sınıf, tek saat, tüm programlar birlikte
```

### Senaryo 2: Lab Dersi
```
BLG203 (Veri Tabanı Lab)
Gereksinim: Lab sınıfı + Bilgisayar
Kapasite: 30 öğrenci
Sonuç: Sadece "lab" tipinde ve has_computer=true sınıflara yerleşir
```

### Senaryo 3: UZEM Dersi
```
ING101 (İngilizce I)
UZEM: true
Sonuç: Sanal sınıfa yerleşir, 17:00+ saatlere öncelik verilir
```

### Senaryo 4: Eviction (Sökme)
```
1. BLG101 Pazartesi 10:00'da yerleştirildi
2. MBH102 Pazartesi 10:00'a yerleştirilmeye çalışılıyor
3. Çakışma: Aynı sınıf
4. Eviction: BLG101 sökülür, kuyruğa geri alınır
5. MBH102 yerleştirilir
6. BLG101 başka bir slota yerleştirilir
```

## 📝 Notlar

- **Shared Group ID:** Ortak derslerin aynı `shared_group_id`'ye sahip olması kritik. Aksi halde her program için ayrı slot aranır.
- **Weekly Hours:** `courses.weekly_hours` alanı dolu olmalı. Otomatik programlama bu değeri kullanır.
- **Time Slots:** `time_slots` tablosu dolu ve `slot_number` sıralı olmalı.
- **Classrooms:** En az 1 aktif sınıf olmalı. UZEM sanal sınıfı otomatik oluşturulur.
- **Academic Period:** Aktif dönem (`academic_periods`) tanımlanmalı.

## 🐛 Hata Ayıklama

Konsol logları:
```
[Auto-Schedule] Başlıyor...
[Auto-Schedule] 50 ders, 15 sınıf yüklendi
[Auto-Schedule] 12 grup oluşturuldu
[Auto-Schedule] Eviction: [SHARED] ATA101 (BLG + MBH) - 75 öğrenci
[Auto-Schedule] Tamamlandı: 45/50
```

## 🎯 Gelecek Geliştirmeler

- [ ] Makine öğrenmesi ile skor ağırlıklarını optimize et
- [ ] Genetik algoritma entegrasyonu
- [ ] Real-time constraint updating
- [ ] Multi-period scheduling (yıllık programlama)
- [ ] Eğitmen tercih learning (öğrenen sistem)

---

**Geliştirici:** Claude + Enisa
**Versiyon:** 2.0 (Faz 9)
**Tarih:** 2025-03-24
