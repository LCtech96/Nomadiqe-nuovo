-- ============================================
-- AGGIUNGI TRACCIAMENTO STATO ONBOARDING
-- ============================================
-- Questo script aggiunge colonne per tracciare lo stato dell'onboarding
-- Permette di salvare lo step corrente e continuare da dove si è interrotto
-- ============================================

-- 1. Aggiungi colonna per lo stato dell'onboarding (JSONB per flessibilità)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN onboarding_status JSONB DEFAULT '{"current_step": "role", "completed_steps": []}'::jsonb;
    
    RAISE NOTICE '✅ Colonna onboarding_status aggiunta con successo';
  ELSE
    RAISE NOTICE 'ℹ️ Colonna onboarding_status già esistente';
  END IF;
END $$;

-- 2. Aggiungi colonna per indicare se l'onboarding è completato
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE '✅ Colonna onboarding_completed aggiunta con successo';
  ELSE
    RAISE NOTICE 'ℹ️ Colonna onboarding_completed già esistente';
  END IF;
END $$;

-- 3. Verifica le colonne aggiunte
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('onboarding_status', 'onboarding_completed')
ORDER BY ordinal_position;

-- ============================================
-- ESEMPIO DI UTILIZZO DELLO STATO
-- ============================================
-- 
-- Struttura onboarding_status (JSONB):
-- {
--   "current_step": "profile",  // step corrente: "role", "profile", "property", "collaborations"
--   "completed_steps": ["role"], // array di step completati
--   "profile": {                 // dati salvati dello step profile
--     "full_name": "...",
--     "username": "...",
--     "avatar_url": "..."
--   },
--   "property": {                // dati salvati dello step property
--     "name": "...",
--     "address": "...",
--     ...
--   }
-- }
--
-- Per aggiornare lo stato:
-- UPDATE public.profiles 
-- SET onboarding_status = onboarding_status || '{"current_step": "property", "completed_steps": ["role", "profile"]}'::jsonb
-- WHERE id = 'user-id';
--
-- ============================================
-- FINE
-- ============================================

