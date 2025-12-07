-- ============================================
-- QUERY SINGOLA - Prova questa UNA ALLA VOLTA
-- ============================================

-- QUERY 1: Rimuovi se esiste e crea policy UPDATE
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ============================================
-- Se la query sopra funziona, esegui anche questa:
-- ============================================
-- DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
-- CREATE POLICY "Users can delete own properties" ON public.properties
--   FOR DELETE 
--   USING (auth.uid() = owner_id);
-- ============================================



