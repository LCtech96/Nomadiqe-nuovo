-- ============================================
-- CREA TABELLA PER RICHIESTE OFFERTA SITO WEB
-- ============================================
-- Tabella per tracciare le richieste di offerta sito web
-- dai primi 100 host iscritti
-- ============================================

-- 1. Crea tabella per le richieste di offerta sito web
CREATE TABLE IF NOT EXISTS public.website_offer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'completed', 'declined'
  offer_price DECIMAL(10, 2), -- Prezzo offerto (299€ per primi 100, 799€ dal 101esimo)
  is_first_100 BOOLEAN DEFAULT FALSE, -- Se true, è uno dei primi 100 host
  notes TEXT, -- Note aggiuntive
  contacted_at TIMESTAMP WITH TIME ZONE, -- Data di contatto
  completed_at TIMESTAMP WITH TIME ZONE, -- Data di completamento
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(host_id) -- Un host può fare una sola richiesta
);

-- 2. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_website_offer_requests_host ON public.website_offer_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_website_offer_requests_status ON public.website_offer_requests(status);
CREATE INDEX IF NOT EXISTS idx_website_offer_requests_first_100 ON public.website_offer_requests(is_first_100) WHERE is_first_100 = TRUE;

-- 3. Disabilita RLS per semplicità (come per altre tabelle simili)
ALTER TABLE public.website_offer_requests DISABLE ROW LEVEL SECURITY;

-- 4. Funzione per contare i primi 100 host
CREATE OR REPLACE FUNCTION public.get_host_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.profiles WHERE role = 'host');
END;
$$ LANGUAGE plpgsql;

-- 5. Verifica
SELECT 
    'TABELLA WEBSITE_OFFER_REQUESTS CREATA' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'website_offer_requests'
ORDER BY ordinal_position;

-- ============================================
-- FINE
-- ============================================
