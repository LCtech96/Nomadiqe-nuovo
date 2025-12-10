-- ============================================
-- CONFIGURA WEBHOOK PER NOTIFICHE PUSH
-- ============================================
-- Questo script configura un webhook Supabase che chiama
-- l'API route /api/notifications/process quando viene
-- inserita una notifica in pending_notifications
-- ============================================

-- Prova ad abilitare pg_net (più moderna) o http (fallback)
DO $$
BEGIN
  -- Prova prima con pg_net
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net;
    RAISE NOTICE 'Estensione pg_net abilitata con successo';
  EXCEPTION
    WHEN OTHERS THEN
      -- Se pg_net non è disponibile, usa http
      BEGIN
        CREATE EXTENSION IF NOT EXISTS http;
        RAISE NOTICE 'Estensione http abilitata con successo (fallback)';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Nessuna estensione HTTP disponibile. Usa Vercel Cron Jobs invece.';
      END;
  END;
END $$;

-- ============================================
-- FUNZIONE PER CHIAMARE IL WEBHOOK
-- ============================================

CREATE OR REPLACE FUNCTION public.process_pending_notification_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- URL del webhook (sostituisci con il tuo dominio)
  -- Per produzione: https://www.nomadiqe.com/api/notifications/process
  -- Per sviluppo locale: usa ngrok o un servizio simile
  webhook_url := 'https://www.nomadiqe.com/api/notifications/process';
  
  -- Chiama il webhook in modo asincrono (non blocca l'inserimento)
  -- Prova prima con pg_net, poi con http come fallback
  BEGIN
    -- Prova con pg_net (più moderna)
    PERFORM
      net.http_post(
        url := webhook_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'notification_id', NEW.id,
          'user_id', NEW.user_id,
          'notification_type', NEW.notification_type
        )
      );
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback: usa http extension (più vecchia ma più comune)
      BEGIN
        PERFORM
          http_post(
            webhook_url,
            jsonb_build_object(
              'notification_id', NEW.id,
              'user_id', NEW.user_id,
              'notification_type', NEW.notification_type
            )::text,
            'application/json'
          );
      EXCEPTION
        WHEN OTHERS THEN
          -- Se anche http non funziona, logga un warning ma non bloccare
          RAISE WARNING 'Impossibile chiamare webhook. Usa Vercel Cron Jobs.';
      END;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Non bloccare l'inserimento se il webhook fallisce
    RAISE WARNING 'Errore nel chiamare webhook per notifica %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER PER CHIAMARE IL WEBHOOK
-- ============================================

DROP TRIGGER IF EXISTS trigger_process_notification_webhook ON public.pending_notifications;
CREATE TRIGGER trigger_process_notification_webhook
  AFTER INSERT ON public.pending_notifications
  FOR EACH ROW
  WHEN (NEW.sent = false)
  EXECUTE FUNCTION public.process_pending_notification_webhook();

-- ============================================
-- VERIFICA CONFIGURAZIONE
-- ============================================

SELECT 
    'WEBHOOK TRIGGER' as info,
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trigger_process_notification_webhook';

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Se pg_net non è disponibile, puoi usare un approccio alternativo:
-- 1. Usa Vercel Cron Jobs (vercel.json)
-- 2. Oppure usa un servizio esterno come Zapier/Make.com
-- 3. Oppure chiama manualmente l'API quando necessario
-- ============================================

