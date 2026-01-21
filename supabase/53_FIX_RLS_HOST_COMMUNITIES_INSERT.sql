-- ============================================
-- FIX RLS POLICY PER CREAZIONE COMMUNITY
-- ============================================
-- Risolve l'errore "new row violates row-level security policy"
-- quando gli host cercano di creare una community
-- ============================================

-- Rimuovi tutte le policies INSERT esistenti per essere sicuri
DROP POLICY IF EXISTS "Hosts can create communities" ON public.host_communities;
DROP POLICY IF EXISTS "hosts_can_create_communities" ON public.host_communities;

-- Crea funzione helper per verificare se l'utente può creare communities
-- Usa SECURITY DEFINER per bypassare RLS nella verifica
CREATE OR REPLACE FUNCTION public.can_create_community(user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verifica che l'utente esista e abbia un ruolo valido (host o jolly)
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id_param
      AND role IN ('host', 'jolly')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ricrea la policy per INSERT con controlli appropriati
-- Usa la funzione helper per evitare problemi RLS nella verifica del ruolo
CREATE POLICY "Hosts can create communities"
  ON public.host_communities FOR INSERT
  WITH CHECK (
    -- Verifica che l'utente sia autenticato
    auth.uid() IS NOT NULL
    -- Verifica che created_by corrisponda all'utente autenticato
    AND auth.uid() = created_by
    -- Usa la funzione SECURITY DEFINER per verificare il ruolo (bypassa RLS)
    AND public.can_create_community(auth.uid())
  );

-- Verifica che RLS sia abilitato
ALTER TABLE public.host_communities ENABLE ROW LEVEL SECURITY;

-- Verifica che le policies esistano
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'host_communities'
      AND policyname = 'Hosts can create communities'
  ) THEN
    RAISE EXCEPTION 'Policy "Hosts can create communities" non è stata creata!';
  END IF;
  
  RAISE NOTICE 'Policy "Hosts can create communities" creata con successo!';
END $$;

-- Commenti per documentazione
COMMENT ON POLICY "Hosts can create communities" ON public.host_communities IS 
'Permette agli host e jolly autenticati di creare nuove communities. Verifica che l''utente sia autenticato, che created_by corrisponda all''utente corrente, e che l''utente abbia il ruolo ''host'' o ''jolly''.';

COMMENT ON FUNCTION public.can_create_community IS 
'Verifica se un utente può creare communities (ruolo host o jolly). Usa SECURITY DEFINER per bypassare RLS.';
