-- ============================================
-- DISABILITA RLS PER POSTS TEMPORANEAMENTE
-- ============================================
-- Questo permetterà di creare post senza errori RLS
-- mentre diagnostichiamo il problema
-- ============================================

-- Disabilita RLS per la tabella posts
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- Verifica
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'posts';

-- Dovrebbe mostrare rls_enabled = false



