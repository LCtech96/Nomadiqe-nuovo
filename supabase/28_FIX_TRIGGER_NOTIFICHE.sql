-- ============================================
-- FIX TRIGGER NOTIFICHE - Crea sempre le notifiche
-- ============================================
-- Questo script corregge i trigger per creare SEMPRE le notifiche
-- in pending_notifications, anche se l'utente non è ancora iscritto
-- Il cron job controllerà se l'utente è iscritto prima di inviare
-- ============================================

-- ============================================
-- FUNZIONE PER INVIARE NOTIFICA MESSAGGIO (FIXED)
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
  
  -- Ottieni il nome del mittente
  SELECT COALESCE(full_name, username, 'Qualcuno') INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  -- Prepara l'anteprima del messaggio
  message_preview := CASE
    WHEN LENGTH(NEW.content) > 50 THEN SUBSTRING(NEW.content, 1, 50) || '...'
    ELSE NEW.content
  END;
  
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

-- ============================================
-- FUNZIONE PER INVIARE NOTIFICA LIKE (FIXED)
-- ============================================

CREATE OR REPLACE FUNCTION public.send_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  liker_name TEXT;
BEGIN
  -- Evita notifiche se il like è dell'autore stesso
  IF EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = NEW.post_id AND author_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Ottieni l'autore del post
  SELECT author_id INTO post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  IF post_author_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Ottieni il nome di chi ha messo like
  SELECT COALESCE(full_name, username, 'Qualcuno') INTO liker_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Crea SEMPRE la notifica
  INSERT INTO public.pending_notifications (
    user_id,
    notification_type,
    title,
    message,
    url,
    data
  )
  VALUES (
    post_author_id,
    'like',
    '❤️ Nuovo like',
    liker_name || ' ha messo mi piace al tuo post',
    '/posts/' || NEW.post_id,
    jsonb_build_object(
      'type', 'post_like',
      'related_id', NEW.post_id,
      'like_id', NEW.id
    )
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNZIONE PER INVIARE NOTIFICA COMMENTO (FIXED)
-- ============================================

CREATE OR REPLACE FUNCTION public.send_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  commenter_name TEXT;
  comment_preview TEXT;
BEGIN
  -- Evita notifiche se il commento è dell'autore stesso
  IF EXISTS (
    SELECT 1 FROM public.posts
    WHERE id = NEW.post_id AND author_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Ottieni l'autore del post
  SELECT author_id INTO post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  IF post_author_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Ottieni il nome di chi ha commentato
  SELECT COALESCE(full_name, username, 'Qualcuno') INTO commenter_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Prepara l'anteprima del commento
  comment_preview := CASE
    WHEN LENGTH(NEW.content) > 50 THEN SUBSTRING(NEW.content, 1, 50) || '...'
    ELSE NEW.content
  END;
  
  -- Crea SEMPRE la notifica
  INSERT INTO public.pending_notifications (
    user_id,
    notification_type,
    title,
    message,
    url,
    data
  )
  VALUES (
    post_author_id,
    'comment',
    '💬 Nuovo commento',
    commenter_name || ': ' || comment_preview,
    '/posts/' || NEW.post_id,
    jsonb_build_object(
      'type', 'post_comment',
      'related_id', NEW.post_id,
      'comment_id', NEW.id
    )
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICA
-- ============================================

SELECT 
    'FUNZIONI AGGIORNATE' as info,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'send_message_notification',
    'send_like_notification',
    'send_comment_notification'
  )
ORDER BY routine_name;



