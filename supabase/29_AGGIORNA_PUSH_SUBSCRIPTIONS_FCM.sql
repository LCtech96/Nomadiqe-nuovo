-- ============================================
-- AGGIORNA TABELLA PUSH_SUBSCRIPTIONS PER FCM
-- ============================================
-- Aggiunge la colonna fcm_token per supportare Firebase Cloud Messaging
-- Mantiene onesignal_player_id per retrocompatibilità
-- ============================================

-- Aggiungi colonna fcm_token se non esiste
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Crea indice per fcm_token
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_fcm_token 
ON public.push_subscriptions(fcm_token) 
WHERE fcm_token IS NOT NULL;

-- Rimuovi unique constraint da onesignal_player_id se esiste
-- (per permettere di avere sia OneSignal che FCM)
DO $$
BEGIN
  -- Prova a rimuovere il constraint unique se esiste
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_onesignal_player_id_key'
  ) THEN
    ALTER TABLE public.push_subscriptions 
    DROP CONSTRAINT push_subscriptions_onesignal_player_id_key;
  END IF;
END $$;

-- Rendi onesignal_player_id nullable (per permettere solo FCM senza OneSignal)
ALTER TABLE public.push_subscriptions 
ALTER COLUMN onesignal_player_id DROP NOT NULL;

-- Verifica
SELECT 
    'COLONNE PUSH_SUBSCRIPTIONS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'push_subscriptions'
ORDER BY ordinal_position;

