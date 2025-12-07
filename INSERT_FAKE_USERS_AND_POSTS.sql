-- Script per creare utenti fake e post di test
-- 10 Creator, 5 Host, 2 Manager

-- Disabilita temporaneamente i trigger RLS per l'inserimento
SET session_replication_role = replica;

-- Inserisci 10 Creator
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES 
  (gen_random_uuid(), 'creator1@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator2@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator3@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator4@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator5@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator6@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator7@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator8@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator9@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'creator10@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
ON CONFLICT (email) DO NOTHING;

-- Inserisci 5 Host
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES 
  (gen_random_uuid(), 'host1@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'host2@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'host3@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'host4@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'host5@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
ON CONFLICT (email) DO NOTHING;

-- Inserisci 2 Manager
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES 
  (gen_random_uuid(), 'manager1@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  (gen_random_uuid(), 'manager2@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
ON CONFLICT (email) DO NOTHING;

-- Crea profili per i Creator
INSERT INTO public.profiles (id, username, full_name, bio, role, points, created_at, updated_at)
SELECT 
  au.id,
  'creator' || (ROW_NUMBER() OVER ()),
  'Creator ' || (ROW_NUMBER() OVER ()),
  'Sono un content creator appassionato di viaggi e avventure!',
  'creator',
  100,
  now(),
  now()
FROM auth.users au
WHERE au.email LIKE 'creator%@test.com'
ON CONFLICT (id) DO UPDATE SET role = 'creator';

-- Crea profili per gli Host
INSERT INTO public.profiles (id, username, full_name, bio, role, points, created_at, updated_at)
SELECT 
  au.id,
  'host' || (ROW_NUMBER() OVER ()),
  'Host ' || (ROW_NUMBER() OVER ()),
  'Offro strutture uniche per soggiorni indimenticabili!',
  'host',
  100,
  now(),
  now()
FROM auth.users au
WHERE au.email LIKE 'host%@test.com'
ON CONFLICT (id) DO UPDATE SET role = 'host';

-- Crea profili per i Manager
INSERT INTO public.profiles (id, username, full_name, bio, role, points, created_at, updated_at)
SELECT 
  au.id,
  'manager' || (ROW_NUMBER() OVER ()),
  'Manager ' || (ROW_NUMBER() OVER ()),
  'Gestisco collaborazioni tra creator e host!',
  'manager',
  100,
  now(),
  now()
FROM auth.users au
WHERE au.email LIKE 'manager%@test.com'
ON CONFLICT (id) DO UPDATE SET role = 'manager';

-- Crea alcuni post dai Creator
DO $$
DECLARE
  creator_record RECORD;
  post_content TEXT[] := ARRAY[
    'Che bella giornata di viaggi! 🌍',
    'Appena arrivato in questa location incredibile!',
    'Non vedo l''ora di condividere con voi questa esperienza',
    'Nuovo video in arrivo, stay tuned! 📹',
    'Grazie a tutti per il supporto! ❤️',
    'Esplorando nuovi posti ogni giorno',
    'La vita è un''avventura, viviamola insieme!',
    'Nuovo progetto in arrivo, siete pronti?',
    'Che meraviglia questo posto! 🏔️',
    'Collaborazione fantastica in arrivo!'
  ];
  i INTEGER;
BEGIN
  i := 1;
  FOR creator_record IN 
    SELECT p.id 
    FROM public.profiles p
    WHERE p.role = 'creator'
    LIMIT 10
  LOOP
    -- Crea 1-2 post per ogni creator
    INSERT INTO public.posts (creator_id, content, created_at)
    VALUES 
      (creator_record.id, post_content[i], now() - (i || ' hours')::interval);
    
    IF i <= 5 THEN
      INSERT INTO public.posts (creator_id, content, created_at)
      VALUES 
        (creator_record.id, 'Secondo post! Che ne pensate? 🤔', now() - ((i * 2) || ' hours')::interval);
    END IF;
    
    i := i + 1;
  END LOOP;
END $$;

-- Riabilita i trigger RLS
SET session_replication_role = DEFAULT;

-- Verifica i risultati
SELECT role, COUNT(*) as count
FROM public.profiles
WHERE role IN ('creator', 'host', 'manager')
GROUP BY role
ORDER BY role;

-- Verifica i post creati
SELECT COUNT(*) as total_posts
FROM public.posts;


