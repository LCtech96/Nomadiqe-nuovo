-- ============================================
-- FIX POLICY RLS - VERSIONE DIRETTA
-- ============================================
-- IMPORTANTE: Le policy devono essere create DIRETTAMENTE, non dentro blocchi DO
-- ============================================

-- Rimuovi solo le policy che vogliamo sostituire/creare
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- Crea policy per SELECT (se non esiste già, fallirà silenziosamente se esiste)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'properties' 
    AND policyname = 'Properties are viewable by everyone'
  ) THEN
    CREATE POLICY "Properties are viewable by everyone" ON public.properties
      FOR SELECT 
      USING (true);
  END IF;
END $$;

-- Crea policy per INSERT (se non esiste già)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'properties' 
    AND policyname = 'Users can insert own properties'
  ) THEN
    CREATE POLICY "Users can insert own properties" ON public.properties
      FOR INSERT 
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- Crea policy per UPDATE - DIRETTAMENTE (non dentro DO per evitare problemi)
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Crea policy per DELETE - DIRETTAMENTE
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- ============================================
-- FINE
-- ============================================



