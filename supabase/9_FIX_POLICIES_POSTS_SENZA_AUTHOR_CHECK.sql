-- ============================================
-- FIX POLICIES POSTS - VERSIONE PERMISSIVA
-- ============================================
-- Crea policies che permettono a TUTTI gli utenti autenticati
-- di creare post, senza controllare author_id
-- ============================================

-- Disabilita RLS
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- Rimuovi tutte le policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'posts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.posts', policy_record.policyname);
    END LOOP;
END $$;

-- Ricrea policies SEMPLICI
CREATE POLICY "Anyone can view posts"
ON public.posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (true);  -- PERMETTI A TUTTI gli autenticati, senza controllare author_id

CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (true);

CREATE POLICY "Users can delete own posts"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Riabilita RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Refresh cache
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- Verifica
SELECT 
    policyname,
    cmd,
    roles,
    qual as using_check,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;




