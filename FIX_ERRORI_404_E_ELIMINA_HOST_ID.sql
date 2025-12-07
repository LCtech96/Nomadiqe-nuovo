-- ============================================
-- ELIMINA COLONNA host_id (SE owner_id ESISTE GIÀ)
-- ============================================
-- Questa query elimina host_id se owner_id esiste già
-- ============================================

-- Verifica e elimina host_id se owner_id esiste
DO $$
BEGIN
    -- Verifica che owner_id esista
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'owner_id'
    ) THEN
        RAISE NOTICE '✅ owner_id esiste. Procedendo con eliminazione host_id...';
        
        -- Se anche host_id esiste, eliminalo
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'host_id'
        ) THEN
            RAISE NOTICE 'Trovata colonna host_id. Eliminazione in corso...';
            
            -- Elimina foreign key constraint su host_id se esiste
            ALTER TABLE public.properties 
            DROP CONSTRAINT IF EXISTS properties_host_id_fkey;
            
            -- Elimina index su host_id se esiste
            DROP INDEX IF EXISTS idx_properties_host;
            
            -- Elimina la colonna host_id
            ALTER TABLE public.properties 
            DROP COLUMN IF EXISTS host_id;
            
            RAISE NOTICE '✅ Colonna host_id eliminata con successo!';
        ELSE
            RAISE NOTICE 'ℹ️ Colonna host_id non esiste (già eliminata).';
        END IF;
    ELSE
        RAISE EXCEPTION '❌ ERRORE: owner_id non esiste! Non eliminare host_id.';
    END IF;
END $$;

-- Verifica il risultato
SELECT 
    'VERIFICA COLONNE: properties' as status,
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
        ) THEN '⚠️ host_id ANCORA ESISTE'
        ELSE '✅ host_id ELIMINATO'
    END as host_id_status;

-- Mostra tutte le colonne della tabella properties
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties'
ORDER BY ordinal_position;

-- Aggiorna cache PostgREST
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere:
-- - "✅ owner_id esiste. Procedendo con eliminazione host_id..."
-- - "✅ Colonna host_id eliminata con successo!"
-- - Una lista di colonne che mostra owner_id ma NON host_id
-- ============================================

