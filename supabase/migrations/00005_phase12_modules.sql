-- 1. COMMISSIONS
CREATE TABLE public.commissions (
    id TEXT PRIMARY KEY, -- 'kalite', 'staj', 'egitim_ogretim' vs gibi V1 ID'leri
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    drive_folder_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. COMMISSION MEMBERS
CREATE TABLE public.commission_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    commission_id TEXT REFERENCES public.commissions(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES public.instructors(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'uye', -- 'baskan', 'uye', 'raportör'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MEETING REQUESTS
CREATE TABLE public.meeting_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    commission_id TEXT REFERENCES public.commissions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    proposed_date DATE NOT NULL,
    proposed_time TEXT NOT NULL,
    location TEXT,
    agenda TEXT,
    status TEXT DEFAULT 'pending' NOT NULL, -- pending, approved, rejected, completed
    requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. INTERNSHIP RECORDS
CREATE TABLE public.internship_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_number TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES public.instructors(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL,
    score INTEGER,
    grade TEXT,
    file_url TEXT,
    notes TEXT,
    academic_year TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- pending, approved, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. GENERAL REQUESTS
CREATE TABLE public.general_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- 'belge', 'muafiyet', 'diger'
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'in_review', 'approved', 'rejected'
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    attachment_url TEXT,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Default data: V1'den taşınan 14 Komisyon tanımı
INSERT INTO public.commissions (id, name, type) VALUES
('egitim_ogretim', 'Eğitim - Öğretim Komisyonu', 'egitim_ogretim'),
('olcme_degerlendirme', 'Ölçme ve Değerlendirme Komisyonu', 'olcme_degerlendirme'),
('ayiklama_imha', 'Ayıklama ve İmha Komisyonu', 'ayiklama_imha'),
('kalite', 'Akademik Birim Kalite Komisyonu', 'kalite'),
('stratejik', 'Stratejik Planlama Komisyonu', 'stratejik'),
('engelli', 'Engelli Öğrenci Komisyonu', 'engelli'),
('afet', 'Afet Yönetimi Komisyonu', 'afet'),
('bologna', 'Bologna ve Müfredat Komisyonu', 'bologna'),
('mezuniyet', 'Mezuniyet Komisyonu', 'mezuniyet'),
('staj', 'Staj Komisyonu', 'staj'),
('yatay_gecis', 'Yatay Geçiş, Muafiyet ve Çap Komisyonu', 'yatay_gecis'),
('bagimlilik', 'Bağımlılıkla Mücadele Komisyonu', 'bagimlilik'),
('akreditasyon', 'Akreditasyon Komisyonu', 'akreditasyon'),
('temsilci', 'Meslek Yüksekokulu Temsilcileri', 'temsilci')
ON CONFLICT (id) DO NOTHING;
