-- ============================================
-- COMPLETA FIX: ONBOARDING STATE + POSTS RLS
-- ============================================
-- Questo script:
-- 1. Aggiunge colonne per tracciare lo stato dell'onboarding
-- 2. Corregge la RLS policy per posts (tutti gli utenti autenticati possono creare post)
-- ============================================

-- 1. AGGIUNGI COLONNE PER TRACCIARE LO STATO DELL'ONBOARDING
-- ============================================

-- Aggiungi colonna per lo step corrente dell'onboarding (JSONB per flessibilità)
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
    
    RAISE NOTICE 'Colonna onboarding_status aggiunta';
  ELSE
    RAISE NOTICE 'Colonna onboarding_status già esistente';
  END IF;
END $$;

-- Aggiungi colonna per indicare se l'onboarding è completato
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
    
    RAISE NOTICE 'Colonna onboarding_completed aggiunta';
  ELSE
    RAISE NOTICE 'Colonna onboarding_completed già esistente';
  END IF;
END $$;

-- 2. CORREGGE LA RLS POLICY PER POSTS
-- ============================================

-- Rimuovi la policy esistente che permette solo ai Creator
DROP POLICY IF EXISTS "Only creators can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;

-- Crea una nuova policy che permette a TUTTI gli utenti autenticati di creare post
-- Usa WITH CHECK (true) per permettere a tutti gli utenti autenticati
CREATE POLICY "All authenticated users can create posts" ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. VERIFICA LE POLICIES
-- ============================================

SELECT 
  policyname,
  cmd AS operation,
  roles,
  qual AS using_expression,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- 4. VERIFICA LE COLONNE AGGIUNTE
-- ============================================

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
-- FINE
-- ============================================
-- Ora:
-- 1. Tutti gli utenti autenticati possono creare post
-- 2. Lo stato dell'onboarding viene tracciato
-- 3. Gli utenti possono continuare dall'ultimo step
-- ============================================





