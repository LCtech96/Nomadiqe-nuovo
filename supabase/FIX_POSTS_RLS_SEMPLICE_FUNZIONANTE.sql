-- ============================================
-- FIX RLS POLICY PER POSTS - VERSIONE SEMPLICE E FUNZIONANTE
-- ============================================
-- Questo script permette a TUTTI gli utenti autenticati di creare post
-- Non usa riferimenti a colonne specifiche che potrebbero causare errori
-- ============================================

-- 1. Rimuovi tutte le policies esistenti per INSERT
DROP POLICY IF EXISTS "Only creators can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "All authenticated users can create posts" ON public.posts;

-- 2. Crea la nuova policy - versione SEMPLICE che funziona sempre
-- Usa WITH CHECK (true) per permettere a tutti gli utenti autenticati
CREATE POLICY "All authenticated users can create posts" 
  ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Verifica che la policy sia stata creata
SELECT 
  policyname,
  cmd AS operation,
  roles,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'posts'
  AND cmd = 'INSERT';

-- ============================================
-- FINE
-- ============================================
-- Ora tutti gli utenti autenticati possono creare post!
-- ============================================

