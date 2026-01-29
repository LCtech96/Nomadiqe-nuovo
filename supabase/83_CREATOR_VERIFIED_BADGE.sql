-- Creator verified-by-admin badge
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'creator_verified_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN creator_verified_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'creator_verified_by'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN creator_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.creator_verified_at IS 'Quando l''admin ha approvato la verifica del creator (badge verificato).';
COMMENT ON COLUMN public.profiles.creator_verified_by IS 'Admin che ha approvato la verifica.';

-- ============================================
-- FINE
