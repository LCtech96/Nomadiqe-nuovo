-- ============================================
-- FIX: Properties RLS Policy e Cancellazione Definitiva
-- ============================================
-- Questo script corregge le policy RLS per permettere agli Host di:
-- 1. Inserire nuove proprietà
-- 2. Vedere le proprie proprietà (anche se non attive)
-- 3. Aggiornare le proprie proprietà
-- 4. Cancellare definitivamente le proprie proprietà
-- ============================================

-- PASSO 1: Elimina tutte le policy esistenti per properties (per evitare conflitti)
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Public properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;

-- PASSO 2: Abilita RLS sulla tabella properties (se non già abilitato)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Policy per SELECT
-- - Tutti possono vedere le proprietà attive
-- - Gli utenti possono vedere le proprie proprietà (anche se non attive)
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can view own properties" ON public.properties
  FOR SELECT
  USING (auth.uid() = owner_id);

-- PASSO 4: Policy per INSERT
-- Gli utenti possono inserire proprietà solo se owner_id corrisponde al loro ID
-- IMPORTANTE: WITH CHECK è necessario per INSERT
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND owner_id IS NOT NULL 
    AND auth.uid() = owner_id
  );

-- PASSO 5: Policy per UPDATE
-- Gli utenti possono aggiornare solo le loro proprietà
-- IMPORTANTE: Sia USING che WITH CHECK sono necessari per UPDATE
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- PASSO 6: Policy per DELETE
-- Gli utenti possono eliminare definitivamente solo le loro proprietà
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- VERIFICA
-- ============================================
-- Verifica che le policy siano state create correttamente
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'properties' 
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================
-- SPIEGAZIONE
-- ============================================
-- Le policy RLS richiedono:
-- - USING: per SELECT, UPDATE (controlla le righe esistenti), DELETE
-- - WITH CHECK: per INSERT (controlla la nuova riga) e UPDATE (controlla la riga dopo l'aggiornamento)
--
-- Policy SELECT:
-- - "Properties are viewable by everyone": Tutti possono vedere proprietà attive
-- - "Users can view own properties": Gli utenti possono vedere le proprie proprietà (anche non attive)
--
-- Policy INSERT:
-- - Verifica che l'utente sia autenticato e che owner_id corrisponda all'ID dell'utente
--
-- Policy DELETE:
-- - Permette agli utenti di cancellare definitivamente solo le proprie proprietà
-- - La cancellazione è CASCADE (elimina anche bookings, reviews, etc. grazie ai foreign keys)
-- ============================================
