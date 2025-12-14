-- ============================================
-- VERIFICA SE UN PROFILO ESISTE NEL DATABASE
-- ============================================
-- Questo script ti permette di verificare se un profilo esiste
-- Puoi cercare per email o per user ID
-- ============================================

-- METODO 1: Cerca per EMAIL
-- ============================================
-- MODIFICA QUI l'email che vuoi cercare
DO $$
DECLARE
  user_email TEXT := 'lucacorrao1996@gmail.com'; -- MODIFICA QUI
  user_id_found UUID;
  profile_exists BOOLEAN;
  profile_data RECORD;
BEGIN
  -- Cerca l'utente in auth.users
  SELECT id INTO user_id_found
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id_found IS NULL THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UTENTE NON TROVATO';
    RAISE NOTICE 'Email cercata: %', user_email;
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UTENTE TROVATO IN auth.users';
    RAISE NOTICE 'User ID: %', user_id_found;
    RAISE NOTICE 'Email: %', user_email;
    RAISE NOTICE '========================================';
    
    -- Verifica se esiste il profilo
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = user_id_found
    ) INTO profile_exists;
    
    IF profile_exists THEN
      -- Carica i dati del profilo
      SELECT * INTO profile_data
      FROM public.profiles
      WHERE id = user_id_found;
      
      RAISE NOTICE '========================================';
      RAISE NOTICE 'PROFILO ESISTE NEL DATABASE!';
      RAISE NOTICE '========================================';
      RAISE NOTICE 'Dettagli profilo:';
      RAISE NOTICE '  - ID: %', profile_data.id;
      RAISE NOTICE '  - Email: %', (SELECT email FROM auth.users WHERE id = user_id_found);
      RAISE NOTICE '  - Username: %', profile_data.username;
      RAISE NOTICE '  - Full Name: %', profile_data.full_name;
      RAISE NOTICE '  - Role: %', profile_data.role;
      RAISE NOTICE '  - Bio: %', profile_data.bio;
      RAISE NOTICE '  - Avatar URL: %', profile_data.avatar_url;
      RAISE NOTICE '  - Created At: %', profile_data.created_at;
      RAISE NOTICE '========================================';
    ELSE
      RAISE NOTICE '========================================';
      RAISE NOTICE 'PROFILO NON ESISTE';
      RAISE NOTICE 'L''utente esiste in auth.users ma non ha un profilo in public.profiles';
      RAISE NOTICE 'Devi completare l''onboarding!';
      RAISE NOTICE '========================================';
    END IF;
  END IF;
END $$;

-- METODO 2: Cerca per USER ID (UUID)
-- ============================================
-- SCOMMENTA E MODIFICA QUI se vuoi cercare per UUID invece che per email
/*
DO $$
DECLARE
  user_id_to_check UUID := 'fef8084d-6a35-40ff-a288-9235cfdc9d41'; -- MODIFICA QUI
  profile_exists BOOLEAN;
  profile_data RECORD;
  user_email TEXT;
BEGIN
  -- Ottieni l'email dall'user ID
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id_to_check;
  
  IF user_email IS NULL THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UTENTE NON TROVATO IN auth.users';
    RAISE NOTICE 'User ID cercato: %', user_id_to_check;
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UTENTE TROVATO';
    RAISE NOTICE 'User ID: %', user_id_to_check;
    RAISE NOTICE 'Email: %', user_email;
    RAISE NOTICE '========================================';
    
    -- Verifica se esiste il profilo
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = user_id_to_check
    ) INTO profile_exists;
    
    IF profile_exists THEN
      SELECT * INTO profile_data
      FROM public.profiles
      WHERE id = user_id_to_check;
      
      RAISE NOTICE '========================================';
      RAISE NOTICE 'PROFILO ESISTE!';
      RAISE NOTICE '========================================';
      RAISE NOTICE 'Username: %', profile_data.username;
      RAISE NOTICE 'Full Name: %', profile_data.full_name;
      RAISE NOTICE 'Role: %', profile_data.role;
      RAISE NOTICE '========================================';
    ELSE
      RAISE NOTICE '========================================';
      RAISE NOTICE 'PROFILO NON ESISTE';
      RAISE NOTICE 'Devi completare l''onboarding!';
      RAISE NOTICE '========================================';
    END IF;
  END IF;
END $$;
*/

-- METODO 3: Query semplice per vedere tutti i profili esistenti
-- ============================================
-- SCOMMENTA per vedere tutti i profili
/*
SELECT 
  p.id,
  u.email,
  p.username,
  p.full_name,
  p.role,
  p.created_at,
  CASE 
    WHEN p.id IS NOT NULL THEN 'PROFILO ESISTE'
    ELSE 'PROFILO NON ESISTE'
  END as stato
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
*/

-- ============================================
-- FINE
-- ============================================




