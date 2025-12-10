-- ============================================
-- TRIGGER DATABASE PER NOTIFICHE ONESIGNAL
-- ============================================
-- Questo script crea trigger che inviano notifiche push OneSignal
-- anche quando l'app è chiusa o il telefono è bloccato
-- ============================================

-- Abilita estensione http per chiamate HTTP (se non esiste)
CREATE EXTENSION IF NOT EXISTS http;

-- ============================================
-- FUNZIONE PER INVIARE NOTIFICA ONESIGNAL
-- ============================================

CREATE OR REPLACE FUNCTION public.send_onesignal_notification(
  player_id TEXT,
  title TEXT,
  message TEXT,
  url TEXT DEFAULT '/',
  data JSONB DEFAULT '{}'::JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  onesignal_app_id TEXT;
  onesignal_api_key TEXT;
  request_body JSONB;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- Ottieni credenziali OneSignal dalle variabili d'ambiente
  -- Nota: In Supabase, usa le variabili d'ambiente del progetto
  -- Per ora, leggeremo da una tabella di configurazione o useremo valori hardcoded
  -- In produzione, configura queste variabili in Supabase Dashboard -> Settings -> API
  
  -- Crea il body della richiesta
  request_body := jsonb_build_object(
    'app_id', onesignal_app_id,
    'include_player_ids', jsonb_build_array(player_id),
    'headings', jsonb_build_object('en', title, 'it', title),
    'contents', jsonb_build_object('en', message, 'it', message),
    'url', url,
    'data', data
  );
  
  -- Fai la chiamata HTTP a OneSignal
  SELECT status, content INTO response_status, response_body
  FROM http((
    'POST',
    'https://onesignal.com/api/v1/notifications',
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Basic ' || onesignal_api_key)
    ],
    'application/json',
    request_body::TEXT
  )::http_request);
  
  -- Verifica se la chiamata è riuscita
  IF response_status = 200 OR response_status = 201 THEN
    RETURN TRUE;
  ELSE
    RAISE WARNING 'OneSignal API error: % - %', response_status, response_body;
    RETURN FALSE;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Errore nell''invio notifica OneSignal: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNZIONE PER INVIARE NOTIFICA MESSAGGIO
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
  
  -- Invia notifica tramite API REST (chiamata HTTP)
  -- Nota: Per chiamate HTTP da PostgreSQL, usa pg_net extension o webhook
  -- Per ora, creiamo un record in una tabella che verrà processato da un worker
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
-- FUNZIONE PER INVIARE NOTIFICA LIKE
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
  
  -- Invia notifica
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
-- FUNZIONE PER INVIARE NOTIFICA COMMENTO
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
  
  -- Invia notifica
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
-- TABELLA PER NOTIFICHE PENDING
-- ============================================
-- Questa tabella memorizza le notifiche da inviare
-- Un worker/cron job processerà queste notifiche

CREATE TABLE IF NOT EXISTS public.pending_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL, -- 'message', 'like', 'comment'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT DEFAULT '/',
  data JSONB DEFAULT '{}'::JSONB,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type, created_at)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_pending_notifications_user ON public.pending_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_notifications_sent ON public.pending_notifications(sent, created_at);
CREATE INDEX IF NOT EXISTS idx_pending_notifications_type ON public.pending_notifications(notification_type);

-- Disabilita RLS per semplicità
ALTER TABLE public.pending_notifications DISABLE ROW LEVEL SECURITY;

-- ============================================
-- TRIGGER PER MESSAGGI
-- ============================================

DROP TRIGGER IF EXISTS trigger_send_message_notification ON public.messages;
CREATE TRIGGER trigger_send_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_message_notification();

-- ============================================
-- TRIGGER PER LIKE
-- ============================================

DROP TRIGGER IF EXISTS trigger_send_like_notification ON public.post_likes;
CREATE TRIGGER trigger_send_like_notification
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.send_like_notification();

-- ============================================
-- TRIGGER PER COMMENTI
-- ============================================

DROP TRIGGER IF EXISTS trigger_send_comment_notification ON public.post_comments;
CREATE TRIGGER trigger_send_comment_notification
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.send_comment_notification();

-- ============================================
-- VERIFICA
-- ============================================

SELECT 
    'TRIGGER CREATI' as info,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_send_message_notification',
    'trigger_send_like_notification',
    'trigger_send_comment_notification'
  )
ORDER BY trigger_name;

SELECT 
    'TABELLA PENDING_NOTIFICATIONS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'pending_notifications'
ORDER BY ordinal_position;

