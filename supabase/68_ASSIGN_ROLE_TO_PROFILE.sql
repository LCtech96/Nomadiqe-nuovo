-- ============================================
-- ASSEGNA RUOLO MANUALE A PROFILO
-- ============================================
-- Script per assegnare manualmente un ruolo a un profilo specifico
-- ============================================

-- 1. ASSEGNA RUOLO "host" AL PROFILO mattiaorlando.pa@gmail.com
-- ============================================
-- Modifica il ruolo qui sotto se necessario: 'host', 'creator', 'jolly', 'traveler'
UPDATE public.profiles
SET 
  role = 'host'::user_role,
  onboarding_completed = FALSE,
  updated_at = NOW()
WHERE email = 'mattiaorlando.pa@gmail.com'
  AND role IS NULL;

-- Mostra quanti profili sono stati aggiornati
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '✅ Ruolo assegnato con successo a % profilo/i', updated_count;
  ELSE
    RAISE NOTICE 'ℹ️ Nessun profilo aggiornato. Verifica che l''email sia corretta e che il profilo non abbia già un ruolo.';
  END IF;
END $$;

-- 2. VERIFICA IL RISULTATO
-- ============================================
SELECT 
  id,
  email,
  full_name,
  role,
  onboarding_completed,
  created_at,
  updated_at
FROM public.profiles
WHERE email = 'mattiaorlando.pa@gmail.com';

-- 3. ASSEGNA RUOLO A QUALSIASI PROFILO SENZA RUOLO (OPZIONALE)
-- ============================================
-- ATTENZIONE: Questo assegnerà il ruolo 'traveler' a TUTTI i profili senza ruolo
-- Scommenta solo se vuoi assegnare un ruolo di default a tutti i profili senza ruolo
-- UPDATE public.profiles
-- SET 
--   role = 'traveler'::user_role,
--   onboarding_completed = FALSE,
--   updated_at = NOW()
-- WHERE role IS NULL;

-- ============================================
-- FINE
-- ============================================
