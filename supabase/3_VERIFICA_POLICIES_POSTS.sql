-- ============================================
-- PASSO 3: VERIFICA POLICIES POSTS
-- ============================================

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY policyname;

