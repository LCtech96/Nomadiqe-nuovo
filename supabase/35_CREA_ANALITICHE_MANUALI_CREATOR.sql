-- ============================================
-- SISTEMA ANALITICHE MANUALI PER CREATOR
-- ============================================
-- Permette ai creator di inserire manualmente
-- le loro analitiche e controllare cosa mostrare
-- ============================================

-- Tabella per analitiche manuali dei creator
CREATE TABLE IF NOT EXISTS public.creator_manual_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  profile_views INTEGER,
  total_followers INTEGER,
  total_following INTEGER,
  total_posts INTEGER,
  total_likes INTEGER,
  total_comments INTEGER,
  total_interactions INTEGER,
  engagement_rate DECIMAL(5,2),
  total_reach INTEGER,
  -- Campi per controllo visibilità (cosa mostrare nel profilo pubblico)
  show_profile_views BOOLEAN DEFAULT TRUE,
  show_followers BOOLEAN DEFAULT TRUE,
  show_following BOOLEAN DEFAULT TRUE,
  show_posts BOOLEAN DEFAULT TRUE,
  show_interactions BOOLEAN DEFAULT TRUE,
  show_engagement_rate BOOLEAN DEFAULT TRUE,
  show_reach BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_creator_manual_analytics_creator ON public.creator_manual_analytics(creator_id);

-- Abilita RLS
ALTER TABLE public.creator_manual_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Creators can view their own analytics"
  ON public.creator_manual_analytics FOR SELECT
  USING (creator_id = auth.uid());

CREATE POLICY "Creators can insert their own analytics"
  ON public.creator_manual_analytics FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their own analytics"
  ON public.creator_manual_analytics FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Anyone can view visible analytics"
  ON public.creator_manual_analytics FOR SELECT
  USING (true); -- Per permettere la visualizzazione nel profilo pubblico basandosi sui flag di visibilità

-- Commenti per documentazione
COMMENT ON TABLE public.creator_manual_analytics IS 'Analitiche manuali inserite dai creator con controllo visibilità';
COMMENT ON COLUMN public.creator_manual_analytics.show_profile_views IS 'Se true, mostra le visualizzazioni profilo nel profilo pubblico';
COMMENT ON COLUMN public.creator_manual_analytics.show_followers IS 'Se true, mostra i follower nel profilo pubblico';
COMMENT ON COLUMN public.creator_manual_analytics.show_engagement_rate IS 'Se true, mostra il tasso di engagement nel profilo pubblico';

