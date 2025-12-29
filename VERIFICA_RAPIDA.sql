-- ============================================
-- VERIFICA RAPIDA - Conversione host_id → owner_id
-- ============================================
-- Query semplificata per vedere subito se tutto è ok
-- ============================================

-- VERIFICA 1: Colonne (la più importante!)
SELECT 
    '✅ owner_id esiste' as verifica,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'owner_id'
        ) THEN 'SÌ ✅'
        ELSE 'NO ❌'
    END as risultato
UNION ALL
SELECT 
    '✅ host_id eliminato' as verifica,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'host_id'
        ) THEN 'NO ❌ (ANCORA ESISTE!)'
        ELSE 'SÌ ✅'
    END as risultato
UNION ALL
SELECT 
    '✅ Foreign key configurata' as verifica,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
              AND table_name = 'properties' 
              AND constraint_name = 'properties_owner_id_fkey'
        ) THEN 'SÌ ✅'
        ELSE 'NO ❌'
    END as risultato;

-- VERIFICA 2: Policy che usano host_id (NON devono esserci!)
SELECT 
    '⚠️ Policy che usano host_id' as verifica,
    COUNT(*) as numero_policy_problematiche
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      qual LIKE '%host_id%' 
      OR qual LIKE '%properties.host_id%'
      OR with_check LIKE '%host_id%'
      OR with_check LIKE '%properties.host_id%'
  );

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere 3 righe:
-- 1. ✅ owner_id esiste: SÌ ✅
-- 2. ✅ host_id eliminato: SÌ ✅
-- 3. ✅ Foreign key configurata: SÌ ✅
-- 
-- E poi:
-- 4. ⚠️ Policy che usano host_id: 0 (zero!)
-- ============================================





