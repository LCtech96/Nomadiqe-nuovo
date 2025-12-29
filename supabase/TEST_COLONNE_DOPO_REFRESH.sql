-- ============================================
-- TEST COLONNE DOPO REFRESH CACHE
-- ============================================
-- Questo script testa che le colonne siano accessibili
-- Esegui questo DOPO aver aspettato 2-3 minuti dal refresh
-- ============================================

-- Test 1: Verifica che posts.creator_id sia accessibile
SELECT 
    'Test 1: posts.creator_id' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'posts' 
              AND column_name = 'creator_id'
        ) THEN '✅ COLONNA ESISTE'
        ELSE '❌ COLONNA NON TROVATA'
    END as risultato;

-- Test 2: Verifica che properties.title sia accessibile
SELECT 
    'Test 2: properties.title' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'title'
        ) THEN '✅ COLONNA ESISTE'
        ELSE '❌ COLONNA NON TROVATA'
    END as risultato;

-- Test 3: Verifica che properties.owner_id sia accessibile
SELECT 
    'Test 3: properties.owner_id' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'owner_id'
        ) THEN '✅ COLONNA ESISTE'
        ELSE '❌ COLONNA NON TROVATA'
    END as risultato;

-- Test 4: Verifica che properties.location_data sia accessibile
SELECT 
    'Test 4: properties.location_data' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'location_data'
        ) THEN '✅ COLONNA ESISTE'
        ELSE '❌ COLONNA NON TROVATA'
    END as risultato;

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere 4 righe, tutte con "✅ COLONNA ESISTE"
-- Se vedi "❌ COLONNA NON TROVATA", c'è ancora un problema
-- ============================================





