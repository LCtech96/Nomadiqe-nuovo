-- ============================================
-- FIX POLICY RLS - VERSIONE CORRETTA
-- ============================================
-- Questa versione verifica quale colonna esiste e usa quella corretta
-- ============================================

-- PASSO 1: Disabilita RLS
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Elimina TUTTE le policy esistenti
DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- PASSO 3: Verifica quale colonna esiste e crea le policy corrette
DO $$
DECLARE
  owner_id_exists BOOLEAN;
  host_id_exists BOOLEAN;
  col_name TEXT;
BEGIN
  -- Verifica se esiste owner_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'owner_id'
  ) INTO owner_id_exists;
  
  -- Verifica se esiste host_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'host_id'
  ) INTO host_id_exists;
  
  -- Determina quale colonna usare
  IF owner_id_exists THEN
    col_name := 'owner_id';
    RAISE NOTICE 'Usando colonna: owner_id';
  ELSIF host_id_exists THEN
    col_name := 'host_id';
    RAISE NOTICE 'Usando colonna: host_id';
  ELSE
    RAISE EXCEPTION 'Né owner_id né host_id esistono nella tabella properties!';
  END IF;
  
  -- Crea policy per SELECT
  EXECUTE format('CREATE POLICY "Properties are viewable by everyone" ON public.properties FOR SELECT USING (true)');
  
  -- Crea policy per INSERT
  EXECUTE format('CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = %I)', col_name);
  
  -- Crea policy per UPDATE
  EXECUTE format('CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = %I) WITH CHECK (auth.uid() = %I)', col_name, col_name);
  
  -- Crea policy per DELETE
  EXECUTE format('CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = %I)', col_name);
  
  RAISE NOTICE 'Tutte le policy sono state create con successo usando la colonna: %', col_name;
END $$;

-- PASSO 4: Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FINE
-- ============================================



