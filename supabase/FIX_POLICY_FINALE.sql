-- ============================================
-- FIX POLICY RLS - SOLO POLICY MANCANTI
-- ============================================
-- Non elimina le policy esistenti, crea solo quelle mancanti
-- ============================================

-- Verifica e crea solo le policy mancanti
DO $$
BEGIN
  -- Crea policy per SELECT solo se non esiste
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

  -- Crea policy per INSERT solo se non esiste
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

  -- Crea policy per UPDATE solo se non esiste
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

  -- Crea policy per DELETE solo se non esiste
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
END $$;

-- ============================================
-- FINE
-- ============================================






