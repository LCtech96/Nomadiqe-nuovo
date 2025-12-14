-- ============================================
-- AGGIORNA HOST_KOL_BED_PREFERENCES
-- ============================================
-- Aggiunge nuovi campi per gestire:
-- - Notti in cambio per collaborazione
-- - Video/Post/Storie richiesti
-- - Mesi in cui aderisce al programma KOL&BED
-- ============================================

-- 1. Aggiungi nuovi campi alla tabella host_kol_bed_preferences
ALTER TABLE public.host_kol_bed_preferences
  ADD COLUMN IF NOT EXISTS nights_per_collaboration INTEGER DEFAULT 0, -- Notti offerte per ogni collaborazione
  ADD COLUMN IF NOT EXISTS required_videos INTEGER DEFAULT 0, -- Numero video richiesti
  ADD COLUMN IF NOT EXISTS required_posts INTEGER DEFAULT 0, -- Numero post richiesti
  ADD COLUMN IF NOT EXISTS required_stories INTEGER DEFAULT 0, -- Numero storie richieste
  ADD COLUMN IF NOT EXISTS kol_bed_months INTEGER[] DEFAULT ARRAY[]::INTEGER[]; -- Mesi (1-12) in cui aderisce al programma

-- 2. Aggiungi commenti per documentazione
COMMENT ON COLUMN public.host_kol_bed_preferences.nights_per_collaboration IS 'Numero di notti offerte per ogni collaborazione FREE STAY';
COMMENT ON COLUMN public.host_kol_bed_preferences.required_videos IS 'Numero di video richiesti in cambio della collaborazione';
COMMENT ON COLUMN public.host_kol_bed_preferences.required_posts IS 'Numero di post richiesti in cambio della collaborazione';
COMMENT ON COLUMN public.host_kol_bed_preferences.required_stories IS 'Numero di storie richieste in cambio della collaborazione';
COMMENT ON COLUMN public.host_kol_bed_preferences.kol_bed_months IS 'Array di mesi (1-12) in cui l''host aderisce al programma KOL&BED';

-- 3. Crea tabella per il calendario delle disponibilità
CREATE TABLE IF NOT EXISTS public.host_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_for_collab BOOLEAN DEFAULT TRUE, -- Se true, disponibile per collaborazioni
  is_booking BOOLEAN DEFAULT FALSE, -- Se true, è una prenotazione esistente
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  notes TEXT, -- Note aggiuntive
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(host_id, property_id, date) -- Un host può avere una sola entry per proprietà/data
);

-- 4. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_host_availability_host ON public.host_availability(host_id);
CREATE INDEX IF NOT EXISTS idx_host_availability_property ON public.host_availability(property_id);
CREATE INDEX IF NOT EXISTS idx_host_availability_date ON public.host_availability(date);
CREATE INDEX IF NOT EXISTS idx_host_availability_available ON public.host_availability(available_for_collab) WHERE available_for_collab = TRUE;

-- 5. Disabilita RLS per semplicità (come per altre tabelle simili)
ALTER TABLE public.host_availability DISABLE ROW LEVEL SECURITY;

-- 6. Verifica
SELECT 
    'TABELLA HOST_KOL_BED_PREFERENCES AGGIORNATA' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'host_kol_bed_preferences'
ORDER BY ordinal_position;

SELECT 
    'TABELLA HOST_AVAILABILITY CREATA' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'host_availability'
ORDER BY ordinal_position;

-- ============================================
-- FINE
-- ============================================
