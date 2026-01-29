-- ============================================
-- RPC: get_community_by_id
-- ============================================
-- Restituisce una community per ID se l'utente è il creatore o un membro accettato.
-- Bypassa RLS (stesso problema di get_user_created_communities sul client).
-- ============================================

CREATE OR REPLACE FUNCTION public.get_community_by_id(
  community_id_param UUID,
  user_id_param UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  city TEXT,
  country TEXT,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hc.id,
    hc.name,
    hc.description,
    hc.city,
    hc.country,
    hc.created_by
  FROM public.host_communities hc
  WHERE hc.id = community_id_param
    AND (
      hc.created_by = user_id_param
      OR EXISTS (
        SELECT 1 FROM public.host_community_members m
        WHERE m.community_id = hc.id
          AND m.host_id = user_id_param
          AND m.status = 'accepted'
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_community_by_id(UUID, UUID) IS 'Restituisce una community per ID se l''utente è creatore o membro accettato. Bypassa RLS.';

NOTIFY pgrst, 'reload schema';
