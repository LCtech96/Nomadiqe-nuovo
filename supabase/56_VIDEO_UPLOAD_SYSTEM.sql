-- ============================================
-- SISTEMA UPLOAD VIDEO PER CREATOR E HOST
-- ============================================
-- Permette a creator e host di caricare video con limiti giornalieri
-- ============================================

-- 1. AGGIUNGI COLONNA VIDEO_URL ALLA TABELLA POSTS (per video nei post dei creator)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'video_url'
  ) THEN
    ALTER TABLE public.posts ADD COLUMN video_url TEXT;
    RAISE NOTICE 'Colonna video_url aggiunta alla tabella posts';
  ELSE
    RAISE NOTICE 'Colonna video_url già esistente nella tabella posts';
  END IF;
END $$;

-- 2. AGGIUNGI COLONNA VIDEO_URL ALLA TABELLA PROPERTIES (per video delle strutture degli host)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'video_url'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN video_url TEXT;
    RAISE NOTICE 'Colonna video_url aggiunta alla tabella properties';
  ELSE
    RAISE NOTICE 'Colonna video_url già esistente nella tabella properties';
  END IF;
END $$;

-- 3. AGGIUNGI COLONNA PRESENTATION_VIDEO_URL ALLA TABELLA PROFILES (per video di presentazione dei creator)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'presentation_video_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN presentation_video_url TEXT;
    RAISE NOTICE 'Colonna presentation_video_url aggiunta alla tabella profiles';
  ELSE
    RAISE NOTICE 'Colonna presentation_video_url già esistente nella tabella profiles';
  END IF;
END $$;

-- 4. CREA TABELLA PER TRACCIARE I CARICAMENTI VIDEO GIORNALIERI
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_video_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('post', 'property', 'presentation')),
  video_url TEXT NOT NULL,
  file_size_mb DECIMAL(10, 2) NOT NULL,
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, upload_type, upload_date)
);

-- 5. CREA INDICE PER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_daily_video_uploads_user_date 
ON public.daily_video_uploads(user_id, upload_date);

CREATE INDEX IF NOT EXISTS idx_daily_video_uploads_type_date 
ON public.daily_video_uploads(upload_type, upload_date);

-- 6. CREA FUNZIONE PER VERIFICARE IL LIMITE GIORNALIERO
-- ============================================
CREATE OR REPLACE FUNCTION public.can_upload_video_today(
  p_user_id UUID,
  p_upload_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_upload_count INTEGER;
  v_user_role TEXT;
BEGIN
  -- Verifica il ruolo dell'utente
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Solo creator e host possono caricare video
  IF v_user_role NOT IN ('creator', 'host') THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica se l'utente ha già caricato un video oggi di questo tipo
  SELECT COUNT(*) INTO v_upload_count
  FROM public.daily_video_uploads
  WHERE user_id = p_user_id
    AND upload_type = p_upload_type
    AND upload_date = v_today;
  
  -- Limite: 1 video al giorno per tipo
  RETURN v_upload_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREA FUNZIONE PER REGISTRARE IL CARICAMENTO VIDEO
-- ============================================
CREATE OR REPLACE FUNCTION public.record_video_upload(
  p_user_id UUID,
  p_upload_type TEXT,
  p_video_url TEXT,
  p_file_size_mb DECIMAL
)
RETURNS UUID AS $$
DECLARE
  v_upload_id UUID;
  v_user_role TEXT;
BEGIN
  -- Verifica il ruolo dell'utente
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Solo creator e host possono caricare video
  IF v_user_role NOT IN ('creator', 'host') THEN
    RAISE EXCEPTION 'Solo creator e host possono caricare video';
  END IF;
  
  -- Verifica il limite giornaliero
  IF NOT public.can_upload_video_today(p_user_id, p_upload_type) THEN
    RAISE EXCEPTION 'Hai già caricato un video di questo tipo oggi. Limite: 1 video al giorno per tipo.';
  END IF;
  
  -- Verifica dimensione file (massimo 100MB)
  IF p_file_size_mb > 100 THEN
    RAISE EXCEPTION 'Il video è troppo grande. Dimensione massima consentita: 100MB. Dimensione attuale: %MB', p_file_size_mb;
  END IF;
  
  -- Registra il caricamento
  INSERT INTO public.daily_video_uploads (
    user_id,
    upload_type,
    video_url,
    file_size_mb,
    upload_date
  ) VALUES (
    p_user_id,
    p_upload_type,
    p_video_url,
    p_file_size_mb,
    CURRENT_DATE
  ) RETURNING id INTO v_upload_id;
  
  RETURN v_upload_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CREA POLICY RLS PER daily_video_uploads
-- ============================================
ALTER TABLE public.daily_video_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono vedere solo i propri caricamenti
DROP POLICY IF EXISTS "Users can view their own video uploads" ON public.daily_video_uploads;
CREATE POLICY "Users can view their own video uploads"
  ON public.daily_video_uploads FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Gli utenti possono inserire solo i propri caricamenti (tramite funzione)
DROP POLICY IF EXISTS "Users can insert their own video uploads" ON public.daily_video_uploads;
CREATE POLICY "Users can insert their own video uploads"
  ON public.daily_video_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 9. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT ON public.daily_video_uploads TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_upload_video_today(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_video_upload(UUID, TEXT, TEXT, DECIMAL) TO authenticated;

-- 10. COMMENTI PER DOCUMENTAZIONE
-- ============================================
COMMENT ON TABLE public.daily_video_uploads IS 'Traccia i caricamenti video giornalieri per limitare a 1 video al giorno per tipo (post, property, presentation)';
COMMENT ON COLUMN public.daily_video_uploads.upload_type IS 'Tipo di upload: post (per creator), property (per host), presentation (per creator)';
COMMENT ON COLUMN public.daily_video_uploads.file_size_mb IS 'Dimensione del file video in MB (massimo 100MB)';
COMMENT ON FUNCTION public.can_upload_video_today(UUID, TEXT) IS 'Verifica se un utente può caricare un video oggi del tipo specificato (limite: 1 per tipo al giorno)';
COMMENT ON FUNCTION public.record_video_upload(UUID, TEXT, TEXT, DECIMAL) IS 'Registra un caricamento video con validazione di ruolo, limite giornaliero e dimensione file';

-- ============================================
-- FINE SCRIPT
-- ============================================
