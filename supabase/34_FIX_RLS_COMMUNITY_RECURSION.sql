-- ============================================
-- FIX RICORSIONE INFINITA RLS COMMUNITY
-- ============================================
-- Risolve il problema di infinite recursion
-- nelle policies di host_community_members
-- ============================================

-- Rimuovi le policies problematiche che causano ricorsione
DROP POLICY IF EXISTS "Members can view community members" ON public.host_community_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.host_community_members;
DROP POLICY IF EXISTS "Users can accept invitations" ON public.host_community_members;

-- Crea funzione helper con SECURITY DEFINER per verificare se l'utente è membro
CREATE OR REPLACE FUNCTION public.is_community_member(community_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.host_community_members
    WHERE community_id = community_id_param
      AND host_id = user_id_param
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Crea funzione helper per verificare se l'utente è admin
CREATE OR REPLACE FUNCTION public.is_community_admin(community_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Controlla se è il creatore della community
  IF EXISTS (
    SELECT 1 FROM public.host_communities
    WHERE id = community_id_param
      AND created_by = user_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Controlla se è admin tramite membro
  RETURN EXISTS (
    SELECT 1 FROM public.host_community_members
    WHERE community_id = community_id_param
      AND host_id = user_id_param
      AND role = 'admin'
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Nuove policies semplificate per host_community_members
-- SELECT: I membri possono vedere tutti i membri della community (usando funzione helper)
CREATE POLICY "Members can view community members"
  ON public.host_community_members FOR SELECT
  USING (
    -- Puoi vedere il tuo record
    host_id = auth.uid()
    OR
    -- Oppure puoi vedere i membri delle community di cui fai parte
    public.is_community_member(community_id, auth.uid())
  );

-- INSERT: Admin possono aggiungere membri, oppure l'utente stesso può accettare un invito
-- Nota: Le funzioni SECURITY DEFINER (create_community_admin, accept_community_invitation) 
-- bypassano RLS, quindi funzionano comunque
CREATE POLICY "Admins can add members or users can join via invitation"
  ON public.host_community_members FOR INSERT
  WITH CHECK (
    -- Admin può aggiungere membri
    public.is_community_admin(community_id, auth.uid())
    OR
    -- L'utente stesso può aggiungersi se esiste un invito valido
    (
      host_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.host_community_invitations
        WHERE community_id = host_community_members.community_id
          AND invited_host_id = auth.uid()
          AND status = 'pending'
      )
    )
  );

-- UPDATE: Solo admin possono modificare, oppure il membro stesso può accettare l'invito
CREATE POLICY "Admins and members can update"
  ON public.host_community_members FOR UPDATE
  USING (
    -- Il membro stesso può aggiornare il proprio status (accettare invito)
    host_id = auth.uid()
    OR
    -- Oppure un admin può modificare
    public.is_community_admin(community_id, auth.uid())
  )
  WITH CHECK (
    host_id = auth.uid()
    OR
    public.is_community_admin(community_id, auth.uid())
  );

-- DELETE: Solo admin possono rimuovere membri
CREATE POLICY "Admins can delete members"
  ON public.host_community_members FOR DELETE
  USING (
    public.is_community_admin(community_id, auth.uid())
  );

-- Aggiorna anche le policies di host_communities per evitare ricorsione
DROP POLICY IF EXISTS "Communities are viewable by members or hosts in the same area" ON public.host_communities;
DROP POLICY IF EXISTS "Admins can update their communities" ON public.host_communities;

-- Nuova policy SELECT per host_communities usando la funzione helper
CREATE POLICY "Communities are viewable by members or hosts in the same area"
  ON public.host_communities FOR SELECT
  USING (
    -- Il creatore può vedere
    created_by = auth.uid()
    OR
    -- I membri possono vedere (usando funzione helper)
    public.is_community_member(id, auth.uid())
    OR
    -- Gli host nella stessa area possono vedere (per le inviti)
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.owner_id = auth.uid()
        AND p.is_active = true
        AND (
          (p.city = host_communities.city AND p.country = host_communities.country)
          OR (host_communities.city IS NULL AND host_communities.country IS NULL)
        )
    )
  );

-- Nuova policy UPDATE per host_communities usando la funzione helper
CREATE POLICY "Admins can update their communities"
  ON public.host_communities FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    public.is_community_admin(id, auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR
    public.is_community_admin(id, auth.uid())
  );

-- Aggiorna le policies di host_community_messages per usare le funzioni helper
DROP POLICY IF EXISTS "Members can view messages" ON public.host_community_messages;
DROP POLICY IF EXISTS "Active members can send messages" ON public.host_community_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.host_community_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.host_community_messages;

CREATE POLICY "Members can view messages"
  ON public.host_community_messages FOR SELECT
  USING (
    public.is_community_member(community_id, auth.uid())
  );

CREATE POLICY "Active members can send messages"
  ON public.host_community_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.host_community_members
      WHERE community_id = host_community_messages.community_id
        AND host_id = auth.uid()
        AND status = 'accepted'
        AND can_write = true
        AND is_muted = false
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.host_community_messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.host_community_messages FOR DELETE
  USING (
    sender_id = auth.uid()
    OR
    public.is_community_admin(community_id, auth.uid())
  );

-- Aggiorna le policies di host_community_invitations per usare le funzioni helper
DROP POLICY IF EXISTS "Users can view their invitations" ON public.host_community_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.host_community_invitations;

CREATE POLICY "Users can view their invitations"
  ON public.host_community_invitations FOR SELECT
  USING (
    invited_host_id = auth.uid()
    OR
    public.is_community_admin(community_id, auth.uid())
  );

CREATE POLICY "Admins can create invitations"
  ON public.host_community_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND public.is_community_admin(community_id, auth.uid())
  );

-- Commenti per documentazione
COMMENT ON FUNCTION public.is_community_member IS 'Verifica se un utente è membro di una community (bypassa RLS)';
COMMENT ON FUNCTION public.is_community_admin IS 'Verifica se un utente è admin di una community (bypassa RLS)';

