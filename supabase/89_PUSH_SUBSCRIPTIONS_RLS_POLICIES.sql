-- ============================================
-- RLS POLICIES PER PUSH_SUBSCRIPTIONS
-- ============================================
-- Abilita RLS e definisce le policy per consentire:
-- 1. Utenti autenticati: INSERT/UPDATE/SELECT della propria subscription
-- 2. API/Cron (anon + service_role): SELECT per leggere i token FCM
-- ============================================

-- Abilita RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: utenti possono inserire la propria subscription
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.push_subscriptions;
CREATE POLICY "Users can insert own subscription"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: utenti possono aggiornare la propria subscription
DROP POLICY IF EXISTS "Users can update own subscription" ON public.push_subscriptions;
CREATE POLICY "Users can update own subscription"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: utenti autenticati possono leggere la propria subscription (client FCM)
DROP POLICY IF EXISTS "Users can read own subscription" ON public.push_subscriptions;
CREATE POLICY "Users can read own subscription"
ON public.push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: anon e service_role possono leggere (API process-fcm, cron)
DROP POLICY IF EXISTS "Allow read for service" ON public.push_subscriptions;
CREATE POLICY "Allow read for service"
ON public.push_subscriptions
FOR SELECT
TO anon, service_role
USING (true);

COMMENT ON TABLE public.push_subscriptions IS 'FCM/OneSignal push tokens. RLS: authenticated (own row), anon/service_role (read for API).';
