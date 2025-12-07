-- ============================================
-- FORZA REFRESH CACHE POSTGREST - VERSIONE AGGIUNTIVA
-- ============================================
-- Questo script forza PostgREST ad aggiornare la cache dello schema
-- in modo più aggressivo
-- ============================================

-- Metodo 1: Notifica standard
NOTIFY pgrst, 'reload schema';

-- Metodo 2: Usando pg_notify
SELECT pg_notify('pgrst', 'reload schema');

-- Metodo 3: Verifica che le colonne esistano (questo forza PostgREST a ricaricare)
DO $$
BEGIN
    -- Verifica che posts.creator_id esista
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'posts' 
          AND column_name = 'creator_id'
    ) THEN
        RAISE NOTICE '✅ posts.creator_id ESISTE';
    ELSE
        RAISE EXCEPTION '❌ posts.creator_id NON ESISTE!';
    END IF;

    -- Verifica che properties.title esista
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'title'
    ) THEN
        RAISE NOTICE '✅ properties.title ESISTE';
    ELSE
        RAISE EXCEPTION '❌ properties.title NON ESISTE!';
    END IF;

    -- Verifica che properties.owner_id esista
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'owner_id'
    ) THEN
        RAISE NOTICE '✅ properties.owner_id ESISTE';
    ELSE
        RAISE EXCEPTION '❌ properties.owner_id NON ESISTE!';
    END IF;

    -- Verifica che properties.location_data esista
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'location_data'
    ) THEN
        RAISE NOTICE '✅ properties.location_data ESISTE';
    ELSE
        RAISE EXCEPTION '❌ properties.location_data NON ESISTE!';
    END IF;
END $$;

-- Query finale per verificare tutte le colonne
SELECT 
    'posts' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'posts'
  AND column_name = 'creator_id'

UNION ALL

SELECT 
    'properties' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties'
  AND column_name IN ('title', 'owner_id', 'location_data');

-- ============================================
-- IMPORTANTE:
-- ============================================
-- Dopo aver eseguito questo script:
-- 1. Aspetta 1-2 minuti
-- 2. Se gli errori persistono, riavvia il progetto Supabase
-- 3. Ricarica la pagina nel browser (Ctrl+Shift+R)
-- ============================================

