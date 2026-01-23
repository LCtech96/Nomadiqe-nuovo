-- ============================================
-- FIX PROFILO SENZA RUOLO
-- ============================================
-- Query per identificare e aggiornare il profilo senza ruolo
-- ============================================

-- 1. IDENTIFICA IL PROFILO SENZA RUOLO
-- ============================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.onboarding_completed,
  p.created_at,
  wr.role as waitlist_role,
  wr.status as waitlist_status,
  wr.created_at as waitlist_created_at
FROM public.profiles p
LEFT JOIN public.waitlist_requests wr ON LOWER(p.email) = LOWER(wr.email)
WHERE p.role IS NULL
ORDER BY p.created_at DESC;

-- 2. AGGIORNA IL PROFILO SENZA RUOLO SE HA WAITLIST APPROVATA
-- ============================================
-- Questa query aggiorna TUTTI i profili senza ruolo che hanno una waitlist approvata
UPDATE public.profiles p
SET 
  role = wr.role::user_role,
  onboarding_completed = FALSE,
  updated_at = NOW()
FROM public.waitlist_requests wr
WHERE LOWER(p.email) = LOWER(wr.email)
  AND wr.status = 'approved'
  AND p.role IS NULL
  AND wr.role IS NOT NULL;

-- Mostra quanti profili sono stati aggiornati
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Aggiornati % profili senza ruolo con ruolo dalla waitlist', updated_count;
END $$;

-- 3. VERIFICA RISULTATO FINALE
-- ============================================
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'host' THEN 1 END) as host_count,
  COUNT(CASE WHEN role = 'host' AND onboarding_completed = FALSE THEN 1 END) as host_not_completed,
  COUNT(CASE WHEN role = 'host' AND onboarding_completed = TRUE THEN 1 END) as host_completed,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as profiles_without_role
FROM public.profiles;

-- ============================================
-- FINE
-- ============================================
