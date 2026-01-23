-- ============================================
-- FIX ONBOARDING DOPO VERIFICA EMAIL
-- ============================================
-- Questo script assicura che:
-- 1. La colonna onboarding_completed esista e sia inizializzata a FALSE
-- 2. Tutti i profili nuovi abbiano onboarding_completed = FALSE
-- 3. Il ruolo dalla waitlist venga assegnato correttamente
-- ============================================

-- 1. VERIFICA E AGGIUNGI COLONNA onboarding_completed
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;
    
    RAISE NOTICE '✅ Colonna onboarding_completed aggiunta con successo';
  ELSE
    -- Assicurati che il default sia FALSE
    ALTER TABLE public.profiles 
    ALTER COLUMN onboarding_completed SET DEFAULT FALSE;
    
    RAISE NOTICE 'ℹ️ Colonna onboarding_completed già esistente, default impostato a FALSE';
  END IF;
END $$;

-- 2. AGGIORNA TUTTI I PROFILI ESISTENTI SENZA onboarding_completed
-- ============================================
UPDATE public.profiles
SET onboarding_completed = FALSE
WHERE onboarding_completed IS NULL;

-- 3. ASSICURA CHE onboarding_completed NON SIA NULL
-- ============================================
ALTER TABLE public.profiles 
ALTER COLUMN onboarding_completed SET NOT NULL;

-- 4. CREA TRIGGER PER ASSICURARE onboarding_completed = FALSE ALLA CREAZIONE
-- ============================================
CREATE OR REPLACE FUNCTION public.set_onboarding_default()
RETURNS TRIGGER AS $$
BEGIN
  -- Se onboarding_completed non è specificato, imposta FALSE
  IF NEW.onboarding_completed IS NULL THEN
    NEW.onboarding_completed := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rimuovi trigger esistente se presente
DROP TRIGGER IF EXISTS trigger_set_onboarding_default ON public.profiles;

-- Crea il trigger
CREATE TRIGGER trigger_set_onboarding_default
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_onboarding_default();

-- 5. VERIFICA CHE I PROFILI CON RUOLO HOST ABBIANO onboarding_completed = FALSE (se non completato)
-- ============================================
-- Questo query mostra i profili host che potrebbero avere problemi
SELECT 
  id,
  email,
  full_name,
  role,
  onboarding_completed,
  created_at
FROM public.profiles
WHERE role = 'host'
  AND (onboarding_completed IS NULL OR onboarding_completed = TRUE)
ORDER BY created_at DESC
LIMIT 10;

-- 5.1 VERIFICA PROFILI SENZA RUOLO MA CON EMAIL NELLA WAITLIST APPROVATA
-- ============================================
-- Questo aiuta a identificare profili che dovrebbero avere un ruolo dalla waitlist
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.onboarding_completed,
  wr.role as waitlist_role,
  wr.status as waitlist_status,
  p.created_at
FROM public.profiles p
LEFT JOIN public.waitlist_requests wr ON LOWER(p.email) = LOWER(wr.email)
WHERE p.role IS NULL
  AND wr.status = 'approved'
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. AGGIORNA I PROFILI HOST ESISTENTI (solo se vuoi forzare il re-onboarding)
-- ============================================
-- ATTENZIONE: Questo imposterà onboarding_completed = FALSE per TUTTI gli host
-- Scommenta solo se vuoi forzare tutti gli host a rifare l'onboarding
-- UPDATE public.profiles
-- SET onboarding_completed = FALSE
-- WHERE role = 'host';

-- 7. VERIFICA STRUTTURA FINALE
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('onboarding_completed', 'role', 'email')
ORDER BY ordinal_position;

-- 8. AGGIORNA PROFILI SENZA RUOLO MA CON WAITLIST APPROVATA
-- ============================================
-- Questo aggiorna i profili che hanno una waitlist approvata ma non hanno ancora il ruolo assegnato
UPDATE public.profiles p
SET 
  role = wr.role,
  onboarding_completed = FALSE
FROM public.waitlist_requests wr
WHERE LOWER(p.email) = LOWER(wr.email)
  AND wr.status = 'approved'
  AND p.role IS NULL
  AND wr.role IS NOT NULL;

-- 9. VERIFICA FINALE
-- ============================================
-- Esegui questa query per verificare che tutto sia corretto:
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'host' THEN 1 END) as host_count,
  COUNT(CASE WHEN role = 'host' AND onboarding_completed = FALSE THEN 1 END) as host_not_completed,
  COUNT(CASE WHEN role = 'host' AND onboarding_completed = TRUE THEN 1 END) as host_completed,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as profiles_without_role,
  COUNT(CASE WHEN role IS NULL AND email IN (
    SELECT email FROM public.waitlist_requests WHERE status = 'approved'
  ) THEN 1 END) as profiles_without_role_but_approved_waitlist
FROM public.profiles;

-- ============================================
-- FINE
-- ============================================
