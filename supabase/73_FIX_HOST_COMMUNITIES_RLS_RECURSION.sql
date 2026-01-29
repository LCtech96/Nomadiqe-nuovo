-- ============================================
-- Fix: infinite recursion in RLS for host_communities
-- ============================================
-- Le policy su host_communities e host_community_members si riferiscono
-- l'una all'altra → ricorsione. Usiamo funzioni SECURITY DEFINER che
-- leggono host_community_members senza RLS, così host_communities
-- non deve più interrogare host_community_members nelle policy.
-- ============================================

-- 1. Funzioni helper SECURITY DEFINER (bypassano RLS, niente ricorsione)
--    Nessun DROP: is_community_admin è usata da policy su host_community_members.
--    Usiamo gli stessi nomi parametri (community_id_param, user_id_param) per
--    consentire CREATE OR REPLACE senza errore 42P13.

CREATE OR REPLACE FUNCTION public.is_community_member_or_admin(community_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.host_community_members m
    WHERE m.community_id = community_id_param
      AND m.host_id = user_id_param
      AND m.status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_community_admin(community_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.host_community_members m
    WHERE m.community_id = community_id_param
      AND m.host_id = user_id_param
      AND m.role = 'admin'
      AND m.status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. host_communities SELECT: usa la funzione invece di EXISTS(host_community_members)
DROP POLICY IF EXISTS "Communities are viewable by members or hosts in the same area" ON public.host_communities;
CREATE POLICY "Communities are viewable by members or hosts in the same area"
  ON public.host_communities FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_community_member_or_admin(id, auth.uid())
    OR (
      EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.owner_id = auth.uid()
          AND p.is_active = true
          AND (
            (p.city = host_communities.city AND p.country = host_communities.country)
            OR (host_communities.city IS NULL AND host_communities.country IS NULL)
          )
      )
    )
  );

-- 3. host_communities UPDATE: usa la funzione invece di EXISTS(host_community_members)
DROP POLICY IF EXISTS "Admins can update their communities" ON public.host_communities;
CREATE POLICY "Admins can update their communities"
  ON public.host_communities FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_community_admin(id, auth.uid())
  );

-- Fine
NOTIFY pgrst, 'reload schema';
