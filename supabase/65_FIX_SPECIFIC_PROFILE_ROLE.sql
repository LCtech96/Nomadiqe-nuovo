-- ============================================
-- FIX RUOLO PER PROFILO SPECIFICO
-- ============================================
-- Query per aggiornare il ruolo di un profilo specifico
-- basandosi sulla waitlist approvata
-- ============================================

-- AGGIORNA IL PROFILO SPECIFICO
-- ============================================
UPDATE public.profiles p
SET 
  role = wr.role,
  onboarding_completed = FALSE,
  updated_at = NOW()
FROM public.waitlist_requests wr
WHERE LOWER(p.email) = LOWER(wr.email)
  AND wr.status = 'approved'
  AND (p.role IS NULL OR p.role != wr.role)
  AND wr.role IS NOT NULL;

-- VERIFICA IL RISULTATO
-- ============================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.onboarding_completed,
  wr.role as waitlist_role,
  wr.status as waitlist_status,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.waitlist_requests wr ON LOWER(p.email) = LOWER(wr.email)
WHERE p.email = 'lucacorrao1m@gmail.com'
ORDER BY p.created_at DESC;

-- ============================================
-- FINE
-- ============================================
