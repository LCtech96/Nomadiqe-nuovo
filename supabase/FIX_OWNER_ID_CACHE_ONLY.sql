-- ============================================
-- FIX SOLO CACHE - owner_id GIÀ ESISTE
-- ============================================
-- La colonna owner_id ESISTE già nel database
-- Il problema è solo la cache di PostgREST che non la riconosce
-- ============================================

-- 1. Verifica che owner_id esista (solo per conferma)
SELECT 
    'VERIFICA: Colonna owner_id' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'owner_id'
        ) THEN '✅ ESISTE'
        ELSE '❌ NON ESISTE'
    END as risultato;

-- 2. Mostra i dettagli della colonna
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties' 
  AND column_name = 'owner_id';

-- 3. FORZA IL REFRESH DELLA CACHE DI POSTGREST
-- Questo è il passaggio più importante!
NOTIFY pgrst, 'reload schema';

-- 4. Usa anche pg_notify per un refresh più aggressivo
SELECT pg_notify('pgrst', 'reload schema');

-- 5. Attendi qualche secondo (opzionale, ma consigliato)
SELECT pg_sleep(2);

-- 6. Notifica di nuovo per essere sicuri
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- DOPO QUESTA QUERY:
-- ============================================
-- 1. Attendi 10-30 secondi
-- 2. Ricarica la pagina dell'app (hard refresh: Ctrl+Shift+R)
-- 3. Riprova a creare la proprietà
-- ============================================

RAISE NOTICE 'Cache di PostgREST aggiornata! Attendi 10-30 secondi prima di riprovare.';





