-- ============================================
-- PARTE 1: SOLO FIX DELLE POLICY RLS
-- ============================================
-- Esegui questa query PRIMA per sistemare le policy RLS
-- ============================================

-- Rimuovi tutte le policy esistenti
DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- Crea policy per SELECT (tutti possono vedere)
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT 
  USING (true);

-- Crea policy per INSERT (usa owner_id - la colonna ESISTE nel database)
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- Crea policy per UPDATE
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Crea policy per DELETE
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- ============================================
-- FINE PARTE 1
-- ============================================




