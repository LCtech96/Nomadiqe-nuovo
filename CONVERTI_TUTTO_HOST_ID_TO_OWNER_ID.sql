-- ============================================
-- CONVERTI TUTTO DA host_id A owner_id
-- ============================================
-- Questa query trova e converte TUTTE le dipendenze di host_id in owner_id
-- Prima di eliminare la colonna host_id
-- ============================================

-- PASSO 1: Trova e aggiorna tutte le RLS policies che usano host_id
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
    policy_sql TEXT;
BEGIN
    -- Trova tutte le policy che contengono "host_id" nella loro definizione
    FOR policy_record IN
        SELECT 
            schemaname,
            tablename,
            policyname,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
              qual LIKE '%host_id%' 
              OR with_check LIKE '%host_id%'
              OR qual LIKE '%properties.host_id%'
              OR with_check LIKE '%properties.host_id%'
          )
    LOOP
        RAISE NOTICE 'Trovata policy che usa host_id: %.%.%', 
            policy_record.schemaname, 
            policy_record.tablename, 
            policy_record.policyname;
        
        -- Elimina la policy vecchia
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
        
        RAISE NOTICE 'Policy eliminata: %', policy_record.policyname;
    END LOOP;
END $$;

-- PASSO 2: Aggiorna specificamente la policy su bookings che causa l'errore
-- ============================================

-- Elimina la policy problematica su bookings
DROP POLICY IF EXISTS "Bookings are viewable by traveler and host" ON public.bookings;

-- Ricreala usando owner_id invece di host_id
-- (Se la policy deve permettere a host e traveler di vedere le prenotazioni)
CREATE POLICY "Bookings are viewable by traveler and host" ON public.bookings
  FOR SELECT 
  USING (
    auth.uid() = traveler_id 
    OR 
    auth.uid() IN (
      SELECT owner_id 
      FROM public.properties 
      WHERE id = property_id
    )
  );

-- PASSO 3: Aggiorna tutte le altre policy su bookings se necessario
-- ============================================

-- Verifica e aggiorna altre policy su bookings se usano host_id
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'bookings'
          AND (
              qual LIKE '%host_id%' 
              OR with_check LIKE '%host_id%'
          )
    LOOP
        RAISE NOTICE 'Aggiornando policy bookings: %', policy_record.policyname;
        
        -- Elimina la policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', policy_record.policyname);
    END LOOP;
END $$;

-- PASSO 4: Aggiorna indici che usano host_id
-- ============================================

-- Elimina index su host_id se esiste
DROP INDEX IF EXISTS idx_properties_host;

-- Crea nuovo index su owner_id
CREATE INDEX IF NOT EXISTS idx_properties_owner ON public.properties(owner_id);

-- PASSO 5: Aggiorna foreign key constraints
-- ============================================

-- Elimina foreign key constraint su host_id se esiste
ALTER TABLE public.properties 
DROP CONSTRAINT IF EXISTS properties_host_id_fkey;

-- Verifica che owner_id abbia già la foreign key (dovrebbe esistere già)
-- Se non esiste, creala
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
          AND table_name = 'properties' 
          AND constraint_name = 'properties_owner_id_fkey'
    ) THEN
        ALTER TABLE public.properties
        ADD CONSTRAINT properties_owner_id_fkey 
        FOREIGN KEY (owner_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint creata per owner_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint per owner_id già esistente';
    END IF;
END $$;

-- PASSO 6: Aggiorna RLS policies per properties (se non già fatto)
-- ============================================

-- Disabilita RLS temporaneamente
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- Elimina tutte le policy esistenti su properties
DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Public properties are viewable by everyone" ON public.properties;

-- Crea policy per SELECT
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT USING (true);

-- Crea policy per INSERT usando owner_id
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Crea policy per UPDATE usando owner_id
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Crea policy per DELETE usando owner_id
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE USING (auth.uid() = owner_id);

-- Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- PASSO 7: Ora puoi eliminare host_id in sicurezza
-- ============================================

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
        RAISE NOTICE '✅ owner_id esiste. Eliminazione host_id...';
        
        -- Se host_id esiste ancora, eliminalo
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'host_id'
        ) THEN
            -- Elimina la colonna host_id (ora non ci sono più dipendenze)
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

-- PASSO 8: Verifica il risultato
-- ============================================

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

-- Verifica le policy su bookings
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'bookings'
ORDER BY policyname;

-- Verifica le policy su properties
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'properties'
ORDER BY policyname;

-- PASSO 9: Aggiorna cache PostgREST
-- ============================================

NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere:
-- - "✅ owner_id ESISTE"
-- - "✅ host_id ELIMINATO"
-- - Una lista di colonne che mostra owner_id ma NON host_id
-- - Policy su bookings che usano owner_id invece di host_id
-- - Policy su properties che usano owner_id
-- ============================================





