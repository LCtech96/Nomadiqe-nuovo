-- ============================================
-- FIX POLICY RLS - CON VERIFICA DELLA COLONNA
-- ============================================
-- Prima verifica che la colonna esista, poi crea le policy
-- ============================================

-- Verifica che owner_id esista prima di procedere
DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  -- Verifica se la colonna esiste
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'owner_id'
  ) INTO col_exists;
  
  IF NOT col_exists THEN
    RAISE EXCEPTION 'La colonna owner_id non esiste nella tabella properties!';
  END IF;
  
  RAISE NOTICE 'La colonna owner_id esiste. Procedendo con la creazione delle policy...';
END $$;

-- Disabilita RLS temporaneamente
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- Crea policy per UPDATE usando SQL dinamico
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own properties" ON public.properties';
  EXECUTE 'CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)';
  RAISE NOTICE 'Policy UPDATE creata con successo';
END $$;

-- Crea policy per DELETE usando SQL dinamico
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties';
  EXECUTE 'CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = owner_id)';
  RAISE NOTICE 'Policy DELETE creata con successo';
END $$;

-- Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Verifica che le policy siano state create
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'properties'
ORDER BY policyname;

-- ============================================
-- FINE
-- ============================================



