# MYO Portal V2

İstanbul Rumeli Üniversitesi MYO Ders Programı Yönetim Sistemi

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# .env.local dosyasını düzenle
# NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY değerlerini gir

# Geliştirme sunucusunu başlat
npm run dev
```

## Supabase Bağlantısı

Mevcut Supabase: `https://ltokdwxmaxjyqkcowxct.supabase.co`

## Roller

- `system_admin` - Sistem Yöneticisi
- `mudur` - Müdür
- `mudur_yardimcisi` - Müdür Yardımcısı
- `sekreter` - Sekreter
- `bolum_baskani` - Bölüm Başkanı
- `instructor` - Öğretim Elemanı

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
