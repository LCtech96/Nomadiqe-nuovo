-- ============================================
-- VERIFICA E FIX COLONNA owner_id IN properties
-- ============================================
-- Questo script verifica se la colonna owner_id esiste
-- e aggiorna la cache di PostgREST per risolvere l'errore
-- "Could not find the 'owner_id' column of 'properties' in the schema cache"
-- ============================================

-- 1. Verifica se la colonna owner_id esiste già
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'owner_id'
    ) THEN
        -- Se non esiste, creala
        RAISE NOTICE 'Colonna owner_id non trovata. Creazione in corso...';
        
        ALTER TABLE public.properties 
        ADD COLUMN owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        -- Se esiste host_id, copia i dati
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'host_id'
        ) THEN
            RAISE NOTICE 'Trovata colonna host_id. Copia dei dati in corso...';
            UPDATE public.properties 
            SET owner_id = host_id 
            WHERE owner_id IS NULL;
        END IF;
        
        RAISE NOTICE 'Colonna owner_id creata con successo!';
    ELSE
        RAISE NOTICE 'Colonna owner_id già esistente.';
    END IF;
END $$;

-- 2. Verifica che la colonna sia presente (solo per conferma)
SELECT 
    'properties' as table_name,
    'owner_id' as column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties' 
  AND column_name = 'owner_id';

-- 3. Forza il refresh della cache di PostgREST
NOTIFY pgrst, 'reload schema';

-- 4. Usa anche pg_notify per essere sicuri
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere un messaggio che dice:
-- - "Colonna owner_id già esistente." OPPURE
-- - "Colonna owner_id creata con successo!"
-- 
-- E poi una riga con i dettagli della colonna owner_id
-- ============================================



