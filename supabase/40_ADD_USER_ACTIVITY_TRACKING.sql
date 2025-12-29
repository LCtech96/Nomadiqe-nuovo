-- ============================================
-- TRACCIAMENTO ATTIVITÀ UTENTE
-- ============================================
-- Aggiunge last_activity a profiles per tracciare
-- l'ultima interazione dell'utente con l'app
-- ============================================

-- Aggiungi colonna last_activity a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Crea indice per performance (utile per query su utenti inattivi)
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON public.profiles(last_activity);

-- Funzione per aggiornare last_activity quando l'utente interagisce
CREATE OR REPLACE FUNCTION public.update_user_activity(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET last_activity = NOW()
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per aggiornare last_activity quando viene creato un like
CREATE OR REPLACE FUNCTION public.update_activity_on_like()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_user_activity(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activity_on_like ON public.post_likes;
CREATE TRIGGER trigger_update_activity_on_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_activity_on_like();

-- Trigger per aggiornare last_activity quando viene creato un commento
CREATE OR REPLACE FUNCTION public.update_activity_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_user_activity(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activity_on_comment ON public.post_comments;
CREATE TRIGGER trigger_update_activity_on_comment
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_activity_on_comment();

-- Trigger per aggiornare last_activity quando viene creato un post
CREATE OR REPLACE FUNCTION public.update_activity_on_post()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_user_activity(NEW.author_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activity_on_post ON public.posts;
CREATE TRIGGER trigger_update_activity_on_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_activity_on_post();

-- Trigger per aggiornare last_activity quando viene creato un messaggio
CREATE OR REPLACE FUNCTION public.update_activity_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiorna attività sia per il mittente che per il destinatario
  IF NEW.sender_id IS NOT NULL THEN
    PERFORM public.update_user_activity(NEW.sender_id);
  END IF;
  IF NEW.receiver_id IS NOT NULL THEN
    PERFORM public.update_user_activity(NEW.receiver_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_activity_on_message ON public.messages;
CREATE TRIGGER trigger_update_activity_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_activity_on_message();

-- Commenti per documentazione
COMMENT ON COLUMN public.profiles.last_activity IS 'Timestamp dell''ultima interazione dell''utente con l''app (like, commento, post, messaggio, etc.)';
COMMENT ON FUNCTION public.update_user_activity IS 'Aggiorna il timestamp last_activity per un utente';

-- ============================================
-- NOTA: L'aggiornamento di last_activity avviene automaticamente
-- tramite trigger quando l'utente:
-- - Mette like a un post
-- - Commenta un post
-- - Crea un post
-- - Invia/riceve un messaggio
-- 
-- Per altre azioni (prenotazioni, recensioni, etc.), l'aggiornamento
-- può essere fatto manualmente chiamando update_user_activity(user_id)
-- ============================================

