-- ============================================
-- FIX: Properties RLS Policy per INSERT operations
-- ============================================
-- Questo script corregge le policy RLS per permettere agli Host di inserire nuove proprietà
-- IMPORTANTE: La tabella properties usa owner_id, NON host_id
-- ============================================

-- Elimina tutte le policy esistenti per properties (per evitare conflitti)
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- Abilita RLS sulla tabella properties (se non già abilitato)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Tutti possono vedere le proprietà attive
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT
  USING (is_active = TRUE);

-- Policy 2: INSERT - Gli utenti possono inserire proprietà solo se owner_id corrisponde al loro ID
-- IMPORTANTE: WITH CHECK è necessario per INSERT
-- Nota: Verifica anche che l'utente sia autenticato e che owner_id sia impostato
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND owner_id IS NOT NULL 
    AND auth.uid() = owner_id
  );

-- Policy 3: UPDATE - Gli utenti possono aggiornare solo le loro proprietà
-- IMPORTANTE: Sia USING che WITH CHECK sono necessari per UPDATE
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy 4: DELETE - Gli utenti possono eliminare solo le loro proprietà
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
-- Senza WITH CHECK per INSERT, tutte le operazioni INSERT falliranno con:
-- "new row violates row-level security policy"
-- ============================================

