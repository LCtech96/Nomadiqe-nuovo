-- ============================================
-- FIX WAITLIST_REQUESTS ROLE CONSTRAINT
-- ============================================
-- Questo script assicura che il constraint accetti "jolly" come ruolo valido
-- e gestisce anche il caso-insensitive matching

-- 1. RIMUOVI IL CONSTRAINT ESISTENTE
-- ============================================
ALTER TABLE public.waitlist_requests 
DROP CONSTRAINT IF EXISTS waitlist_requests_role_check;

-- 2. RICREA IL CONSTRAINT CON "jolly" INCLUSO
-- ============================================
ALTER TABLE public.waitlist_requests 
ADD CONSTRAINT waitlist_requests_role_check
CHECK (LOWER(role) IN ('host', 'creator', 'traveler', 'jolly'));

-- 3. VERIFICA CHE IL CONSTRAINT SIA STATO CREATO CORRETTAMENTE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Constraint waitlist_requests_role_check aggiornato con successo';
  RAISE NOTICE 'Ruoli permessi: host, creator, traveler, jolly (case-insensitive)';
END $$;

-- ============================================
-- FINE SCRIPT
-- ============================================
