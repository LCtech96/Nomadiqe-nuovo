-- ============================================
-- WEBHOOK: USA PROCESS-FCM INVECE DI PROCESS
-- ============================================
-- Aggiorna il webhook per chiamare l'endpoint FCM invece di OneSignal,
-- così le notifiche push arrivano subito sul cellulare
-- ============================================

CREATE OR REPLACE FUNCTION public.process_pending_notification_webhook()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
BEGIN
  -- URL FCM: processa le notifiche pending e le invia via Firebase
  webhook_url := 'https://www.nomadiqe.com/api/notifications/process-fcm';
  
  BEGIN
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
          RAISE WARNING 'Impossibile chiamare webhook FCM. Usa Vercel Cron Jobs.';
      END;
  END;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Errore webhook per notifica %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica che il trigger sia attivo
SELECT 
    'WEBHOOK FCM' as info,
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trigger_process_notification_webhook';
