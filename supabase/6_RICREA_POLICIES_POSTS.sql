-- ============================================
-- RICREA POLICIES POSTS CORRETTE
-- ============================================
-- Questo script ricrea SOLO le 4 policies necessarie
-- ============================================

-- Assicurati che RLS sia abilitata
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Crea policy per SELECT (chiunque può vedere i post)
CREATE POLICY "Anyone can view posts"
ON public.posts FOR SELECT
USING (true);

-- Crea policy per INSERT (solo utenti autenticati possono creare post)
CREATE POLICY "Authenticated users can create posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

-- Crea policy per UPDATE (solo l'autore può modificare il proprio post)
CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Crea policy per DELETE (solo l'autore può eliminare il proprio post)
CREATE POLICY "Users can delete own posts"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Refresh cache PostgREST
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- Verifica il risultato
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY policyname;

-- Dovrebbe mostrare esattamente 4 policies



