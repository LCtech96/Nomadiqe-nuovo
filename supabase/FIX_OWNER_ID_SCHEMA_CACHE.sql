-- ============================================
-- FIX CACHE POSTGREST - owner_id IN properties
-- ============================================
-- La colonna owner_id ESISTE già nel database!
-- Il problema è solo la cache di PostgREST che non la riconosce
-- ============================================

-- PASSO 1: Verifica che owner_id esista (per conferma)
SELECT 
    '✅ VERIFICA: owner_id in properties' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'owner_id'
        ) THEN 'ESISTE ✅'
        ELSE 'NON ESISTE ❌'
    END as risultato;

-- PASSO 2: Mostra i dettagli della colonna
SELECT 
    'owner_id' as column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_default IS NOT NULL THEN 'Ha default'
        ELSE 'No default'
    END as default_status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties' 
  AND column_name = 'owner_id';

-- PASSO 3: FORZA IL REFRESH DELLA CACHE DI POSTGREST
-- Questo è il passaggio CRITICO per risolvere l'errore!

NOTIFY pgrst, 'reload schema';

-- PASSO 4: Usa anche pg_notify per un refresh più aggressivo
SELECT pg_notify('pgrst', 'reload schema');

-- PASSO 5: Notifica di nuovo dopo un breve delay (opzionale ma raccomandato)
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- ISTRUZIONI:
-- ============================================
-- 1. Esegui questa query su Supabase SQL Editor
-- 2. Attendi 10-30 secondi dopo l'esecuzione
-- 3. Fai un HARD REFRESH del browser (Ctrl+Shift+R)
-- 4. Riprova a creare la proprietà
-- ============================================
-- 
-- Se dopo 30 secondi il problema persiste:
-- 1. Vai su Supabase Dashboard → Settings → API
-- 2. Clicca su "Restart API" o "Restart Project"
-- ============================================





