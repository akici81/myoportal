# Toplu Öğretim Elemanı Kullanıcı Oluşturma Talimatı

## 📋 Özet

- **Toplam Öğretim Elemanı**: 45 kişi
- **Email'i olan**: 26 kişi ✅
- **Email'i olmayan**: 19 kişi ⚠️
- **Ortak Şifre**: `Rumeli2025!` 🔐

---

## 🚀 Adım Adım İşlem

### 1. Supabase SQL Editor'ü Aç

👉 https://supabase.com/dashboard/project/ltokdwxmaxjyqkcowxct/sql/new

### 2. SQL Dosyasını Kopyala

`create-instructors.sql` dosyasının **TAMAMINI** SQL Editor'e yapıştırın.

### 3. Çalıştır

**RUN** butonuna tıklayın veya `Ctrl+Enter` tuşlarına basın.

### 4. Sonucu Kontrol Et

SQL sonunda otomatik olarak bu sorgu çalışacak:

```sql
SELECT
  i.full_name,
  i.email,
  p.role,
  d.name as department
FROM instructors i
JOIN profiles p ON p.id = i.profile_id
JOIN departments d ON d.id = i.department_id
WHERE i.profile_id IS NOT NULL
ORDER BY i.full_name;
```

**Sonuçta 26 satır görmelisiniz** ✅

---

## 📊 Oluşturulacak Kullanıcılar (26 kişi)

| # | Ad Soyad | Email | Bölüm |
|---|---|---|---|
| 1 | Abdullah YAVUZ | abdullah.yavuz@rumeli.edu.tr | BLG |
| 2 | Ataberk ÇELİK | ataberk.celik@rumeli.edu.tr | OLH |
| 3 | Birsu Ece EKMEKÇİ | birsu.ekmekci@rumeli.edu.tr | SHU/SHK |
| 4 | Bülent TATAR | bulent.tatar@rumeli.edu.tr | MBH |
| 5 | Canmert DEMİR | canmert.demir@rumeli.edu.tr | BLG |
| 6 | Cemil GÜNERİ | cemil.guneri@rumeli.edu.tr | SHU/SHK |
| 7 | Dila EVLİYAOĞLU | dila.evliyaoglu@rumeli.edu.tr | GRA/ICM |
| 8 | Doğukan BAYESEN | dogukan.bayesen@rumeli.edu.tr | OLH |
| 9 | Emrah ÖZDEMİR | emrah.ozdemir@rumeli.edu.tr | SPY/YON |
| 10 | Enis Edip AKICI | eedip.akici@rumeli.edu.tr | OLH |
| 11 | Ergin AKIN | ergin.akin@rumeli.edu.tr | GRA/ICM |
| 12 | Furkan İŞBİLEN | furkan.isbilen@rumeli.edu.tr | UCT |
| 13 | Gürhan GÜNGÖRDÜ | gurhan.gungordu@rumeli.edu.tr | UCT |
| 14 | Hüseyin Şahin ÖNSOY | hsahin.onsoy@rumeli.edu.tr | SHU/SHK |
| 15 | M. Mine ÇAPUR | mine.capur@rumeli.edu.tr | SHU/SHK |
| 16 | Mehmet ATICI | mehmet.atici@rumeli.edu.tr | BLG |
| 17 | Merve ÇEVİK GÜNGÖR | merve.cevikgungor@rumeli.edu.tr | GRA/ICM |
| 18 | Murat Alper GÜVEN | malper.guven@rumeli.edu.tr | MBH |
| 19 | Oğulcan USUFLU | ogulcan.usuflu@rumeli.edu.tr | SPY/YON |
| 20 | Osman İlker AÇIKGÖZ | oilker.acikgoz@rumeli.edu.tr | UCT |
| 21 | Reyhan KESGİN ÜZEN | reyhan.kesgin@rumeli.edu.tr | GRA/ICM |
| 22 | Selin GÖKMEN | selin.gokmen@rumeli.edu.tr | OLH |
| 23 | Sevcan ÖZKAN | sevcan.battal@rumeli.edu.tr | OLH |
| 24 | Şebnem TAMER | sebnem.tamer@rumeli.edu.tr | SHU/SHK |
| 25 | Şeyma Nur ÜZÜM | seymanur.uzum@rumeli.edu.tr | OLH |
| 26 | Yiğit Er YİĞİT | yigiter.yigit@rumeli.edu.tr | GRA/ICM |

---

## ⚠️ Email'i Olmayan Öğretim Elemanları (19 kişi)

Bu kişiler için kullanıcı oluşturulamaz. Email eklenince manuel olarak eklenebilir:

1. Tunahan ASLAN (SPY/YON)
2. Duygu TOPAL YILDIRIM (MBH)
3. İbrahim GÜL (MBH)
4. Bahar DURUKAN (SPY/YON)
5. Hakan KURU (SPY/YON)
6. Hüseyin GÜNDOĞDU (SPY/YON)
7. Ümit ORHAN (SPY/YON)
8. İsmail BAYRAM (SPY/YON)
9. Ali DEMİR (SPY/YON)
10. Nurullah ARIKAN (MBH)
11. Erkan ÖZİZ (SPY/YON)
12. Özlem KIRANDI (SPY/YON)
13. Umut DOLU (SPY/YON)
14. İlyas Ozan KAYA (SPY/YON)
15. Hakan Levent GÜL (SPY/YON)
16. Aytaç Uğur YERDEN (SPY/YON)
17. Muhammed DEMİR (GRA/ICM)
18. Can KÜÇÜKALİ (SHU/SHK)
19. Abdullah PAŞAOĞLU (SPY/YON)

---

## 🔐 Giriş Bilgileri

### Kullanıcılar için:

**Email**: Kendi email adresleri (rumeli.edu.tr)
**Şifre**: `Rumeli2025!`

### Örnek:

- **Email**: dogukan.bayesen@rumeli.edu.tr
- **Şifre**: Rumeli2025!

---

## ✅ SQL Çalıştıktan Sonra Ne Olur?

1. ✅ **26 kullanıcı** `auth.users` tablosuna eklenir
2. ✅ **26 profil** `profiles` tablosuna eklenir (role=instructor)
3. ✅ **26 instructor** `instructors.profile_id` alanı güncellenir

---

## 🧪 Test

SQL çalıştıktan sonra test için:

1. Logout yapın
2. Herhangi bir hocanın email'i ile giriş yapın
3. Şifre: `Rumeli2025!`
4. Başarılı giriş sonrası Instructor Dashboard'ı görmeli

---

## 📌 Notlar

- `ON CONFLICT DO NOTHING`: Eğer email zaten varsa, hata vermeden geçer
- Şifre hash'lenir (`crypt` fonksiyonu ile)
- Email doğrulaması otomatik onaylanır (`email_confirmed_at = now()`)
- Tüm kullanıcılar `instructor` rolü ile oluşturulur

---

## 🆘 Sorun Olursa

**Hata mesajı görürseniz:**

1. Error mesajını okuyun
2. SQL Editor'deki "Messages" sekmesine bakın
3. Genellikle:
   - Foreign key hatası → department_id yanlış
   - Duplicate key hatası → Email zaten var (sorun değil, geçer)
   - Permission hatası → Service role key gerekli (zaten SQL Editor kullanıyoruz, sorun olmaz)

**Manuel kontrol:**

```sql
-- Kaç tane instructor'un profile_id'si var?
SELECT COUNT(*) FROM instructors WHERE profile_id IS NOT NULL;
-- Sonuç: 26 olmalı

-- Kaç tane instructor rolü var?
SELECT COUNT(*) FROM profiles WHERE role = 'instructor';
-- Sonuç: 26+ olmalı (önceden varsa daha fazla)
```

---

## 🎉 Başarılı Olunca

Artık tüm hocalar sisteme giriş yapabilir!

**Müdür Dashboard** → **Departments** → **Bölüm Seç** → **Edit** → Dropdown'da 26 hoca görünecek!

---

**Hazırlayan**: Claude Code 🤖
**Tarih**: 2026-03-27
