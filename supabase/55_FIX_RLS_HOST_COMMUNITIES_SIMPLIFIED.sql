-- ============================================
-- FIX RLS HOST_COMMUNITIES - APPROCCIO SEMPLIFICATO
-- ============================================
-- Questo script crea una policy più semplice che non dipende
-- dalla verifica del ruolo tramite la tabella profiles
-- ============================================

-- 1. Rimuovi tutte le policies INSERT esistenti
DROP POLICY IF EXISTS "Hosts can create communities" ON public.host_communities;
DROP POLICY IF EXISTS "hosts_can_create_communities" ON public.host_communities;
DROP POLICY IF EXISTS "Allow hosts to create communities" ON public.host_communities;
DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.host_communities;

-- 2. Crea una policy più permissiva per test
-- Permette a qualsiasi utente autenticato di creare una community
-- purché created_by corrisponda a auth.uid()
-- NOTA: Possiamo restringere questo dopo aver verificato che funziona
CREATE POLICY "Authenticated users can create communities"
  ON public.host_communities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by
  );

-- 3. Verifica che RLS sia abilitato
ALTER TABLE public.host_communities ENABLE ROW LEVEL SECURITY;

-- 4. Verifica i grants
GRANT INSERT ON public.host_communities TO authenticated;
GRANT SELECT ON public.host_communities TO authenticated;

-- 5. Mostra la policy creata
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'host_communities'
  AND cmd = 'INSERT';
