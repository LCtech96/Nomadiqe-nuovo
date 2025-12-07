-- ============================================
-- VERIFICA E CORREZIONE RLS POLICIES PER PROFILES
-- ============================================
-- Questo script verifica e correge le RLS policies per la tabella profiles
-- Risolve gli errori 406 e PGRST116
-- ============================================

-- 1. VERIFICA STATO ATTUALE
-- ============================================
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policies_count INTEGER;
BEGIN
  -- Verifica se RLS è abilitato
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  RAISE NOTICE 'RLS abilitato per profiles: %', rls_enabled;
  
  -- Conta le policies esistenti
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  RAISE NOTICE 'Numero di policies esistenti: %', policies_count;
END $$;

-- 2. CORREGGE IL CONSTRAINT DEL RUOLO
-- ============================================
-- Rimuovi il vecchio constraint che permette solo creator e host
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Aggiungi il nuovo constraint con tutti e 4 i ruoli
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK ((role IS NULL) OR (role IN ('host', 'creator', 'traveler', 'manager')));

-- 3. RIMUOVI TUTTE LE POLICIES ESISTENTI
-- ============================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 4. CREA LE NUOVE POLICIES CORRETTE
-- ============================================

-- Policy per SELECT: gli utenti possono vedere il proprio profilo
-- E anche tutti gli altri profili (per navigazione pubblica)
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT
  USING (true);

-- Policy per INSERT: gli utenti possono inserire solo il proprio profilo
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy per UPDATE: gli utenti possono aggiornare solo il proprio profilo
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy per DELETE: gli utenti possono eliminare solo il proprio profilo (opzionale)
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- 5. VERIFICA FINALE
-- ============================================
DO $$
DECLARE
  policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'profiles';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICA FINALE:';
  RAISE NOTICE 'Numero di policies dopo la correzione: %', policies_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- FINE
-- ============================================

