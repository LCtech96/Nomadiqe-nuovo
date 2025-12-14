-- ============================================
-- FIX ALTERNATIVO: Properties RLS Policy per INSERT operations
-- ============================================
-- Questo script crea una soluzione alternativa se auth.uid() non funziona correttamente
-- con NextAuth. Usa una funzione SECURITY DEFINER per bypassare RLS temporaneamente
-- ============================================

-- Funzione helper per verificare se l'utente può inserire una proprietà
CREATE OR REPLACE FUNCTION public.can_insert_property(property_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica che l'utente sia autenticato
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica che owner_id corrisponda all'utente autenticato
  IF auth.uid() != property_owner_id THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Elimina la policy INSERT esistente
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;

-- Crea una nuova policy INSERT che usa la funzione helper
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT
  WITH CHECK (public.can_insert_property(owner_id));

-- Concedi l'esecuzione della funzione agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.can_insert_property(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_insert_property(UUID) TO anon;

-- ============================================
-- VERIFICA
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'properties' 
  AND schemaname = 'public'
  AND policyname = 'Users can insert own properties';

-- ============================================
-- NOTA: Se questo non funziona, il problema potrebbe essere
-- che il client Supabase non sta passando correttamente il token JWT.
-- In quel caso, potrebbe essere necessario configurare il client Supabase
-- per usare correttamente il token di NextAuth.
-- ============================================

