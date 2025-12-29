-- ============================================
-- CORREZIONE RLS POLICIES PER POSTS
-- Permette a Host, Creator e Manager di creare post
-- ============================================

-- 1. Rimuovi la policy esistente che permette solo ai Creator
DROP POLICY IF EXISTS "Only creators can insert posts" ON public.posts;

-- 2. Crea una nuova policy che permette a tutti gli utenti autenticati di creare post
CREATE POLICY "Authenticated users can create posts" ON public.posts
  FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- 3. Verifica le policies esistenti
SELECT 
  policyname,
  cmd AS operation,
  qual AS using_expression,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- ============================================
-- FINE
-- ============================================





