-- Fix 403: disabilita RLS su pending_notifications
-- Le notifiche vengono create da trigger DB e API server-side (admin client).
-- Il client non deve inserire direttamente; se RLS era abilitato, blocca gli insert.

ALTER TABLE public.pending_notifications DISABLE ROW LEVEL SECURITY;
