-- Fix temporaneo 403: disabilita RLS su push_subscriptions
-- così l'upsert dal client browser funziona.
-- Il client usa chiave anon e non ha JWT Supabase (auth.uid() è null).
--
-- Dopo il deploy dell'API /api/notifications/register-fcm-token puoi
-- ri-abilitare RLS con: supabase/89_PUSH_SUBSCRIPTIONS_RLS_POLICIES.sql

ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;
