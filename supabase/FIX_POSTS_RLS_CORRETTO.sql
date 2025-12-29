-- ============================================
-- CORREZIONE RLS POLICIES PER POSTS
-- Permette a TUTTI gli utenti autenticati (host, creator, traveler, manager) di creare post
-- ============================================

-- 1. Rimuovi la policy esistente che permette solo ai Creator
DROP POLICY IF EXISTS "Only creators can insert posts" ON public.posts;

-- 2. Crea una nuova policy che permette a tutti gli utenti autenticati di creare post
-- Usa un approccio più semplice che non richiede di risolvere la colonna nella policy
CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Verifica le policies esistenti
SELECT 
  policyname,
  cmd AS operation,
  roles,
  qual AS using_expression,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- ============================================
-- FINE
-- ============================================





