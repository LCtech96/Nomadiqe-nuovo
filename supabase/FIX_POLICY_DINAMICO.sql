-- ============================================
-- FIX POLICY RLS - VERSIONE CON SQL DINAMICO
-- ============================================
-- Usa EXECUTE per creare le policy dinamicamente
-- ============================================

-- Disabilita RLS temporaneamente
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- Crea policy per UPDATE usando SQL dinamico
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own properties" ON public.properties';
  EXECUTE 'CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)';
END $$;

-- Crea policy per DELETE usando SQL dinamico
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties';
  EXECUTE 'CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = owner_id)';
END $$;

-- Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FINE
-- ============================================

