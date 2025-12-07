-- ============================================
-- VERIFICA COLONNE E REFRESH CACHE POSTGREST
-- ============================================
-- Script semplice e pulito per verificare le colonne e forzare il refresh
-- ============================================

-- 1. Notifica PostgREST di ricaricare lo schema
NOTIFY pgrst, 'reload schema';

-- 2. Usa pg_notify per un refresh più aggressivo
SELECT pg_notify('pgrst', 'reload schema');

-- 3. Verifica che le colonne esistano (solo lettura, nessun errore)
SELECT 
    'posts' as table_name,
    'creator_id' as column_name,
    'UUID' as data_type
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'posts' 
      AND column_name = 'creator_id'
)

UNION ALL

SELECT 
    'properties' as table_name,
    'title' as column_name,
    'TEXT' as data_type
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'title'
)

UNION ALL

SELECT 
    'properties' as table_name,
    'owner_id' as column_name,
    'UUID' as data_type
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'owner_id'
)

UNION ALL

SELECT 
    'properties' as table_name,
    'location_data' as column_name,
    'JSONB' as data_type
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'location_data'
);

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere 4 righe (una per ogni colonna verificata)
-- Se vedi 4 righe, significa che TUTTE le colonne esistono!
-- ============================================

