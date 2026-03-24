# MYO Portal v2 — Geliştirici & Bağlam (Context) Dosyası

## Proje Özeti
İstanbul Rumeli Üniversitesi Meslek Yüksekokulu ders programı ve operasyon yönetim sistemi. V1 üzerinden geliştirilen v2 sürümü; gelişmiş 5 adım evrak onay mekanizmaları (Faz 14), modüler (Accordion) kenar çubukları ve V1'in temiz, okunaklı, profesyonel arka plan "Dark" temasına sahiptir.
7 bölüm, 10 program, her programda 1. ve 2. sınıf bulunmaktadır.

## Tech Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Styling:** Tailwind CSS (V1 Özel CSS variables sistemi entegreli) + Lucide React (İkonlar)
- **Export:** exceljs (Excel), jspdf (PDF)
- **Deploy:** Vercel (`myoportal.vercel.app`)

## Klasör Yapısı
```text
src/
├── app/
│   ├── auth/login/page.tsx              # Giriş sayfası
│   ├── dashboard/
│   │   ├── layout.tsx                   # Auth wrapper + Minimal V1 Düzeni
│   │   ├── system-admin/                # Tam yetki (Admin, Tüm sistem yönetimi)
│   │   ├── mudur/                       # Müdür (Read-heavy + Son Onay merci)
│   │   ├── mudur-yardimcisi/            # Müdür Yrd (Kullanıcı, Komisyon, Staj yönetimi)
│   │   ├── sekreter/                    # Sekreter (Ders programı şablonu, operasyon merkezi)
│   │   ├── bolum-baskani/               # Bölüm Başkanı (Kendi bölümünün ders / eğitmen / öğrenci yönetimi)
│   │   ├── instructor/                  # Öğretim Elemanı (Sadece kısıt bildirme, ders görme)
│   │   └── schedule-builder/            # Sürükle&Bırak (DnD) hücre bazlı program editörü
│   ├── api/
│   │   ├── admin/create-user/route.ts
│   │   ├── submissions/update-status/route.ts # Faz 14: Evrak merkezi onay API
│   │   └── schedule/
│   │       ├── check-conflict/route.ts  # Hoca, Derslik veya Sınıf(Program) çakışma tespiti
│   │       ├── suggest-classrooms/route.ts
│   │       └── auto-generate/route.ts   # Kısıt bazlı otomatik programlama algoritması
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                  # Gruplanmış (Accordion), rol bazlı, V1 UI
│   │   └── TopBar.tsx                   # Sticky V1 Breadcrumb ve Bildirim Başlığı (Header)
│   ├── schedule/
│   │   ├── ScheduleGrid.tsx             # Haftalık grid komponenti
│   │   ├── ScheduleExport.tsx           # PDF / Excel Export
│   │   └── ScheduleBuilder.tsx          # DnD Builder Wrapper
│   └── ui/                              # Temel ortak giriş/form bileşenleri
└── lib/
    ├── supabase/client.ts               # Browser Supabase API
    └── supabase/server.ts               # Server Component Supabase API
```

## Veritabanı (Supabase) Şeması ve Kritik İlişkiler

### Temel Tablolar
1. **profiles**: `id` (auth.users UUID), `email`, `full_name`, `role`, `department_id` (FK to departments). Bütün auth üyelerinin ana referansıdır.
2. **departments**: `id`, `name`, `short_code`, `head_id` (FK to profiles -> Bolum_baskani UUID).
3. **programs**: `id`, `name`, `short_code`, `department_id`. Her bölümün birden fazla programı bulunur.
4. **instructors**: `id`, `profile_id` (FK to profiles), `department_id`, `full_name`. Sistemde hesap açmamış bir eğitmen (profile_id = null) olarak da eklenebilir. Mevcut profille bu tablodaki kişi manuel senkronize olmalıdır.
5. **courses**: `code`, `name`, `course_type`, `is_uzem`, `weekly_hours`, `theoretical_hours`, `practical_hours`, vb. Ana genel ders kataloğudur. `weekly_hours = theoretical_hours + practical_hours` olarak hesaplanır ve kayıt sırasında veritabanına yazılır; otomatik programlama motoru bu değeri kullanır.
6. **program_courses**: Belirli bir programın müfredatındaki bir dersin o seneki kaydıdır (Örn: BIL101 - 1. sınıf - Güz). `instructor_id` bu tabloda belirlenir.

### Operasyonel Tablolar
- **schedule_entries**: Haftalık slotlar üzerinden ders işleme. `program_course_id`, `classroom_id`, `time_slot_id`, `day_of_week`.
- **classrooms**: Fiziksel ve teorik derslikler.
- **instructor_constraints**: Hoca uygunluğu / "HAYIR" dediği saatlerin veya günlerin blokajı.
- **academic_periods**: Aktif dönem ayarı (ör. "2024-2025 Güz"). Sistemde aktif sadece "1 adet" olmak zorundadır.
- **submissions & requests**: Staj, dilekçe, komisyon belgeleri vb. (Faz 14). Akış durumları: `draft`, `submitted`, `revision_requested`, `approved`, `published`.

### Bilinen Durum: Profil → Bölüm FK Join Sorunu
`supabase.from('profiles').select('*, departments(*)')` şeklindeki inline FK join Supabase'de çalışmıyor (constraint tanımlanmamış). Bu nedenle `profiles` ve `departments` her zaman **iki ayrı sorgu** olarak çekilmelidir:
```ts
const { data: prof } = await supabase.from('profiles').select('id, role, department_id').eq('id', user.id).single()
const { data: dept } = await supabase.from('departments').select('*').eq('id', prof.department_id).single()
```

## Rol Dağılımı ve Görevler
- `system_admin`: Her şeye erişim (Kullanıcı açma, bölüm, ders ekleme). *(Eski URL: `/dashboard/admin`)*
- `mudur`: Görselleştirme ağırlıklı, onay seviyesi yüksek ana yönetici.
- `mudur_yardimcisi`: Alt dallar ve personel işleyişini inceleyen yönetici.
- `sekreter`: Çakışma tespiti yapan, aktif-pasif rotasını, derslik listesini ayarlayan personel.
- `bolum_baskani`: Yalnızca kendine atanan bölüm (department) seviyesindeki programlarla ve `schedule-builder` ile işlem yapar. *(Eski URL: `/dashboard/department`)*
- `instructor`: Sade ve kısıtlı ekran; bireysel ders programını ve evrak taleplerini görür.

## Geliştirici İçin Önemli Kurallar (V1'e Dönüş + V2 Standartları)

1. **Görsel Standart (Flat & Clean Dark UI)**
   - Sayfa arkaplanlarında veya kart elementlerinde ağır (lag yaratan) CSS gradient, blur, veya `glass-card` gibi glow efektlerinden **kesinlikle kaçının**.
   - `globals.css` içinde yer alan `var(--bg)` arkaplanı baz alınmıştır. `card`, `card-hover`, `btn-primary`, `btn-danger`, `badge-red` gibi V1 utility sınıflarını kullanın.
   - Sayfa başlıklarında devasa banner'lar tasarlamak yerine, projede tanımlı `<TopBar />` isimli bileşeni import ederek standardı koruyun.

2. **Veritabanı Fallback (`bolum_baskani` Güvenliği)**
   - Bölüm Başkanının profilindeki (`profiles` tablosu) `department_id` alanı **boş olabilir**.
   - Herhangi bir profil bilgisi çekilirken, eğer rol `bolum_baskani` ise ve id null dönmüşse, o kişinin `departments` tablosunda `head_id = user.id` olarak geçip geçmediğine bakılmalı ve bu `headDept.id` değeri fallback (yedek) id olarak kullanılmalıdır. Aksi halde sayfalarda "Bölüm yok" hatası basılır.
   - `bolum-baskani/schedule/page.tsx` bu iki adımlı yöntemi kullanan referans implementasyondur.

3. **Supabase Count ve Sorgu Standartları**
   - Kayıt sayısını elde ederken her zaman `select('*', { count: 'exact', head: true })` kullanın (`id` sütununu çekerek belleği yormayın).
   - `.single()` fırlattığı PostgREST hataları yüzünden uygulama çökebilir. Belirsiz ise `.maybeSingle()` kullanıp if ile check atın.

4. **Eğitmen Profil ("Instructor Linkage") Sorunu (Faz 15)**
   - V2 sisteminde, aynı email ile auth tablosunda yer alan bir eğitmen, `instructors` tablosundaki kayıtla manuel olarak linklenmelidir. Uygulamayı büyütürken veya kullanıcı açarken bu referansı yönetin.

5. **Dışa Aktarma (Export)**
   - `/components/schedule/ScheduleExport.tsx` içerisindeki fonksiyon üzerinden, tabloların PDF ve Excel export testleri farklı rollerin yetki alanlarına göre sürekli test edilerek korunmalıdır.

---

## 2025-03-24 (Akşam) — Yapılan Değişiklikler

### 1. Bulk Öğretim Elemanı Bölüm Ataması Tamamlandı
Excel ders programı (`2025-2026 Bahar Dönemi MYO Ders Programı`) parse edilerek tüm öğretim elemanları ilgili bölümlere atandı:

| Bölüm | UUID | Atanan Hocalar (Örnekler) |
|-------|------|--------------------------|
| Büro Hizmetleri (MBH) | `a0000000-...-000000000001` | Murat Alper Güven, İbrahim Gül, Duygu Topal, Bülent Tatar, Nurullah Arıkan |
| Otel/Aşçılık/Pastacılık (OLH) | `a0000000-...-000000000002` | Şeymanur Üzüm, Selin Gökmen, Doğukan Bayesen, Enis Edip Akıcı, Sevcan Battal, Ataberk Çelik |
| Bilgisayar Programcılığı (BLG) | `a0000000-...-000000000003` | Canmert Demir, Abdullah Yavuz, Mehmet Atıcı |
| Ulaştırma/Havacılık (SHU/SHK) | `a0000000-...-000000000004` | Mine Çapur, Şebnem Tamer, Cemil Güneri, H. Şahin Önsoy, Birsu Ekmekçi, Can Küçükali, Ö. İlker Açıkgöz |
| Motorlu Araçlar/Uçak (UCT) | `a0000000-...-000000000005` | Furkan İşbilen, Gürhan Güngördü |
| Tasarım (GRA/ICM) | `a0000000-...-000000000006` | Reyhan Kesgin, Yiğiter Yiğit, Dila Evliyaoğlu, Merve Çevikgüngör, Muhammed Demir, Ergin Akın |
| Spor Yönetimi (SPY/YON) | `a0000000-...-000000000007` | Oğulcan Usuflu |

> **Not:** `instructors` tablosundaki `department_id` başarılı UPDATE ile set edildi. `profiles.department_id` ise ayrı bir alan.

---

### 2. `bolum-baskani/schedule/page.tsx` — Department Lookup Düzeltmesi
**Problem:** `supabase.from('profiles').select('*, departments(*)')` inline join başarısız oluyordu; `departments` null dönüyordu → "Yetkisiz Erişim / Bölüm Ataması Yok" hatası.

**Çözüm:** İki ayrı explicit sorgu:
```ts
// 1) Profili çek
const { data: prof } = await supabase.from('profiles').select('id, role, department_id').eq('id', user.id).single()

// 2) department_id varsa departmanı ayrıca çek
if (prof.department_id) {
  const { data: dept } = await supabase.from('departments').select('*').eq('id', prof.department_id).single()
}

// 3) Fallback: head_id üzerinden bul
const { data: headDept } = await supabase.from('departments').select('*').eq('head_id', user.id).single()
```

---

### 3. `system-admin/courses/page.tsx` — Haftalık Saat Desteği
**Problem:** Dersler için haftalık saat görünür/girilir değildi; otomatik programlama `weekly_hours` değerini okuyamıyordu.

**Çözüm:**
- Tablo görünümüne **"⏱ Haftalık Saat"** sütunu eklendi (Teorik + Uygulama toplamı, badge formatında)
- Form alanlarına Teorik ve Uygulama saatlerini girerken **canlı hesaplanan toplam** gösterildi
- `weekly_hours` alanı kayıt sırasında otomatik hesaplanıp veritabanına yazıldı:
  ```ts
  weekly_hours: theoretical_hours + practical_hours
  ```

---

### 4. Veritabanı Başlangıç Durumu (Boş Tablolar)
Aşağıdaki tablolar henüz **boş** ve doldurulması gerekiyor:
- `time_slots` → Ders saatlerini (08:00-20:50) SQL ile eklemek gerekiyor
- `courses` → Tüm ders kataloğunu sistem-admin ekranından elle ya da SQL ile eklemek gerekiyor
- `program_courses` → Hangi dersin hangi programa ait olduğu bağlanmalı
- `academic_periods` → Aktif dönem tanımlanmalı
- `schedule_entries` → Ders yerleştirme boş; yukarıdakiler dolmadan bu çalışmaz
