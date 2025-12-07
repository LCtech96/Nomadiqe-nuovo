-- ============================================
-- VERIFICA FINALE COLONNE - VERSIONE CORRETTA
-- ============================================
-- Questo script verifica che TUTTE le colonne esistano
-- ============================================

-- Verifica posts.creator_id
SELECT 
    'posts.creator_id' as colonna,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'posts' 
              AND column_name = 'creator_id'
        ) THEN '✅ ESISTE'
        ELSE '❌ NON TROVATA'
    END as stato;

-- Verifica properties.title
SELECT 
    'properties.title' as colonna,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'title'
        ) THEN '✅ ESISTE'
        ELSE '❌ NON TROVATA'
    END as stato;

-- Verifica properties.owner_id
SELECT 
    'properties.owner_id' as colonna,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'owner_id'
        ) THEN '✅ ESISTE'
        ELSE '❌ NON TROVATA'
    END as stato;

-- Verifica properties.location_data
SELECT 
    'properties.location_data' as colonna,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'location_data'
        ) THEN '✅ ESISTE'
        ELSE '❌ NON TROVATA'
    END as stato;

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere 4 righe, TUTTE con "✅ ESISTE"
-- Se vedi "❌ NON TROVATA", esegui le query separatamente
-- ============================================



