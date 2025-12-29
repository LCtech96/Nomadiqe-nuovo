-- ============================================
-- VERIFICA STATO RLS PER MANAGER_SERVICES
-- ============================================

-- Verifica se RLS è disabilitato
SELECT 
    'RLS STATUS MANAGER_SERVICES' as info,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity = false THEN '✅ RLS DISABILITATO - OK'
        WHEN rowsecurity = true THEN '❌ RLS ABILITATO - Deve essere disabilitato'
        ELSE '⚠️ Stato sconosciuto'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'manager_services';

-- Verifica se ci sono policy attive
SELECT 
    'POLICY ESISTENTI' as info,
    COUNT(*) as num_policies
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'manager_services';

-- Lista tutte le policy (se ce ne sono)
SELECT 
    'DETTAGLI POLICY' as info,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'manager_services'
ORDER BY policyname;




