-- ============================================
-- VERIFICA WAITLIST PER PROFILO SENZA RUOLO
-- ============================================
-- Query per verificare se esiste una waitlist (anche non approvata) per il profilo
-- ============================================

-- 1. VERIFICA TUTTE LE WAITLIST PER IL PROFILO SENZA RUOLO
-- ============================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.onboarding_completed,
  p.created_at as profile_created_at,
  wr.id as waitlist_id,
  wr.role as waitlist_role,
  wr.status as waitlist_status,
  wr.created_at as waitlist_created_at,
  wr.updated_at as waitlist_updated_at
FROM public.profiles p
LEFT JOIN public.waitlist_requests wr ON LOWER(p.email) = LOWER(wr.email)
WHERE p.role IS NULL
ORDER BY p.created_at DESC;

-- 2. VERIFICA SPECIFICA PER mattiaorlando.pa@gmail.com
-- ============================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.onboarding_completed,
  p.created_at as profile_created_at,
  wr.id as waitlist_id,
  wr.role as waitlist_role,
  wr.status as waitlist_status,
  wr.created_at as waitlist_created_at,
  wr.updated_at as waitlist_updated_at
FROM public.profiles p
LEFT JOIN public.waitlist_requests wr ON LOWER(p.email) = LOWER(wr.email)
WHERE p.email = 'mattiaorlando.pa@gmail.com';

-- 3. SE ESISTE UNA WAITLIST NON APPROVATA, AGGIORNA IL PROFILO
-- ============================================
-- ATTENZIONE: Questo aggiorna il profilo anche se la waitlist non è approvata
-- Usa solo se vuoi assegnare il ruolo anche senza approvazione
-- UPDATE public.profiles p
-- SET 
--   role = wr.role::user_role,
--   onboarding_completed = FALSE,
--   updated_at = NOW()
-- FROM public.waitlist_requests wr
-- WHERE LOWER(p.email) = LOWER(wr.email)
--   AND p.role IS NULL
--   AND wr.role IS NOT NULL
--   AND wr.status = 'pending';  -- Cambia 'pending' con lo status che vuoi

-- ============================================
-- FINE
-- ============================================
