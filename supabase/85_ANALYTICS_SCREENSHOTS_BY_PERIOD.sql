-- Screenshot analitiche per periodo: 90 giorni, 30 giorni, 7 giorni
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'analytics_90_days_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN analytics_90_days_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'analytics_30_days_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN analytics_30_days_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'creator_onboarding' AND column_name = 'analytics_7_days_urls') THEN
    ALTER TABLE public.creator_onboarding ADD COLUMN analytics_7_days_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

-- Migra dati esistenti da analytics_screenshot_urls a analytics_90_days_urls
UPDATE public.creator_onboarding
SET analytics_90_days_urls = analytics_screenshot_urls
WHERE analytics_screenshot_urls IS NOT NULL AND array_length(analytics_screenshot_urls, 1) > 0;

COMMENT ON COLUMN public.creator_onboarding.analytics_90_days_urls IS 'Screenshot analitiche ultimi 90 giorni';
COMMENT ON COLUMN public.creator_onboarding.analytics_30_days_urls IS 'Screenshot analitiche ultimo mese';
COMMENT ON COLUMN public.creator_onboarding.analytics_7_days_urls IS 'Screenshot analitiche ultima settimana';
