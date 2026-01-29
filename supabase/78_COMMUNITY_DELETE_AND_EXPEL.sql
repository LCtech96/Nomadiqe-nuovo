-- ============================================
-- Funzioni per eliminare community e espellere utenti
-- ============================================
-- 1. Eliminare community (solo per il creatore)
-- 2. Espellere utenti dalla community (solo per admin)
-- ============================================

-- ============================================
-- FUNZIONE: Elimina community
-- ============================================
-- Solo il creatore può eliminare la community.
-- Elimina anche tutti i membri, messaggi e inviti associati (CASCADE).
CREATE OR REPLACE FUNCTION public.delete_community(community_id_param UUID)
RETURNS void AS $$
DECLARE
  current_user_id UUID;
  community_creator UUID;
BEGIN
  -- Ottieni l'ID dell'utente corrente
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;
  
  -- Verifica che la community esista e che l'utente sia il creatore
  SELECT created_by INTO community_creator
  FROM public.host_communities
  WHERE id = community_id_param;
  
  IF community_creator IS NULL THEN
    RAISE EXCEPTION 'Community non trovata';
  END IF;
  
  IF community_creator != current_user_id THEN
    RAISE EXCEPTION 'Solo il creatore della community può eliminarla';
  END IF;
  
  -- Elimina la community (CASCADE elimina automaticamente membri, messaggi e inviti)
  DELETE FROM public.host_communities
  WHERE id = community_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Commento per documentazione
COMMENT ON FUNCTION public.delete_community(UUID) IS 'Elimina una community. Solo il creatore può eseguire questa operazione.';

-- ============================================
-- FUNZIONE: Espelli utente dalla community
-- ============================================
-- Solo gli admin possono espellere utenti.
-- Non può espellere se stesso o altri admin.
CREATE OR REPLACE FUNCTION public.expel_community_member(
  community_id_param UUID,
  member_host_id_param UUID
)
RETURNS void AS $$
DECLARE
  current_user_id UUID;
  is_current_user_admin BOOLEAN;
  member_role TEXT;
BEGIN
  -- Ottieni l'ID dell'utente corrente
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;
  
  -- Verifica che l'utente corrente sia admin della community
  SELECT EXISTS (
    SELECT 1 FROM public.host_community_members
    WHERE community_id = community_id_param
      AND host_id = current_user_id
      AND role = 'admin'
      AND status = 'accepted'
  ) INTO is_current_user_admin;
  
  IF NOT is_current_user_admin THEN
    RAISE EXCEPTION 'Solo gli admin possono espellere utenti';
  END IF;
  
  -- Verifica che il membro da espellere esista
  SELECT role INTO member_role
  FROM public.host_community_members
  WHERE community_id = community_id_param
    AND host_id = member_host_id_param
    AND status = 'accepted';
  
  IF member_role IS NULL THEN
    RAISE EXCEPTION 'Membro non trovato nella community';
  END IF;
  
  -- Non può espellere se stesso
  IF member_host_id_param = current_user_id THEN
    RAISE EXCEPTION 'Non puoi espellere te stesso';
  END IF;
  
  -- Non può espellere altri admin (opzionale, ma meglio essere espliciti)
  IF member_role = 'admin' THEN
    RAISE EXCEPTION 'Non puoi espellere altri admin';
  END IF;
  
  -- Rimuovi il membro dalla community
  DELETE FROM public.host_community_members
  WHERE community_id = community_id_param
    AND host_id = member_host_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Commento per documentazione
COMMENT ON FUNCTION public.expel_community_member(UUID, UUID) IS 'Espelle un utente dalla community. Solo gli admin possono eseguire questa operazione.';

NOTIFY pgrst, 'reload schema';
