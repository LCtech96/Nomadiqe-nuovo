-- ============================================
-- SISTEMA COMMUNITY PER HOST
-- ============================================
-- Permette agli host di creare community locali
-- per scambiarsi messaggi e conversare tra loro
-- ============================================

-- Tabella communities
CREATE TABLE IF NOT EXISTS public.host_communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  city TEXT, -- Città principale della community
  country TEXT, -- Paese principale della community
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella community_members
CREATE TABLE IF NOT EXISTS public.host_community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES public.host_communities(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'blocked'
  can_write BOOLEAN DEFAULT TRUE, -- Se false, l'utente non può scrivere
  is_muted BOOLEAN DEFAULT FALSE, -- Se true, l'utente è silenziato
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Chi ha invitato
  joined_at TIMESTAMP WITH TIME ZONE, -- Quando ha accettato l'invito
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, host_id)
);

-- Tabella community_messages
CREATE TABLE IF NOT EXISTS public.host_community_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES public.host_communities(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella community_invitations
CREATE TABLE IF NOT EXISTS public.host_community_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES public.host_communities(id) ON DELETE CASCADE NOT NULL,
  invited_host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, invited_host_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.host_community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_host ON public.host_community_members(host_id);
CREATE INDEX IF NOT EXISTS idx_community_members_status ON public.host_community_members(status);
CREATE INDEX IF NOT EXISTS idx_community_messages_community ON public.host_community_messages(community_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_messages_sender ON public.host_community_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_community_invitations_host ON public.host_community_invitations(invited_host_id, status);
CREATE INDEX IF NOT EXISTS idx_community_invitations_community ON public.host_community_invitations(community_id);
CREATE INDEX IF NOT EXISTS idx_host_communities_city ON public.host_communities(city, country);

-- Abilita RLS
ALTER TABLE public.host_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_community_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies per host_communities
CREATE POLICY "Communities are viewable by members or hosts in the same area"
  ON public.host_communities FOR SELECT
  USING (
    -- Il creatore può vedere
    created_by = auth.uid()
    OR
    -- I membri possono vedere
    EXISTS (
      SELECT 1 FROM public.host_community_members
      WHERE community_id = host_communities.id
        AND host_id = auth.uid()
        AND status = 'accepted'
    )
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

CREATE POLICY "Hosts can create communities"
  ON public.host_communities FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'host'
    )
  );

CREATE POLICY "Admins can update their communities"
  ON public.host_communities FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.host_community_members
      WHERE community_id = host_communities.id
        AND host_id = auth.uid()
        AND role = 'admin'
        AND status = 'accepted'
    )
  );

-- RLS Policies per host_community_members
CREATE POLICY "Members can view community members"
  ON public.host_community_members FOR SELECT
  USING (
    -- Il membro stesso può vedere il proprio record
    host_id = auth.uid()
    OR
    -- Gli altri membri della community possono vedere
    EXISTS (
      SELECT 1 FROM public.host_community_members cm
      WHERE cm.community_id = host_community_members.community_id
        AND cm.host_id = auth.uid()
        AND cm.status = 'accepted'
    )
  );

CREATE POLICY "Admins can manage members"
  ON public.host_community_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.host_community_members cm
      WHERE cm.community_id = host_community_members.community_id
        AND cm.host_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'accepted'
    )
  );

CREATE POLICY "Users can accept invitations"
  ON public.host_community_members FOR UPDATE
  USING (
    host_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    host_id = auth.uid()
    AND status IN ('accepted', 'rejected')
  );

-- RLS Policies per host_community_messages
CREATE POLICY "Members can view messages"
  ON public.host_community_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.host_community_members cm
      WHERE cm.community_id = host_community_messages.community_id
        AND cm.host_id = auth.uid()
        AND cm.status = 'accepted'
    )
  );

CREATE POLICY "Active members can send messages"
  ON public.host_community_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.host_community_members cm
      WHERE cm.community_id = host_community_messages.community_id
        AND cm.host_id = auth.uid()
        AND cm.status = 'accepted'
        AND cm.can_write = true
        AND cm.is_muted = false
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
    OR EXISTS (
      SELECT 1 FROM public.host_community_members cm
      JOIN public.host_communities c ON c.id = cm.community_id
      WHERE cm.community_id = host_community_messages.community_id
        AND (cm.host_id = auth.uid() AND cm.role = 'admin')
        OR (c.created_by = auth.uid())
    )
  );

-- RLS Policies per host_community_invitations
CREATE POLICY "Users can view their invitations"
  ON public.host_community_invitations FOR SELECT
  USING (
    invited_host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.host_community_members cm
      WHERE cm.community_id = host_community_invitations.community_id
        AND cm.host_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'accepted'
    )
  );

CREATE POLICY "Admins can create invitations"
  ON public.host_community_invitations FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.host_community_members cm
      WHERE cm.community_id = host_community_invitations.community_id
        AND cm.host_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'accepted'
    )
  );

CREATE POLICY "Users can update their invitations"
  ON public.host_community_invitations FOR UPDATE
  USING (invited_host_id = auth.uid())
  WITH CHECK (invited_host_id = auth.uid());

-- Funzione per creare automaticamente il creatore come admin
CREATE OR REPLACE FUNCTION public.create_community_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserisci il creatore come admin
  INSERT INTO public.host_community_members (
    community_id,
    host_id,
    role,
    status,
    can_write,
    is_muted,
    joined_at
  )
  VALUES (
    NEW.id,
    NEW.created_by,
    'admin',
    'accepted',
    true,
    false,
    NOW()
  )
  ON CONFLICT (community_id, host_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per creare automaticamente l'admin quando si crea una community
DROP TRIGGER IF EXISTS trigger_create_community_admin ON public.host_communities;
CREATE TRIGGER trigger_create_community_admin
  AFTER INSERT ON public.host_communities
  FOR EACH ROW
  EXECUTE FUNCTION public.create_community_admin();

-- Funzione per creare notifica quando viene inviato un invito
CREATE OR REPLACE FUNCTION public.notify_community_invitation()
RETURNS TRIGGER AS $$
DECLARE
  community_name TEXT;
  inviter_name TEXT;
BEGIN
  -- Ottieni nome della community
  SELECT name INTO community_name
  FROM public.host_communities
  WHERE id = NEW.community_id;
  
  -- Ottieni nome dell'invitante
  SELECT COALESCE(full_name, username, 'Un host') INTO inviter_name
  FROM public.profiles
  WHERE id = NEW.invited_by;
  
  -- Crea notifica
  INSERT INTO public.pending_notifications (
    user_id,
    notification_type,
    title,
    message,
    url,
    data
  )
  VALUES (
    NEW.invited_host_id,
    'community_invitation',
    '📬 Invito a community',
    inviter_name || ' ti ha invitato a unirti alla community "' || community_name || '"',
    '/communities',
    jsonb_build_object(
      'type', 'community_invitation',
      'community_id', NEW.community_id,
      'invitation_id', NEW.id
    )
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per notificare quando viene creato un invito
DROP TRIGGER IF EXISTS trigger_notify_community_invitation ON public.host_community_invitations;
CREATE TRIGGER trigger_notify_community_invitation
  AFTER INSERT ON public.host_community_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_community_invitation();

-- Funzione per accettare un invito automaticamente creando il membro
CREATE OR REPLACE FUNCTION public.accept_community_invitation(invitation_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_community_id UUID;
  v_invited_host_id UUID;
  v_invited_by UUID;
BEGIN
  -- Ottieni i dati dell'invito
  SELECT community_id, invited_host_id, invited_by
  INTO v_community_id, v_invited_host_id, v_invited_by
  FROM public.host_community_invitations
  WHERE id = invitation_id_param
    AND invited_host_id = auth.uid()
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Aggiorna lo status dell'invito
  UPDATE public.host_community_invitations
  SET status = 'accepted', updated_at = NOW()
  WHERE id = invitation_id_param;
  
  -- Crea il membro (se non esiste già)
  INSERT INTO public.host_community_members (
    community_id,
    host_id,
    role,
    status,
    can_write,
    is_muted,
    invited_by,
    joined_at
  )
  VALUES (
    v_community_id,
    v_invited_host_id,
    'member',
    'accepted',
    true,
    false,
    v_invited_by,
    NOW()
  )
  ON CONFLICT (community_id, host_id) 
  DO UPDATE SET 
    status = 'accepted',
    joined_at = COALESCE(host_community_members.joined_at, NOW()),
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per rifiutare un invito
CREATE OR REPLACE FUNCTION public.reject_community_invitation(invitation_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.host_community_invitations
  SET status = 'rejected', updated_at = NOW()
  WHERE id = invitation_id_param
    AND invited_host_id = auth.uid()
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione helper per ottenere host nella stessa area
CREATE OR REPLACE FUNCTION public.get_hosts_in_area(city_param TEXT DEFAULT NULL, country_param TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  country TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.bio,
    prop.city,
    prop.country
  FROM public.profiles p
  JOIN public.properties prop ON prop.owner_id = p.id
  WHERE p.role = 'host'
    AND prop.is_active = true
    AND p.id != auth.uid() -- Escludi l'utente corrente
    AND (
      city_param IS NULL OR prop.city = city_param
    )
    AND (
      country_param IS NULL OR prop.country = country_param
    )
  ORDER BY p.full_name, p.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commenti per documentazione
COMMENT ON TABLE public.host_communities IS 'Community create dagli host per scambiarsi messaggi';
COMMENT ON TABLE public.host_community_members IS 'Membri delle community con ruoli e permessi';
COMMENT ON TABLE public.host_community_messages IS 'Messaggi nelle community';
COMMENT ON TABLE public.host_community_invitations IS 'Inviti alle community';

