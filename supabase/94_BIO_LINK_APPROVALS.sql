-- Approvazione link nella bio dei profili host
-- I link (https://, http://, www.) nella bio non sono cliccabili finché l'admin non approva

CREATE TABLE IF NOT EXISTS public.bio_link_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  link_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bio_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(user_id, link_url)
);

-- Se la tabella esiste già senza decided_at/decided_by, aggiungile
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bio_link_approvals' AND column_name = 'decided_at') THEN
    ALTER TABLE public.bio_link_approvals ADD COLUMN decided_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bio_link_approvals' AND column_name = 'decided_by') THEN
    ALTER TABLE public.bio_link_approvals ADD COLUMN decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bio_link_approvals_user_status ON public.bio_link_approvals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bio_link_approvals_status ON public.bio_link_approvals(status) WHERE status = 'pending';

ALTER TABLE public.bio_link_approvals DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.bio_link_approvals IS 'Link nella bio host in attesa di approvazione admin';
