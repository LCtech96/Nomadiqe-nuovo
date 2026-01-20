-- ============================================
-- CAMBIA RUOLO "manager" IN "jolly"
-- ============================================
-- Aggiorna tutti i ruoli "manager" in "jolly" nelle tabelle profiles e waitlist_requests
-- ============================================

-- 1. AGGIORNA IL CONSTRAINT PER INCLUDERE "jolly" (se non esiste già)
-- ============================================

-- Per la tabella profiles
DO $$
BEGIN
  -- Rimuovi il vecchio constraint se esiste
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  
  -- Aggiungi il nuovo constraint con "jolly" invece di "manager"
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role::text = ANY (ARRAY['host'::text, 'creator'::text, 'traveler'::text, 'jolly'::text]));
    
  RAISE NOTICE 'Constraint aggiornato per profiles: jolly aggiunto';
END $$;

-- Per la tabella waitlist_requests
DO $$
BEGIN
  -- Rimuovi il vecchio constraint se esiste
  ALTER TABLE public.waitlist_requests DROP CONSTRAINT IF EXISTS waitlist_requests_role_check;
  
  -- Aggiungi il nuovo constraint con "jolly" invece di "manager"
  ALTER TABLE public.waitlist_requests ADD CONSTRAINT waitlist_requests_role_check
    CHECK (role IN ('host', 'creator', 'traveler', 'jolly'));
    
  RAISE NOTICE 'Constraint aggiornato per waitlist_requests: jolly aggiunto';
END $$;

-- 2. AGGIORNA TUTTI I RECORD DA "manager" A "jolly"
-- ============================================

-- Aggiorna profiles
UPDATE public.profiles
SET role = 'jolly'
WHERE role = 'manager';

-- Mostra quanti record sono stati aggiornati
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Aggiornati % record nella tabella profiles', updated_count;
END $$;

-- Aggiorna waitlist_requests
UPDATE public.waitlist_requests
SET role = 'jolly'
WHERE role = 'manager';

-- Mostra quanti record sono stati aggiornati
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Aggiornati % record nella tabella waitlist_requests', updated_count;
END $$;

-- 3. VERIFICA I RISULTATI
-- ============================================

-- Conta quanti "jolly" ci sono ora
SELECT 
  'profiles' as tabella,
  COUNT(*) as totale_jolly
FROM public.profiles
WHERE role = 'jolly'

UNION ALL

SELECT 
  'waitlist_requests' as tabella,
  COUNT(*) as totale_jolly
FROM public.waitlist_requests
WHERE role = 'jolly';

-- Verifica che non ci siano più "manager"
SELECT 
  'profiles' as tabella,
  COUNT(*) as rimanenti_manager
FROM public.profiles
WHERE role = 'manager'

UNION ALL

SELECT 
  'waitlist_requests' as tabella,
  COUNT(*) as rimanenti_manager
FROM public.waitlist_requests
WHERE role = 'manager';
