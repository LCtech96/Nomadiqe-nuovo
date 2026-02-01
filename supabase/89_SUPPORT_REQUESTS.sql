-- Richieste assistenza: host, creator, jolly possono inviare richieste
-- L'admin può leggere e rispondere
-- ============================================

CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.support_requests(id) ON DELETE CASCADE,
  is_from_admin BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON public.support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON public.support_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_request_id ON public.support_messages(request_id);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Utenti possono vedere e creare le proprie richieste
DROP POLICY IF EXISTS "Users can view own support requests" ON public.support_requests;
CREATE POLICY "Users can view own support requests" ON public.support_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own support requests" ON public.support_requests;
CREATE POLICY "Users can insert own support requests" ON public.support_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Utenti possono vedere i messaggi delle proprie richieste
DROP POLICY IF EXISTS "Users can view own support messages" ON public.support_messages;
CREATE POLICY "Users can view own support messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own support messages" ON public.support_messages;
CREATE POLICY "Users can insert own support messages" ON public.support_messages
  FOR INSERT WITH CHECK (
    is_from_admin = false
    AND EXISTS (SELECT 1 FROM public.support_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
  );

COMMENT ON TABLE public.support_requests IS 'Richieste assistenza da host/creator/jolly';
COMMENT ON TABLE public.support_messages IS 'Messaggi nella conversazione supporto (utente e admin)';
