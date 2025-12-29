-- ============================================
-- VERIFICA STATO DEL DATABASE
-- ============================================
-- Esegui questa query per verificare lo stato attuale
-- ============================================

-- 1. Verifica che la colonna owner_id esista
SELECT 
  'Verifica colonna owner_id:' as controllo,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'owner_id'
    ) THEN '✅ La colonna owner_id ESISTE'
    ELSE '❌ La colonna owner_id NON esiste'
  END as risultato;

-- 2. Mostra tutte le colonne della tabella properties
SELECT 
  'Colonne della tabella properties:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'properties'
ORDER BY ordinal_position;

-- 3. Mostra tutte le policy esistenti
SELECT 
  'Policy esistenti:' as info,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'properties'
ORDER BY policyname;

-- ============================================
-- FINE VERIFICA
-- ============================================






