-- Post approval: i post devono essere approvati dall'admin prima di essere visibili nel feed
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Esistenti: tutti approvati (retrocompatibilità)
UPDATE public.posts SET approval_status = 'approved';

-- Nuovi post: default pending (già nel DEFAULT sopra)
COMMENT ON COLUMN public.posts.approval_status IS 'pending=in attesa admin, approved=visibile nel feed, rejected=rifiutato';

CREATE INDEX IF NOT EXISTS idx_posts_approval_status ON public.posts(approval_status);
