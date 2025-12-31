-- ============================================
-- FIX TRIGGER PER MESSAGGI AI - Evita doppie notifiche
-- ============================================
-- Questo script corregge il trigger send_message_notification
-- per saltare la creazione automatica di notifiche per messaggi AI
-- (sender_id IS NULL), perché questi vengono gestiti manualmente
-- dall'API route
-- ============================================

-- ============================================
-- FUNZIONE PER INVIARE NOTIFICA MESSAGGIO (FIXED FOR AI)
-- ============================================

CREATE OR REPLACE FUNCTION public.send_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  message_preview TEXT;
BEGIN
  -- Evita notifiche se il messaggio è dello stesso utente
  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;
  
  -- Evita notifiche automatiche per messaggi AI (sender_id IS NULL)
  -- Questi vengono gestiti manualmente dall'API route
  IF NEW.sender_id IS NULL OR NEW.is_ai_message = true THEN
    RETURN NEW;
  END IF;
  
  -- Ottieni il nome del mittente
  SELECT COALESCE(full_name, username, 'Qualcuno') INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Garantisce che sender_name non sia NULL
  IF sender_name IS NULL THEN
    sender_name := 'Qualcuno';
  END IF;
  
  -- Prepara l'anteprima del messaggio
  message_preview := CASE
    WHEN NEW.content IS NULL OR LENGTH(NEW.content) = 0 THEN 'Nuovo messaggio'
    WHEN LENGTH(NEW.content) > 50 THEN SUBSTRING(NEW.content, 1, 50) || '...'
    ELSE NEW.content
  END;
  
  -- Garantisce che message_preview non sia NULL o vuoto
  IF message_preview IS NULL OR LENGTH(message_preview) = 0 THEN
    message_preview := 'Nuovo messaggio';
  END IF;
  
  -- Crea SEMPRE la notifica in pending_notifications
  -- Il cron job controllerà se l'utente è iscritto prima di inviare
  INSERT INTO public.pending_notifications (
    user_id,
    notification_type,
    title,
    message,
    url,
    data
  )
  VALUES (
    NEW.receiver_id,
    'message',
    '💬 Nuovo messaggio',
    sender_name || ': ' || message_preview,
    '/messages',
    jsonb_build_object(
      'type', 'message',
      'related_id', NEW.sender_id,
      'message_id', NEW.id
    )
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commento per documentazione
COMMENT ON FUNCTION public.send_message_notification() IS 'Crea notifiche per nuovi messaggi, escludendo messaggi AI (gestiti manualmente dall''API)';

-- Notifica PostgREST per ricaricare lo schema
NOTIFY pgrst, 'reload schema';

