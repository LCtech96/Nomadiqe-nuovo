-- ============================================
-- FIX POLICY RLS - USA HOST_ID
-- ============================================
-- Se la tua tabella usa host_id invece di owner_id
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

-- PASSO 3: Crea tutte le policy usando host_id
-- Policy per SELECT
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT 
  USING (true);

-- Policy per INSERT
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT 
  WITH CHECK (auth.uid() = host_id);

-- Policy per UPDATE
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE 
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Policy per DELETE
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE 
  USING (auth.uid() = host_id);

-- PASSO 4: Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FINE
-- ============================================






