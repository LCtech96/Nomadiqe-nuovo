-- ============================================
-- AGGIORNA RLS POLICIES PER USARE SOLO owner_id
-- ============================================
-- Questa query aggiorna le RLS policies per usare owner_id
-- ============================================

-- PASSO 1: Disabilita RLS temporaneamente
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Elimina TUTTE le policy esistenti
DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Public properties are viewable by everyone" ON public.properties;

-- PASSO 3: Crea policy per SELECT (tutti possono vedere)
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT 
  USING (true);

-- PASSO 4: Crea policy per INSERT usando owner_id
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- PASSO 5: Crea policy per UPDATE usando owner_id
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- PASSO 6: Crea policy per DELETE usando owner_id
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- PASSO 7: Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- PASSO 8: Verifica le policy create
SELECT 
    policyname as policy_name,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'properties'
ORDER BY policyname;

-- PASSO 9: Aggiorna cache PostgREST
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Dovresti vedere 4 policy:
-- 1. "Properties are viewable by everyone" (SELECT)
-- 2. "Users can insert own properties" (INSERT)
-- 3. "Users can update own properties" (UPDATE)
-- 4. "Users can delete own properties" (DELETE)
-- ============================================




