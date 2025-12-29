-- ============================================
-- FIX POLICY RLS - CON EXECUTE E QUOTING CORRETTO
-- ============================================
-- Usa EXECUTE con formato corretto per evitare problemi di contesto
-- ============================================

-- Disabilita RLS temporaneamente
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- Crea policy per UPDATE usando EXECUTE con formato SQL corretto
DO $$
BEGIN
  -- Rimuovi policy esistente se presente
  PERFORM * FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'properties' 
  AND policyname = 'Users can update own properties';
  
  IF FOUND THEN
    EXECUTE format('DROP POLICY %I ON %I.%I', 
      'Users can update own properties', 
      'public', 
      'properties');
  END IF;
  
  -- Crea la policy usando format per evitare problemi di quoting
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)',
    'Users can update own properties',
    'public',
    'properties');
    
  RAISE NOTICE 'Policy UPDATE creata con successo';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Errore creando policy UPDATE: %', SQLERRM;
END $$;

-- Crea policy per DELETE usando EXECUTE con formato SQL corretto
DO $$
BEGIN
  -- Rimuovi policy esistente se presente
  PERFORM * FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'properties' 
  AND policyname = 'Users can delete own properties';
  
  IF FOUND THEN
    EXECUTE format('DROP POLICY %I ON %I.%I', 
      'Users can delete own properties', 
      'public', 
      'properties');
  END IF;
  
  -- Crea la policy usando format
  EXECUTE format('CREATE POLICY %I ON %I.%I FOR DELETE USING (auth.uid() = owner_id)',
    'Users can delete own properties',
    'public',
    'properties');
    
  RAISE NOTICE 'Policy DELETE creata con successo';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Errore creando policy DELETE: %', SQLERRM;
END $$;

-- Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FINE
-- ============================================






