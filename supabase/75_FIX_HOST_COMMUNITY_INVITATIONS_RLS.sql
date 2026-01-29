-- ============================================
-- Fix: RLS policy per creare inviti subito dopo la creazione community
-- ============================================
-- La policy "Admins can create invitations" richiede che l'utente sia già
-- membro admin con status='accepted'. Ma quando si crea una community,
-- il trigger create_community_admin() inserisce il creatore come admin,
-- ma potrebbe esserci un timing issue o il membro potrebbe non essere
-- ancora visibile via RLS. Aggiungiamo un controllo alternativo: se l'utente
-- è il creatore della community (created_by), può creare inviti anche se
-- non è ancora visibile come membro.
-- ============================================

DROP POLICY IF EXISTS "Admins can create invitations" ON public.host_community_invitations;
CREATE POLICY "Admins can create invitations"
  ON public.host_community_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND (
      -- Opzione 1: L'utente è il creatore della community
      EXISTS (
        SELECT 1 FROM public.host_communities c
        WHERE c.id = host_community_invitations.community_id
          AND c.created_by = auth.uid()
      )
      OR
      -- Opzione 2: L'utente è admin della community (per inviti successivi)
      EXISTS (
        SELECT 1 FROM public.host_community_members cm
        WHERE cm.community_id = host_community_invitations.community_id
          AND cm.host_id = auth.uid()
          AND cm.role = 'admin'
          AND cm.status = 'accepted'
      )
    )
  );

NOTIFY pgrst, 'reload schema';
