-- ============================================
-- VERIFICA COMPLETA SETUP DATABASE
-- ============================================
-- Questa query verifica che tutte le tabelle, funzioni, policy e indici
-- necessari siano presenti e configurati correttamente
-- ============================================

-- 1. VERIFICA TABELLE REFERRAL
-- ============================================
SELECT 
    'TABELLE REFERRAL' as categoria,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'host_referral_codes') 
        THEN '✓ host_referral_codes esiste'
        ELSE '✗ host_referral_codes MANCANTE'
    END as stato
UNION ALL
SELECT 
    'TABELLE REFERRAL',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creator_referral_codes') 
        THEN '✓ creator_referral_codes esiste'
        ELSE '✗ creator_referral_codes MANCANTE'
    END
UNION ALL
SELECT 
    'TABELLE REFERRAL',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'host_referrals') 
        THEN '✓ host_referrals esiste'
        ELSE '✗ host_referrals MANCANTE'
    END
UNION ALL
SELECT 
    'TABELLE REFERRAL',
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'creator_referrals') 
        THEN '✓ creator_referrals esiste'
        ELSE '✗ creator_referrals MANCANTE'
    END
UNION ALL

-- 2. VERIFICA COLONNA owner_id IN PROPERTIES
-- ============================================
SELECT 
    'PROPERTIES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'properties' 
            AND column_name = 'owner_id'
        ) 
        THEN '✓ owner_id esiste in properties'
        ELSE '✗ owner_id MANCANTE in properties'
    END
UNION ALL

-- 3. VERIFICA FUNZIONI RPC
-- ============================================
SELECT 
    'FUNZIONI RPC',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'get_or_create_host_referral_code'
        ) 
        THEN '✓ get_or_create_host_referral_code esiste'
        ELSE '✗ get_or_create_host_referral_code MANCANTE'
    END
UNION ALL
SELECT 
    'FUNZIONI RPC',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'get_or_create_creator_referral_code'
        ) 
        THEN '✓ get_or_create_creator_referral_code esiste'
        ELSE '✗ get_or_create_creator_referral_code MANCANTE'
    END
UNION ALL

-- 4. VERIFICA RLS POLICIES PER PROPERTIES
-- ============================================
SELECT 
    'RLS PROPERTIES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'properties' 
            AND policyname = 'Properties are viewable by everyone'
            AND cmd = 'SELECT'
        ) 
        THEN '✓ Policy SELECT "Properties are viewable by everyone" esiste'
        ELSE '✗ Policy SELECT "Properties are viewable by everyone" MANCANTE'
    END
UNION ALL
SELECT 
    'RLS PROPERTIES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'properties' 
            AND policyname = 'Users can view own properties'
            AND cmd = 'SELECT'
        ) 
        THEN '✓ Policy SELECT "Users can view own properties" esiste'
        ELSE '✗ Policy SELECT "Users can view own properties" MANCANTE'
    END
UNION ALL
SELECT 
    'RLS PROPERTIES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'properties' 
            AND policyname = 'Users can insert own properties'
            AND cmd = 'INSERT'
        ) 
        THEN '✓ Policy INSERT "Users can insert own properties" esiste'
        ELSE '✗ Policy INSERT "Users can insert own properties" MANCANTE'
    END
UNION ALL
SELECT 
    'RLS PROPERTIES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'properties' 
            AND policyname = 'Users can update own properties'
            AND cmd = 'UPDATE'
        ) 
        THEN '✓ Policy UPDATE "Users can update own properties" esiste'
        ELSE '✗ Policy UPDATE "Users can update own properties" MANCANTE'
    END
UNION ALL
SELECT 
    'RLS PROPERTIES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'properties' 
            AND policyname = 'Users can delete own properties'
            AND cmd = 'DELETE'
        ) 
        THEN '✓ Policy DELETE "Users can delete own properties" esiste'
        ELSE '✗ Policy DELETE "Users can delete own properties" MANCANTE'
    END
UNION ALL

-- 5. VERIFICA RLS ENABLED SU PROPERTIES
-- ============================================
SELECT 
    'RLS PROPERTIES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' 
            AND t.tablename = 'properties'
            AND c.relrowsecurity = true
        ) 
        THEN '✓ RLS è abilitato su properties'
        ELSE '✗ RLS NON abilitato su properties'
    END
UNION ALL

-- 6. VERIFICA RLS POLICIES PER HOST_REFERRAL_CODES
-- ============================================
SELECT 
    'RLS HOST_REFERRAL_CODES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'host_referral_codes' 
            AND policyname = 'Hosts can view their own referral codes'
        ) 
        THEN '✓ Policy SELECT per host_referral_codes esiste'
        ELSE '✗ Policy SELECT per host_referral_codes MANCANTE'
    END
UNION ALL
SELECT 
    'RLS HOST_REFERRAL_CODES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'host_referral_codes' 
            AND policyname = 'Hosts can create their own referral codes'
        ) 
        THEN '✓ Policy INSERT per host_referral_codes esiste'
        ELSE '✗ Policy INSERT per host_referral_codes MANCANTE'
    END
UNION ALL

-- 7. VERIFICA RLS POLICIES PER CREATOR_REFERRAL_CODES
-- ============================================
SELECT 
    'RLS CREATOR_REFERRAL_CODES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'creator_referral_codes' 
            AND policyname = 'Creators can view their own referral codes'
        ) 
        THEN '✓ Policy SELECT per creator_referral_codes esiste'
        ELSE '✗ Policy SELECT per creator_referral_codes MANCANTE'
    END
UNION ALL
SELECT 
    'RLS CREATOR_REFERRAL_CODES',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'creator_referral_codes' 
            AND policyname = 'Creators can create their own referral codes'
        ) 
        THEN '✓ Policy INSERT per creator_referral_codes esiste'
        ELSE '✗ Policy INSERT per creator_referral_codes MANCANTE'
    END
UNION ALL

-- 8. VERIFICA INDICI
-- ============================================
SELECT 
    'INDICI',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'host_referral_codes' 
            AND indexname = 'idx_host_referral_codes_host_id'
        ) 
        THEN '✓ Indice idx_host_referral_codes_host_id esiste'
        ELSE '✗ Indice idx_host_referral_codes_host_id MANCANTE'
    END
UNION ALL
SELECT 
    'INDICI',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'creator_referral_codes' 
            AND indexname = 'idx_creator_referral_codes_creator_id'
        ) 
        THEN '✓ Indice idx_creator_referral_codes_creator_id esiste'
        ELSE '✗ Indice idx_creator_referral_codes_creator_id MANCANTE'
    END
ORDER BY categoria, stato;

-- ============================================
-- RIEPILOGO DETTAGLIATO
-- ============================================

-- Mostra tutte le policy RLS per properties
SELECT 
    'DETTAGLIO POLICY PROPERTIES' as info,
    policyname,
    cmd as operazione,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'Nessuna condizione USING'
    END as condizione_using,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'Nessuna condizione WITH CHECK'
    END as condizione_with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'properties'
ORDER BY cmd, policyname;

-- Mostra tutte le policy RLS per referral codes
SELECT 
    'DETTAGLIO POLICY REFERRAL' as info,
    tablename,
    policyname,
    cmd as operazione,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'Nessuna condizione USING'
    END as condizione_using,
    CASE 
        WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check
        ELSE 'Nessuna condizione WITH CHECK'
    END as condizione_with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('host_referral_codes', 'creator_referral_codes')
ORDER BY tablename, cmd, policyname;

-- Verifica che la tabella referral_codes NON esista (dovrebbe essere rimossa)
SELECT 
    'VERIFICA TABELLA OBSOLETA' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referral_codes') 
        THEN '⚠ ATTENZIONE: La tabella referral_codes esiste ancora (dovrebbe essere rimossa)'
        ELSE '✓ La tabella referral_codes non esiste (corretto)'
    END as stato;
