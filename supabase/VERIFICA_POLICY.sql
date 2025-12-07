-- ============================================
-- VERIFICA STATO DELLE POLICY
-- ============================================

-- Verifica che la colonna owner_id esista
SELECT 
  'Colonna owner_id esiste:' as info,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'owner_id'
  ) as owner_id_exists;

-- Mostra tutte le policy esistenti
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'properties'
ORDER BY policyname;

-- ============================================
-- Se le policy UPDATE e DELETE non esistono, 
-- usa la query FIX_POLICY_DINAMICO.sql
-- ============================================



