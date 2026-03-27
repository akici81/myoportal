-- ══════════════════════════════════════════════════════════════
-- TOPLU ÖĞRETİM ELEMANI KULLANICI OLUŞTURMA SQL
-- ══════════════════════════════════════════════════════════════
--
-- Bu SQL script'i Supabase SQL Editor'de çalıştırın
-- Email'i olan 26 öğretim elemanı için kullanıcı hesabı oluşturur
--
-- ORTAK ŞİFRE: Rumeli2025!
--
-- ══════════════════════════════════════════════════════════════

-- 1. Doğukan BAYESEN
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'dogukan.bayesen@rumeli.edu.tr',
  crypt('Rumeli2025!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Doğukan BAYESEN"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO NOTHING
RETURNING id as user_id, email;

-- Profile oluştur
INSERT INTO public.profiles (id, email, full_name, role, department_id)
SELECT id, 'dogukan.bayesen@rumeli.edu.tr', 'Doğukan BAYESEN', 'instructor', 'a0000000-0000-0000-0000-000000000002'
FROM auth.users WHERE email = 'dogukan.bayesen@rumeli.edu.tr'
ON CONFLICT (id) DO NOTHING;

-- Instructor linkini güncelle
UPDATE public.instructors
SET profile_id = (SELECT id FROM auth.users WHERE email = 'dogukan.bayesen@rumeli.edu.tr')
WHERE id = '0542db35-de1f-41fc-8228-a3f60bfa5bff';

-- 2. Enis Edip AKICI
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'eedip.akici@rumeli.edu.tr',
  crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Enis Edip AKICI"}',
  'authenticated', 'authenticated'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role, department_id)
SELECT id, 'eedip.akici@rumeli.edu.tr', 'Enis Edip AKICI', 'instructor', 'a0000000-0000-0000-0000-000000000002'
FROM auth.users WHERE email = 'eedip.akici@rumeli.edu.tr' ON CONFLICT (id) DO NOTHING;

UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'eedip.akici@rumeli.edu.tr')
WHERE id = '067aa742-d883-4f58-ac92-dfddbbd3bf52';

-- 3. Sevcan ÖZKAN (sevcan.battal@rumeli.edu.tr - zaten var olabilir)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role
) VALUES (
  gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'sevcan.battal@rumeli.edu.tr',
  crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Sevcan ÖZKAN"}',
  'authenticated', 'authenticated'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role, department_id)
SELECT id, 'sevcan.battal@rumeli.edu.tr', 'Sevcan ÖZKAN', 'instructor', 'a0000000-0000-0000-0000-000000000002'
FROM auth.users WHERE email = 'sevcan.battal@rumeli.edu.tr' ON CONFLICT (id) DO UPDATE SET full_name = 'Sevcan ÖZKAN';

UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'sevcan.battal@rumeli.edu.tr')
WHERE id = '06a8ac52-31b2-43ae-8cb1-ba0439e72657';

-- 4-26. Kalan tüm kullanıcılar (tek batch olarak)

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 4. Dila EVLİYAOĞLU
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'dila.evliyaoglu@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dila EVLİYAOĞLU"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'dila.evliyaoglu@rumeli.edu.tr', 'Dila EVLİYAOĞLU', 'instructor', 'a0000000-0000-0000-0000-000000000006');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'dila.evliyaoglu@rumeli.edu.tr') WHERE id = '12cd4a23-ae46-4020-9af0-8dae0bf2f67e';

  -- 5. Osman İlker AÇIKGÖZ
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'oilker.acikgoz@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Osman İlker AÇIKGÖZ"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'oilker.acikgoz@rumeli.edu.tr', 'Osman İlker AÇIKGÖZ', 'instructor', 'a0000000-0000-0000-0000-000000000005');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'oilker.acikgoz@rumeli.edu.tr') WHERE id = '1dba3cae-94e5-4b3d-a21b-1281ab8cd627';

  -- 6. Merve ÇEVİK GÜNGÖR
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'merve.cevikgungor@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Merve ÇEVİK GÜNGÖR"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'merve.cevikgungor@rumeli.edu.tr', 'Merve ÇEVİK GÜNGÖR', 'instructor', 'a0000000-0000-0000-0000-000000000006');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'merve.cevikgungor@rumeli.edu.tr') WHERE id = '2efa9634-9d8d-49a7-9ba8-30b4d2f04e29';

  -- 7. Mehmet ATICI
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'mehmet.atici@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mehmet ATICI"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'mehmet.atici@rumeli.edu.tr', 'Mehmet ATICI', 'instructor', 'a0000000-0000-0000-0000-000000000003');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'mehmet.atici@rumeli.edu.tr') WHERE id = '35fd0c97-01cf-4ad8-9f6a-801a5c1fdb15';

  -- 8. Selin GÖKMEN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'selin.gokmen@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Selin GÖKMEN"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'selin.gokmen@rumeli.edu.tr', 'Selin GÖKMEN', 'instructor', 'a0000000-0000-0000-0000-000000000002');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'selin.gokmen@rumeli.edu.tr') WHERE id = '408b74d4-0be6-4239-9f4f-a5fe64f7cc3b';

  -- 9. Canmert DEMİR
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'canmert.demir@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Canmert DEMİR"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'canmert.demir@rumeli.edu.tr', 'Canmert DEMİR', 'instructor', 'a0000000-0000-0000-0000-000000000003');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'canmert.demir@rumeli.edu.tr') WHERE id = '5672a496-e51f-4401-870b-fe451df98dae';

  -- 10. Cemil GÜNERİ
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'cemil.guneri@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Cemil GÜNERİ"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'cemil.guneri@rumeli.edu.tr', 'Cemil GÜNERİ', 'instructor', 'a0000000-0000-0000-0000-000000000004');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'cemil.guneri@rumeli.edu.tr') WHERE id = '65a5a79b-b367-45db-9a6f-9b7b74de35e2';

  -- 11. Ergin AKIN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'ergin.akin@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ergin AKIN"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'ergin.akin@rumeli.edu.tr', 'Ergin AKIN', 'instructor', 'a0000000-0000-0000-0000-000000000006');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'ergin.akin@rumeli.edu.tr') WHERE id = '8088fc50-8dd9-4646-89d6-8e16d3979951';

  -- 12. M. Mine ÇAPUR
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'mine.capur@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"M. Mine ÇAPUR"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'mine.capur@rumeli.edu.tr', 'M. Mine ÇAPUR', 'instructor', 'a0000000-0000-0000-0000-000000000004');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'mine.capur@rumeli.edu.tr') WHERE id = '8120057f-f3fc-47e7-b81f-954421cec876';

  -- 13. Bülent TATAR
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'bulent.tatar@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bülent TATAR"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'bulent.tatar@rumeli.edu.tr', 'Bülent TATAR', 'instructor', 'a0000000-0000-0000-0000-000000000001');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'bulent.tatar@rumeli.edu.tr') WHERE id = '897f3382-7e9e-463d-91b4-ce16110a6110';

  -- 14. Gürhan GÜNGÖRDÜ
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'gurhan.gungordu@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Gürhan GÜNGÖRDÜ"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'gurhan.gungordu@rumeli.edu.tr', 'Gürhan GÜNGÖRDÜ', 'instructor', 'a0000000-0000-0000-0000-000000000005');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'gurhan.gungordu@rumeli.edu.tr') WHERE id = '8c4af486-516d-44ca-8723-a9fd6aac44fb';

  -- 15. Hüseyin Şahin ÖNSOY
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'hsahin.onsoy@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Hüseyin Şahin ÖNSOY"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'hsahin.onsoy@rumeli.edu.tr', 'Hüseyin Şahin ÖNSOY', 'instructor', 'a0000000-0000-0000-0000-000000000004');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'hsahin.onsoy@rumeli.edu.tr') WHERE id = '91605231-1944-4883-af7d-f885f4f0c6fc';

  -- 16. Oğulcan USUFLU
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'ogulcan.usuflu@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Oğulcan USUFLU"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'ogulcan.usuflu@rumeli.edu.tr', 'Oğulcan USUFLU', 'instructor', 'a0000000-0000-0000-0000-000000000007');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'ogulcan.usuflu@rumeli.edu.tr') WHERE id = '9b053413-0da3-40b4-aa91-a58dcd0ac3fb';

  -- 17. Reyhan KESGİN ÜZEN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'reyhan.kesgin@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Reyhan KESGİN ÜZEN"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'reyhan.kesgin@rumeli.edu.tr', 'Reyhan KESGİN ÜZEN', 'instructor', 'a0000000-0000-0000-0000-000000000006');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'reyhan.kesgin@rumeli.edu.tr') WHERE id = 'ad60d342-2ef5-415f-8234-d18b743e3777';

  -- 18. Furkan İŞBİLEN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'furkan.isbilen@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Furkan İŞBİLEN"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'furkan.isbilen@rumeli.edu.tr', 'Furkan İŞBİLEN', 'instructor', 'a0000000-0000-0000-0000-000000000005');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'furkan.isbilen@rumeli.edu.tr') WHERE id = 'b344a59e-883b-4194-b4b7-1f4678ad0d28';

  -- 19. Murat Alper GÜVEN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'malper.guven@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Murat Alper GÜVEN"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'malper.guven@rumeli.edu.tr', 'Murat Alper GÜVEN', 'instructor', 'a0000000-0000-0000-0000-000000000001');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'malper.guven@rumeli.edu.tr') WHERE id = 'b72c6d69-61c7-4309-8eb9-2aac5f440dc4';

  -- 20. Ataberk ÇELİK
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'ataberk.celik@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ataberk ÇELİK"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'ataberk.celik@rumeli.edu.tr', 'Ataberk ÇELİK', 'instructor', 'a0000000-0000-0000-0000-000000000002');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'ataberk.celik@rumeli.edu.tr') WHERE id = 'b86ec438-14cb-41d9-873f-b6944e8a1521';

  -- 21. Abdullah YAVUZ
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'abdullah.yavuz@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Abdullah YAVUZ"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'abdullah.yavuz@rumeli.edu.tr', 'Abdullah YAVUZ', 'instructor', 'a0000000-0000-0000-0000-000000000003');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'abdullah.yavuz@rumeli.edu.tr') WHERE id = 'd0dc8c0f-0f4d-4b82-b4a4-35c32a1057f0';

  -- 22. Emrah ÖZDEMİR
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'emrah.ozdemir@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Emrah ÖZDEMİR"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'emrah.ozdemir@rumeli.edu.tr', 'Emrah ÖZDEMİR', 'instructor', 'a0000000-0000-0000-0000-000000000007');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'emrah.ozdemir@rumeli.edu.tr') WHERE id = 'dcb2b62d-a8ae-4811-ac0b-f655381e931a';

  -- 23. Şeyma Nur ÜZÜM
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'seymanur.uzum@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Şeyma Nur ÜZÜM"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'seymanur.uzum@rumeli.edu.tr', 'Şeyma Nur ÜZÜM', 'instructor', 'a0000000-0000-0000-0000-000000000002');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'seymanur.uzum@rumeli.edu.tr') WHERE id = 'dffd4613-89dd-4320-ab18-db81706ad386';

  -- 24. Birsu Ece EKMEKÇİ
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'birsu.ekmekci@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Birsu Ece EKMEKÇİ"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'birsu.ekmekci@rumeli.edu.tr', 'Birsu Ece EKMEKÇİ', 'instructor', 'a0000000-0000-0000-0000-000000000004');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'birsu.ekmekci@rumeli.edu.tr') WHERE id = 'e3b19abb-954e-4f53-ae8c-7250a77bc3a8';

  -- 25. Şebnem TAMER
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'sebnem.tamer@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Şebnem TAMER"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'sebnem.tamer@rumeli.edu.tr', 'Şebnem TAMER', 'instructor', 'a0000000-0000-0000-0000-000000000004');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'sebnem.tamer@rumeli.edu.tr') WHERE id = 'ea0986c8-3078-4c50-b8bf-417d145a5eb1';

  -- 26. Yiğit Er YİĞİT
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'yigiter.yigit@rumeli.edu.tr', crypt('Rumeli2025!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Yiğit Er YİĞİT"}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO v_user_id;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id) VALUES (v_user_id, 'yigiter.yigit@rumeli.edu.tr', 'Yiğit Er YİĞİT', 'instructor', 'a0000000-0000-0000-0000-000000000006');
  END IF;
  UPDATE public.instructors SET profile_id = (SELECT id FROM auth.users WHERE email = 'yigiter.yigit@rumeli.edu.tr') WHERE id = 'fa7883b2-6616-4158-b308-4bb24828c56a';

END $$;

-- Kontrol sorgusu: Kaç tane başarıyla oluşturuldu
SELECT
  COUNT(*) as total_linked_instructors
FROM instructors
WHERE profile_id IS NOT NULL;

-- Başarılı olanları listele
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
