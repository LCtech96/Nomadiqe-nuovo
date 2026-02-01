-- Host onboarding: residenza, CIN/CIR, calendario prezzi
-- ============================================

-- Indirizzo residenza host (profiles)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'residence_address') THEN
    ALTER TABLE public.profiles ADD COLUMN residence_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'residence_city') THEN
    ALTER TABLE public.profiles ADD COLUMN residence_city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'residence_country') THEN
    ALTER TABLE public.profiles ADD COLUMN residence_country TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cin_url') THEN
    ALTER TABLE public.profiles ADD COLUMN cin_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cir_url') THEN
    ALTER TABLE public.profiles ADD COLUMN cir_url TEXT;
  END IF;
END $$;

-- Calendario prezzi per giorno (property_daily_pricing)
CREATE TABLE IF NOT EXISTS public.property_daily_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'closed', 'kolbed')),
  price_cents INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, date)
);

CREATE INDEX IF NOT EXISTS idx_property_daily_pricing_property ON public.property_daily_pricing(property_id);
CREATE INDEX IF NOT EXISTS idx_property_daily_pricing_date ON public.property_daily_pricing(date);

COMMENT ON TABLE public.property_daily_pricing IS 'Prezzi e disponibilità per singola data (Airbnb-style)';
