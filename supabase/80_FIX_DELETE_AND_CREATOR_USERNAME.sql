-- ============================================
-- Fix delete_community + creator username
-- ============================================
-- 1. delete_community: usa user_id_param (da frontend) invece di auth.uid()
--    perché con NextAuth il client Supabase può non avere auth.uid() valido.
-- 2. get_user_created_communities: aggiunge created_by_username (join profiles).
-- ============================================

-- 1. delete_community: nuova firma con user_id_param
DROP FUNCTION IF EXISTS public.delete_community(UUID);
CREATE OR REPLACE FUNCTION public.delete_community(
  community_id_param UUID,
  user_id_param UUID
)
RETURNS void AS $$
DECLARE
  community_creator UUID;
BEGIN
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Non autenticato';
  END IF;

  SELECT created_by INTO community_creator
  FROM public.host_communities
  WHERE id = community_id_param;

  IF community_creator IS NULL THEN
    RAISE EXCEPTION 'Community non trovata';
  END IF;

  IF community_creator != user_id_param THEN
    RAISE EXCEPTION 'Solo il creatore della community può eliminarla';
  END IF;

  DELETE FROM public.host_communities
  WHERE id = community_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.delete_community(UUID, UUID) IS 'Elimina una community. Solo il creatore (user_id_param) può eseguire.';

-- 2. get_user_created_communities: aggiungi created_by_username (DROP necessario: return type diverso)
DROP FUNCTION IF EXISTS public.get_user_created_communities(UUID);
CREATE OR REPLACE FUNCTION public.get_user_created_communities(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  city TEXT,
  country TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  created_by_username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hc.id,
    hc.name,
    hc.description,
    hc.city,
    hc.country,
    hc.created_by,
    hc.created_at,
    p.username AS created_by_username
  FROM public.host_communities hc
  LEFT JOIN public.profiles p ON p.id = hc.created_by
  WHERE hc.created_by = user_id_param
  ORDER BY hc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';
