-- Creator onboarding: profilo, analytics, social, KOL&BED, termini
-- ============================================

-- Tabella creator_onboarding (uno per creator)
CREATE TABLE IF NOT EXISTS public.creator_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  -- Analytics e strategia
  analytics_screenshot_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  niche TEXT,
  publishing_strategy TEXT,
  reels_per_week INTEGER,
  posts_per_week INTEGER,
  carousels_per_week INTEGER,
  stories_per_week INTEGER,
  -- KOL&BED livello: base | medio | lusso
  kol_bed_level TEXT CHECK (kol_bed_level IN ('base', 'medio', 'lusso')),
  -- Compagni di viaggio
  travel_companions_count INTEGER DEFAULT 0,
  companions_are_creators BOOLEAN DEFAULT FALSE,
  companions_have_ig_or_tiktok BOOLEAN DEFAULT FALSE,
  -- Accettazione termini
  accept_promote_only_nomadiqe BOOLEAN DEFAULT FALSE,
  accept_profile_photo_different BOOLEAN DEFAULT FALSE,
  accept_username_different BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_onboarding_user_id ON public.creator_onboarding(user_id);

COMMENT ON TABLE public.creator_onboarding IS 'Dati onboarding creator: analytics, nicchia, strategia, KOL&BED, compagni, termini.';

-- RLS
ALTER TABLE public.creator_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own creator onboarding" ON public.creator_onboarding;
CREATE POLICY "Users can view own creator onboarding"
  ON public.creator_onboarding FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own creator onboarding" ON public.creator_onboarding;
CREATE POLICY "Users can insert own creator onboarding"
  ON public.creator_onboarding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own creator onboarding" ON public.creator_onboarding;
CREATE POLICY "Users can update own creator onboarding"
  ON public.creator_onboarding FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_creator_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_creator_onboarding_updated_at ON public.creator_onboarding;
CREATE TRIGGER trigger_update_creator_onboarding_updated_at
  BEFORE UPDATE ON public.creator_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creator_onboarding_updated_at();

-- ============================================
-- FINE
