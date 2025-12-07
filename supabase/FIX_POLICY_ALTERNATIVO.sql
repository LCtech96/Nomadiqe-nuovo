-- ============================================
-- FIX POLICY RLS - APPROCCIO ALTERNATIVO
-- ============================================
-- Se le policy già esistono, questa query non farà nulla
-- Se non esistono, le creerà usando un approccio diverso
-- ============================================

-- Verifica e mostra lo stato attuale
SELECT 
  'Policy esistenti:' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'properties'
ORDER BY policyname;

-- Se le policy UPDATE e DELETE non esistono, prova questo approccio:
-- Disabilita RLS
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- Prova a creare la policy UPDATE usando una query SQL statica
-- (esegui questa query da sola, non insieme alle altre)
/*
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE 
  USING ((SELECT auth.uid()) = owner_id)
  WITH CHECK ((SELECT auth.uid()) = owner_id);
*/

-- Prova a creare la policy DELETE usando una query SQL statica
-- (esegui questa query da sola, non insieme alle altre)
/*
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE 
  USING ((SELECT auth.uid()) = owner_id);
*/

-- Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTA: Se le policy già esistono, non serve fare nulla!
-- ============================================



