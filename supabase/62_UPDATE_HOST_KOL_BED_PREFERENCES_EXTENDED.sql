-- ============================================
-- AGGIORNA HOST_KOL_BED_PREFERENCES CON NUOVI CAMPI
-- ============================================
-- Aggiunge nuovi campi per gestire:
-- - Tipo di influencer preferito
-- - Nicchia di riferimento
-- - Numero minimo di follower (minimo 100)
-- - Piattaforme preferite per pubblicità
-- - Sponsorizzazione sito web/pagina/profilo
-- ============================================

-- 1. Aggiungi nuovi campi alla tabella host_kol_bed_preferences
ALTER TABLE public.host_kol_bed_preferences
  ADD COLUMN IF NOT EXISTS influencer_type TEXT, -- Tipo di influencer preferito (es: 'micro', 'macro', 'mega', 'any')
  ADD COLUMN IF NOT EXISTS preferred_niche TEXT, -- Nicchia di riferimento preferita
  ADD COLUMN IF NOT EXISTS min_followers INTEGER DEFAULT 100, -- Numero minimo di follower (minimo 100)
  ADD COLUMN IF NOT EXISTS preferred_platforms TEXT[] DEFAULT ARRAY[]::TEXT[], -- Piattaforme preferite: 'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'twitter'
  ADD COLUMN IF NOT EXISTS website_sponsorship BOOLEAN DEFAULT FALSE, -- Se true, vuole sponsorizzare un sito web/pagina/profilo
  ADD COLUMN IF NOT EXISTS website_url TEXT; -- URL del sito web/pagina/profilo da sponsorizzare (se website_sponsorship = true)

-- 2. Aggiungi commenti per documentazione
COMMENT ON COLUMN public.host_kol_bed_preferences.influencer_type IS 'Tipo di influencer preferito: micro, macro, mega, any';
COMMENT ON COLUMN public.host_kol_bed_preferences.preferred_niche IS 'Nicchia di riferimento preferita per le collaborazioni';
COMMENT ON COLUMN public.host_kol_bed_preferences.min_followers IS 'Numero minimo di follower richiesti (minimo 100)';
COMMENT ON COLUMN public.host_kol_bed_preferences.preferred_platforms IS 'Array di piattaforme social preferite per pubblicità';
COMMENT ON COLUMN public.host_kol_bed_preferences.website_sponsorship IS 'Se true, vuole sponsorizzare un sito web/pagina/profilo';
COMMENT ON COLUMN public.host_kol_bed_preferences.website_url IS 'URL del sito web/pagina/profilo da sponsorizzare';

-- 3. Aggiungi constraint per min_followers (minimo 100)
ALTER TABLE public.host_kol_bed_preferences
  ADD CONSTRAINT check_min_followers CHECK (min_followers >= 100 OR min_followers IS NULL);

-- 4. Verifica
SELECT 
    'TABELLA HOST_KOL_BED_PREFERENCES AGGIORNATA' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'host_kol_bed_preferences'
ORDER BY ordinal_position;

-- ============================================
-- FINE
-- ============================================
