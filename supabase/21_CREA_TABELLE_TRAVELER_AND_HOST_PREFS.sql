-- ============================================
-- CREA TABELLE PER TRAVELER E HOST PREFERENCES
-- ============================================

-- Tabella per i like sulle proprietà (property likes)
CREATE TABLE IF NOT EXISTS public.property_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, user_id) -- Un utente può mettere like una sola volta per proprietà
);

-- Tabella per le proprietà salvate (saved properties / favorites)
CREATE TABLE IF NOT EXISTS public.saved_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, user_id) -- Un utente può salvare una proprietà una sola volta
);

-- Tabella per le preferenze KOL&BED degli host
CREATE TABLE IF NOT EXISTS public.host_kol_bed_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  free_stay_nights INTEGER DEFAULT 0, -- Numero di notti FREE STAY disponibili
  promotion_types TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array: 'video', 'photo', 'both'
  required_social_platforms TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array: 'instagram', 'tiktok', 'facebook', 'linkedin', 'twitter'
  additional_requirements TEXT, -- Altri requisiti per le collaborazioni
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_property_likes_property ON public.property_likes(property_id);
CREATE INDEX IF NOT EXISTS idx_property_likes_user ON public.property_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_property ON public.saved_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_user ON public.saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_host_kol_bed_preferences_host ON public.host_kol_bed_preferences(host_id);

-- Disabilita RLS per semplicità (come per altre tabelle simili)
ALTER TABLE public.property_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_kol_bed_preferences DISABLE ROW LEVEL SECURITY;

-- Verifica
SELECT 
    'TABELLA PROPERTY_LIKES' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'property_likes'
ORDER BY ordinal_position;

SELECT 
    'TABELLA SAVED_PROPERTIES' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'saved_properties'
ORDER BY ordinal_position;

SELECT 
    'TABELLA HOST_KOL_BED_PREFERENCES' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'host_kol_bed_preferences'
ORDER BY ordinal_position;

SELECT 
    'RLS STATUS' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('property_likes', 'saved_properties', 'host_kol_bed_preferences');


