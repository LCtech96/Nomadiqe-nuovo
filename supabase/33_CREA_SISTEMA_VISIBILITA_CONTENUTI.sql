-- ============================================
-- SISTEMA VISIBILITÀ CONTENUTI PER CREATOR
-- ============================================
-- Permette ai creator di controllare la visibilità
-- dei loro contenuti (post, collaborazioni, etc.)
-- ============================================

-- Enum per i tipi di pubblico
DO $$ BEGIN
  CREATE TYPE visibility_audience AS ENUM ('public', 'host', 'manager', 'traveler', 'creator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Aggiungi colonna visibility_audience a posts se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'visibility_audience'
  ) THEN
    ALTER TABLE public.posts 
    ADD COLUMN visibility_audience visibility_audience[] DEFAULT ARRAY['public']::visibility_audience[];
    RAISE NOTICE 'Colonna visibility_audience aggiunta a posts';
  END IF;
END $$;

-- Aggiungi colonna is_visible a collaborations se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'collaborations' 
    AND column_name = 'is_visible'
  ) THEN
    ALTER TABLE public.collaborations 
    ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'Colonna is_visible aggiunta a collaborations';
  END IF;
END $$;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON public.posts USING GIN(visibility_audience);
CREATE INDEX IF NOT EXISTS idx_collaborations_visibility ON public.collaborations(creator_id, is_visible);

-- Funzione helper per verificare se un utente può vedere un post basato sulla visibilità
CREATE OR REPLACE FUNCTION public.can_view_post(post_id_param UUID, viewer_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  post_visibility visibility_audience[];
  viewer_role TEXT;
BEGIN
  -- Ottieni la visibilità del post
  SELECT visibility_audience INTO post_visibility
  FROM public.posts
  WHERE id = post_id_param;
  
  -- Se non c'è visibilità impostata, default è pubblico
  IF post_visibility IS NULL OR array_length(post_visibility, 1) IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Se 'public' è nella lista, tutti possono vedere
  IF 'public' = ANY(post_visibility) THEN
    RETURN TRUE;
  END IF;
  
  -- Ottieni il ruolo del visualizzatore
  SELECT role INTO viewer_role
  FROM public.profiles
  WHERE id = viewer_id_param;
  
  -- Se il visualizzatore ha un ruolo, controlla se è nella lista
  IF viewer_role IS NOT NULL THEN
    RETURN viewer_role::visibility_audience = ANY(post_visibility);
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commenti per documentazione
COMMENT ON COLUMN public.posts.visibility_audience IS 'Array di audience che possono vedere il post: public, host, manager, traveler, creator';
COMMENT ON COLUMN public.collaborations.is_visible IS 'Se true, la collaborazione è visibile pubblicamente nel profilo creator';

