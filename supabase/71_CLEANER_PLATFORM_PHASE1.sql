-- =============================================================================
-- CLEANER PLATFORM – PHASE 1
-- =============================================================================
-- 1. Add 'cleaner' role
-- 2. cleaner_profiles (years_exp, insurance, cleaner_id, agreement, etc.)
-- 3. cleaner_approval_requests (admin approve/reject before cleaner can accept jobs)
-- 4. Sequence for Cleaner ID (e.g. BS00001 C)
-- =============================================================================

-- 1. Add 'cleaner' to user_role
-- -----------------------------------------------------------------------------
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cleaner';

-- 2. Sequence for Cleaner ID (5 digits, e.g. 00001, 00002)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.cleaner_id_seq START 1;

-- 3. cleaner_profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cleaner_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  years_experience INTEGER,
  insurance_status TEXT, -- 'insured', 'not_insured', 'pending'
  cleaner_id TEXT UNIQUE, -- e.g. 'BS00001 C'; set when admin approves
  department TEXT DEFAULT 'C', -- 'C' = Cleaning
  driver_license TEXT,
  id_card_or_ssn TEXT, -- CF or document ID; consider encryption in production
  agreement_url TEXT, -- signed agreement file URL (storage)
  admin_approved_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_user_id ON public.cleaner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_cleaner_id ON public.cleaner_profiles(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_profiles_admin_approved ON public.cleaner_profiles(admin_approved_at) WHERE admin_approved_at IS NOT NULL;

COMMENT ON TABLE public.cleaner_profiles IS 'Cleaner-specific profile: experience, insurance, Cleaner ID, agreement. Admin must approve before cleaner can accept jobs.';

-- 4. cleaner_approval_requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cleaner_approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cleaner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cleaner_approval_requests_cleaner ON public.cleaner_approval_requests(cleaner_user_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_approval_requests_status ON public.cleaner_approval_requests(status);

COMMENT ON TABLE public.cleaner_approval_requests IS 'Cleaner requests admin approval. Admin approves/rejects; only then can cleaner accept jobs.';

-- 5. Function: generate Cleaner ID (e.g. BS00001 C)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_cleaner_id(
  p_user_id UUID,
  p_department TEXT DEFAULT 'C'
)
RETURNS TEXT AS $$
DECLARE
  initials TEXT;
  next_val INT;
  result TEXT;
  name_str TEXT;
  parts TEXT[];
BEGIN
  SELECT COALESCE(TRIM(p.full_name), 'XX') INTO name_str
  FROM public.profiles p WHERE p.id = p_user_id;
  name_str := COALESCE(NULLIF(TRIM(name_str), ''), 'XX');
  parts := string_to_array(name_str, ' ');
  IF array_length(parts, 1) >= 2 THEN
    initials := UPPER(LEFT(parts[1], 1) || LEFT(parts[array_length(parts, 1)], 1));
  ELSE
    initials := UPPER(LEFT(name_str, 2));
  END IF;
  initials := COALESCE(NULLIF(initials, ''), 'XX');
  next_val := nextval('public.cleaner_id_seq');
  result := initials || LPAD(next_val::TEXT, 5, '0') || ' ' || COALESCE(NULLIF(p_department, ''), 'C');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. RLS for cleaner_profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.cleaner_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleaner_profiles_select" ON public.cleaner_profiles;
DROP POLICY IF EXISTS "cleaner_profiles_select_own" ON public.cleaner_profiles;
DROP POLICY IF EXISTS "cleaner_profiles_select_public_read" ON public.cleaner_profiles;
CREATE POLICY "cleaner_profiles_select"
  ON public.cleaner_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "cleaner_profiles_insert_own" ON public.cleaner_profiles;
CREATE POLICY "cleaner_profiles_insert_own"
  ON public.cleaner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cleaner_profiles_update_own" ON public.cleaner_profiles;
CREATE POLICY "cleaner_profiles_update_own"
  ON public.cleaner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. RLS for cleaner_approval_requests
-- -----------------------------------------------------------------------------
ALTER TABLE public.cleaner_approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleaner_approval_select_own" ON public.cleaner_approval_requests;
CREATE POLICY "cleaner_approval_select_own"
  ON public.cleaner_approval_requests FOR SELECT
  USING (auth.uid() = cleaner_user_id);

DROP POLICY IF EXISTS "cleaner_approval_insert_own" ON public.cleaner_approval_requests;
CREATE POLICY "cleaner_approval_insert_own"
  ON public.cleaner_approval_requests FOR INSERT
  WITH CHECK (auth.uid() = cleaner_user_id);

-- Admin review done via service role / API. No RLS update policy for regular users.

-- 8. Trigger: set updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_cleaner_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cleaner_profiles_updated_at ON public.cleaner_profiles;
CREATE TRIGGER trigger_cleaner_profiles_updated_at
  BEFORE UPDATE ON public.cleaner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_cleaner_updated_at();

DROP TRIGGER IF EXISTS trigger_cleaner_approval_updated_at ON public.cleaner_approval_requests;
CREATE TRIGGER trigger_cleaner_approval_updated_at
  BEFORE UPDATE ON public.cleaner_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_cleaner_updated_at();

-- =============================================================================
-- END Phase 1
-- =============================================================================
