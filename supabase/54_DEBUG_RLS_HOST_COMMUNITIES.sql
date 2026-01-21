-- ============================================
-- DEBUG E FIX DEFINITIVO RLS HOST_COMMUNITIES
-- ============================================
-- Verifica e fixa tutti i problemi RLS per la creazione di communities
-- ============================================

-- 1. Verifica che RLS sia abilitato
ALTER TABLE public.host_communities ENABLE ROW LEVEL SECURITY;

-- 2. Rimuovi tutte le policies INSERT esistenti (incluso varianti di nome)
DROP POLICY IF EXISTS "Hosts can create communities" ON public.host_communities;
DROP POLICY IF EXISTS "hosts_can_create_communities" ON public.host_communities;
DROP POLICY IF EXISTS "Allow hosts to create communities" ON public.host_communities;

-- 3. Verifica che la funzione helper esista, altrimenti creala
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

-- 4. Verifica che la tabella profiles sia accessibile per la verifica del ruolo
-- Assicurati che ci sia una policy per SELECT su profiles per gli utenti autenticati
-- Questo è CRITICO perché la policy INSERT su host_communities deve verificare il ruolo
DO $$
BEGIN
  -- Verifica se esiste una policy SELECT per profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND cmd = 'SELECT'
  ) THEN
    -- Crea una policy per permettere agli utenti autenticati di vedere i profili
    -- Necessaria per la verifica del ruolo nella policy INSERT di host_communities
    CREATE POLICY "Authenticated users can view profiles for role checks"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (true);
    
    RAISE NOTICE 'Policy SELECT creata per profiles (necessaria per verifica ruolo)';
  ELSE
    RAISE NOTICE 'Policy SELECT già esistente per profiles';
  END IF;
END $$;

-- 5. Crea la policy INSERT con un approccio più diretto
-- Usa un controllo diretto invece di EXISTS per evitare problemi RLS
CREATE POLICY "Hosts can create communities"
  ON public.host_communities FOR INSERT
  WITH CHECK (
    -- Verifica base: utente autenticato e created_by corrisponde
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by
    -- Usa la funzione SECURITY DEFINER per bypassare RLS
    AND public.can_create_community(auth.uid()) = true
  );

-- 6. Verifica anche i grants sulla tabella
GRANT INSERT ON public.host_communities TO authenticated;
GRANT SELECT ON public.host_communities TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- 7. Verifica che la policy sia stata creata
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'host_communities'
    AND cmd = 'INSERT';
  
  IF policy_count = 0 THEN
    RAISE EXCEPTION 'Nessuna policy INSERT trovata per host_communities!';
  ELSIF policy_count > 1 THEN
    RAISE WARNING 'Trovate % policies INSERT per host_communities. Potrebbe causare conflitti.', policy_count;
  ELSE
    RAISE NOTICE 'Policy INSERT creata correttamente per host_communities';
  END IF;
END $$;

-- 8. Verifica finale della policy
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
