-- ============================================
-- JOLLY PULIZIE: feed per host, rating thumbs up/down, anni esperienza
-- ============================================
-- - Tabella jolly_host_ratings (pollice su/giù dagli host che hanno usato il jolly)
-- - Colonna experience_years su manager_services
-- - RLS e indici
-- ============================================

-- 1. Anni di esperienza su manager_services (per servizi pulizie)
ALTER TABLE public.manager_services
  ADD COLUMN IF NOT EXISTS experience_years INTEGER;

COMMENT ON COLUMN public.manager_services.experience_years IS 'Anni di esperienza per questo servizio (es. pulizie).';

-- 2. Rating thumbs up/down: host che hanno completato un servizio con un jolly possono votare
CREATE TABLE IF NOT EXISTS public.jolly_host_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jolly_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(host_id, jolly_id, service_request_id)
);

CREATE INDEX IF NOT EXISTS idx_jolly_host_ratings_jolly ON public.jolly_host_ratings(jolly_id);
CREATE INDEX IF NOT EXISTS idx_jolly_host_ratings_host ON public.jolly_host_ratings(host_id);
CREATE INDEX IF NOT EXISTS idx_jolly_host_ratings_request ON public.jolly_host_ratings(service_request_id);

COMMENT ON TABLE public.jolly_host_ratings IS 'Voti pollice su/giù che gli host danno ai jolly dopo un servizio completato.';

-- 3. RLS
ALTER TABLE public.jolly_host_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read jolly ratings" ON public.jolly_host_ratings;
CREATE POLICY "Anyone can read jolly ratings"
  ON public.jolly_host_ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Hosts can insert own vote for completed request" ON public.jolly_host_ratings;
CREATE POLICY "Hosts can insert own vote for completed request"
  ON public.jolly_host_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = host_id
    AND EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = service_request_id
        AND sr.host_id = auth.uid()
        AND sr.manager_id = jolly_id
        AND sr.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Hosts can update own vote" ON public.jolly_host_ratings;
CREATE POLICY "Hosts can update own vote"
  ON public.jolly_host_ratings FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- 4. Vista helper per conteggi thumbs per jolly (opzionale, per query feed)
CREATE OR REPLACE VIEW public.jolly_rating_counts AS
SELECT
  jolly_id,
  COUNT(*) FILTER (WHERE vote = 'up') AS thumbs_up,
  COUNT(*) FILTER (WHERE vote = 'down') AS thumbs_down
FROM public.jolly_host_ratings
GROUP BY jolly_id;

GRANT SELECT ON public.jolly_rating_counts TO anon;
GRANT SELECT ON public.jolly_rating_counts TO authenticated;

-- Fine
NOTIFY pgrst, 'reload schema';
