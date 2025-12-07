-- ============================================
-- FIX POLICY RLS - CREA UNA ALLA VOLTA
-- ============================================
-- IMPORTANTE: Esegui queste query UNA ALLA VOLTA, non tutte insieme
-- ============================================

-- QUERY 1: Crea policy per UPDATE (esegui questa prima)
CREATE POLICY IF NOT EXISTS "Users can update own properties" ON public.properties
  FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- QUERY 2: Crea policy per DELETE (esegui questa dopo)
CREATE POLICY IF NOT EXISTS "Users can delete own properties" ON public.properties
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- ============================================
-- NOTA: Se "IF NOT EXISTS" non funziona, usa:
-- ============================================
-- DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
-- CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
-- ============================================



