-- Categorie estese analitiche: views pie, accounts reached, content type, demographics
-- PREREQUISITO: 85_ANALYTICS_SCREENSHOTS_BY_PERIOD.sql
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'views_pie_chart_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN views_pie_chart_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'accounts_reached_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN accounts_reached_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'reels_content_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN reels_content_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'posts_content_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN posts_content_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'stories_content_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN stories_content_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'profile_activity_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN profile_activity_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'profile_visits_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN profile_visits_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'external_links_taps_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN external_links_taps_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'audience_demographics_30_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN audience_demographics_30_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'audience_demographics_7_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN audience_demographics_7_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

COMMENT ON COLUMN public.creator_onboarding.views_pie_chart_urls IS 'Grafico a torta views: followers vs non-followers';
COMMENT ON COLUMN public.creator_onboarding.accounts_reached_urls IS 'Accounts reached';
COMMENT ON COLUMN public.creator_onboarding.reels_content_urls IS 'By content type: Reels con % followers e non followers';
COMMENT ON COLUMN public.creator_onboarding.posts_content_urls IS 'By content type: Posts';
COMMENT ON COLUMN public.creator_onboarding.stories_content_urls IS 'By content type: Stories';
COMMENT ON COLUMN public.creator_onboarding.profile_activity_urls IS '% Profile activity';
COMMENT ON COLUMN public.creator_onboarding.profile_visits_urls IS 'Profile visits';
COMMENT ON COLUMN public.creator_onboarding.external_links_taps_urls IS 'External links taps';
COMMENT ON COLUMN public.creator_onboarding.audience_demographics_30_urls IS 'Audience demographics ultimi 30 giorni';
COMMENT ON COLUMN public.creator_onboarding.audience_demographics_7_urls IS 'Audience demographics ultimi 7 giorni';
