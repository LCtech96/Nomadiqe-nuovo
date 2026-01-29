-- ============================================
-- Fix: RPC function per ottenere community create dall'utente
-- ============================================
-- Il problema è che il client Supabase potrebbe non avere auth.uid() 
-- impostato correttamente, quindi la policy RLS non permette di vedere
-- le community create. Creiamo una funzione RPC SECURITY DEFINER che
-- bypassa RLS e restituisce le community create dall'utente.
-- ============================================

DROP FUNCTION IF EXISTS public.get_user_created_communities(UUID);

CREATE OR REPLACE FUNCTION public.get_user_created_communities(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  city TEXT,
  country TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ
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
    hc.created_at
  FROM public.host_communities hc
  WHERE hc.created_by = user_id_param
  ORDER BY hc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Commento per documentazione
COMMENT ON FUNCTION public.get_user_created_communities(UUID) IS 'Restituisce tutte le community create da un utente, bypassando RLS';

NOTIFY pgrst, 'reload schema';
