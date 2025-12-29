-- ============================================
-- VERIFICA TUTTI I TRIGGER CREATI
-- ============================================
-- Esegui questa query nel SQL Editor di Supabase
-- per verificare che tutti i trigger siano stati creati correttamente
-- ============================================

-- Verifica trigger per notifiche
SELECT 
    'TRIGGER NOTIFICHE' as info,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_send_message_notification',
    'trigger_send_like_notification',
    'trigger_send_comment_notification',
    'trigger_process_notification_webhook'
  )
ORDER BY trigger_name;

-- Verifica che le tabelle siano nella publication Realtime
SELECT 
    'REALTIME TABLES' as info,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'post_likes', 'post_comments')
ORDER BY tablename;

-- Verifica che le tabelle esistano
SELECT 
    'TABELLE CREATE' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('push_subscriptions', 'pending_notifications')
ORDER BY table_name;




