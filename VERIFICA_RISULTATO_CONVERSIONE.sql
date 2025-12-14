-- ============================================
-- VERIFICA RISULTATO CONVERSIONE host_id → owner_id
-- ============================================
-- Esegui questa query per verificare che tutto sia stato convertito correttamente
-- ============================================

-- VERIFICA 1: Colonne della tabella properties
-- ============================================
SELECT 
    'VERIFICA COLONNE' as tipo_verifica,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'owner_id'
        ) THEN '✅ owner_id ESISTE'
        ELSE '❌ owner_id NON ESISTE'
    END as owner_id_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'host_id'
        ) THEN '⚠️ host_id ANCORA ESISTE (PROBLEMA!)'
        ELSE '✅ host_id ELIMINATO'
    END as host_id_status;

-- VERIFICA 2: Mostra tutte le colonne di properties
-- ============================================
SELECT 
    'COLONNE PROPERTIES' as tipo_verifica,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties'
ORDER BY ordinal_position;

-- VERIFICA 3: Policy RLS su bookings (devono usare owner_id, non host_id)
-- ============================================
SELECT 
    'POLICY BOOKINGS' as tipo_verifica,
    policyname,
    cmd as command_type,
    CASE 
        WHEN qual LIKE '%owner_id%' OR qual LIKE '%properties.owner_id%' THEN '✅ USA owner_id'
        WHEN qual LIKE '%host_id%' OR qual LIKE '%properties.host_id%' THEN '❌ USA host_id (ERRORE!)'
        ELSE 'ℹ️ Non specifica'
    END as verifica_colonna,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'bookings'
ORDER BY policyname;

-- VERIFICA 4: Policy RLS su properties (devono usare owner_id)
-- ============================================
SELECT 
    'POLICY PROPERTIES' as tipo_verifica,
    policyname,
    cmd as command_type,
    CASE 
        WHEN qual LIKE '%owner_id%' OR qual LIKE '%properties.owner_id%' THEN '✅ USA owner_id'
        WHEN with_check LIKE '%owner_id%' OR with_check LIKE '%properties.owner_id%' THEN '✅ USA owner_id'
        WHEN qual LIKE '%host_id%' OR qual LIKE '%properties.host_id%' THEN '❌ USA host_id (ERRORE!)'
        WHEN with_check LIKE '%host_id%' OR with_check LIKE '%properties.host_id%' THEN '❌ USA host_id (ERRORE!)'
        ELSE 'ℹ️ Non specifica'
    END as verifica_colonna,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'properties'
ORDER BY policyname;

-- VERIFICA 5: Indici su properties
-- ============================================
SELECT 
    'INDICI PROPERTIES' as tipo_verifica,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'properties'
ORDER BY indexname;

-- VERIFICA 6: Foreign Key Constraints su properties
-- ============================================
SELECT 
    'FOREIGN KEYS PROPERTIES' as tipo_verifica,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'properties'
ORDER BY tc.constraint_name;

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere:
-- ✅ owner_id ESISTE
-- ✅ host_id ELIMINATO
-- ✅ Policy bookings usano owner_id
-- ✅ Policy properties usano owner_id
-- ✅ Indici e foreign keys corretti
-- ============================================




