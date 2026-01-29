-- ============================================
-- NOTIFICHE PER COMMUNITY
-- ============================================
-- Crea notifiche per:
-- 1. Inviti community (quando un host viene invitato)
-- 2. Messaggi nella community (quando viene inviato un messaggio)
-- ============================================

-- ============================================
-- FUNZIONE: Notifica invito community (aggiornata)
-- ============================================
-- Aggiorna la funzione esistente per usare pending_notifications
CREATE OR REPLACE FUNCTION public.notify_community_invitation()
RETURNS TRIGGER AS $$
DECLARE
  inviter_name TEXT;
  community_name TEXT;
BEGIN
  -- Ottieni nome dell'invitante
  SELECT COALESCE(full_name, username, 'Un host') INTO inviter_name
  FROM public.profiles
  WHERE id = NEW.invited_by;
  
  -- Ottieni nome della community
  SELECT name INTO community_name
  FROM public.host_communities
  WHERE id = NEW.community_id;
  
  -- Crea notifica per l'host invitato
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
    '👥 Invito a community',
    inviter_name || ' ti ha invitato a unirti alla community "' || COALESCE(community_name, 'Community') || '"',
    '/communities',
    jsonb_build_object(
      'type', 'community_invitation',
      'invitation_id', NEW.id,
      'community_id', NEW.community_id,
      'invited_by', NEW.invited_by
    )
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger per notificare quando viene creato un invito (aggiornato)
DROP TRIGGER IF EXISTS trigger_notify_community_invitation ON public.host_community_invitations;
CREATE TRIGGER trigger_notify_community_invitation
  AFTER INSERT ON public.host_community_invitations
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_community_invitation();

-- ============================================
-- FUNZIONE: Notifica messaggio community
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_community_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  message_preview TEXT;
  community_name TEXT;
  member_ids UUID[];
BEGIN
  -- Ottieni nome del mittente
  SELECT COALESCE(full_name, username, 'Qualcuno') INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Ottieni nome della community
  SELECT name INTO community_name
  FROM public.host_communities
  WHERE id = NEW.community_id;
  
  -- Prepara l'anteprima del messaggio
  message_preview := CASE
    WHEN LENGTH(NEW.content) > 50 THEN SUBSTRING(NEW.content, 1, 50) || '...'
    ELSE NEW.content
  END;
  
  -- Ottieni tutti i membri della community (escluso il mittente)
  SELECT ARRAY_AGG(host_id) INTO member_ids
  FROM public.host_community_members
  WHERE community_id = NEW.community_id
    AND host_id != NEW.sender_id
    AND status = 'accepted'
    AND is_muted = false;
  
  -- Crea notifica per ogni membro
  IF member_ids IS NOT NULL THEN
    INSERT INTO public.pending_notifications (
      user_id,
      notification_type,
      title,
      message,
      url,
      data
    )
    SELECT
      member_id,
      'community_message',
      '💬 ' || COALESCE(community_name, 'Community'),
      sender_name || ': ' || message_preview,
      '/communities/' || NEW.community_id,
      jsonb_build_object(
        'type', 'community_message',
        'community_id', NEW.community_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    FROM UNNEST(member_ids) AS member_id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger per notificare quando viene inviato un messaggio nella community
DROP TRIGGER IF EXISTS trigger_notify_community_message ON public.host_community_messages;
CREATE TRIGGER trigger_notify_community_message
  AFTER INSERT ON public.host_community_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_community_message();

NOTIFY pgrst, 'reload schema';
