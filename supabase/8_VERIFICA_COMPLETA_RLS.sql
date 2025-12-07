-- ============================================
-- VERIFICA COMPLETA RLS E PERMESSI
-- ============================================

-- 1. Verifica che RLS sia abilitata
SELECT 
    '🔒 RLS STATUS' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'posts';

-- 2. Mostra TUTTE le policies per posts con i dettagli completi
SELECT 
    '📋 POLICIES POSTS' as info,
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY cmd, policyname;

-- 3. Verifica la struttura della tabella posts
SELECT 
    '📊 COLONNE POSTS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'posts'
ORDER BY ordinal_position;

-- 4. Verifica il tuo user ID
SELECT 
    '👤 TUO USER ID' as info,
    id as user_id,
    email
FROM auth.users 
WHERE email = 'lucacorrao1996@gmail.com';

