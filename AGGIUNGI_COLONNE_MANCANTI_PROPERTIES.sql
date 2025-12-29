-- ============================================
-- AGGIUNGI COLONNE MANCANTI ALLA TABELLA properties
-- ============================================
-- Il frontend usa "title" e "location_data" che non esistono nel database
-- Questa query aggiunge queste colonne mancanti
-- ============================================

-- PASSO 1: Aggiungi colonna "title" (alias di "name")
-- ============================================

DO $$
BEGIN
    -- Verifica se title esiste già
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'title'
    ) THEN
        -- Aggiungi la colonna title
        ALTER TABLE public.properties 
        ADD COLUMN title TEXT;
        
        RAISE NOTICE '✅ Colonna title aggiunta';
        
        -- Copia i dati da "name" a "title" se name esiste
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'name'
        ) THEN
            UPDATE public.properties 
            SET title = name 
            WHERE title IS NULL AND name IS NOT NULL;
            
            RAISE NOTICE '✅ Dati copiati da name a title';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ️ Colonna title già esistente';
    END IF;
END $$;

-- PASSO 2: Aggiungi colonna "location_data" (JSONB)
-- ============================================

DO $$
BEGIN
    -- Verifica se location_data esiste già
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'location_data'
    ) THEN
        -- Aggiungi la colonna location_data come JSONB
        ALTER TABLE public.properties 
        ADD COLUMN location_data JSONB DEFAULT '{}';
        
        RAISE NOTICE '✅ Colonna location_data aggiunta';
        
        -- Popola location_data con i dati esistenti dalle colonne separate
        UPDATE public.properties 
        SET location_data = jsonb_build_object(
            'property_type', property_type::text,
            'address', address,
            'city', city,
            'country', country,
            'latitude', latitude,
            'longitude', longitude,
            'price_per_night', price_per_night,
            'max_guests', max_guests,
            'bedrooms', bedrooms,
            'bathrooms', bathrooms
        )
        WHERE location_data IS NULL OR location_data = '{}';
        
        RAISE NOTICE '✅ location_data popolato con dati esistenti';
    ELSE
        RAISE NOTICE 'ℹ️ Colonna location_data già esistente';
    END IF;
END $$;

-- PASSO 3: Verifica il risultato
-- ============================================

SELECT 
    'VERIFICA COLONNE' as tipo_verifica,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'title'
        ) THEN '✅ title ESISTE'
        ELSE '❌ title NON ESISTE'
    END as title_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'location_data'
        ) THEN '✅ location_data ESISTE'
        ELSE '❌ location_data NON ESISTE'
    END as location_data_status;

-- Mostra tutte le colonne di properties
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties'
  AND column_name IN ('title', 'location_data', 'name', 'owner_id')
ORDER BY column_name;

-- PASSO 4: Aggiorna cache PostgREST
-- ============================================

NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere:
-- ✅ title ESISTE
-- ✅ location_data ESISTE
-- Una lista che mostra title, location_data, name, owner_id
-- ============================================






