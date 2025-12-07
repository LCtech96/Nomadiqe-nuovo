-- ============================================
-- FIX POLICY RLS - VERSIONE SENZA CONFLITTI
-- ============================================
-- Questa versione crea solo le policy mancanti
-- ============================================

-- Prima verifica e rimuovi solo le policy che vogliamo sostituire
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- Verifica che la colonna owner_id esista prima di creare le policy
DO $$
BEGIN
  -- Verifica che owner_id esista
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'owner_id'
  ) THEN
    -- Crea policy per UPDATE solo se non esiste già
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'properties' 
      AND policyname = 'Users can update own properties'
    ) THEN
      CREATE POLICY "Users can update own properties" ON public.properties
        FOR UPDATE 
        USING (auth.uid() = owner_id)
        WITH CHECK (auth.uid() = owner_id);
    END IF;
    
    -- Crea policy per DELETE solo se non esiste già
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'properties' 
      AND policyname = 'Users can delete own properties'
    ) THEN
      CREATE POLICY "Users can delete own properties" ON public.properties
        FOR DELETE 
        USING (auth.uid() = owner_id);
    END IF;
  ELSE
    RAISE EXCEPTION 'La colonna owner_id non esiste nella tabella properties';
  END IF;
END $$;

-- ============================================
-- FINE
-- ============================================

