-- ============================================
-- FIX RPC FUNCTIONS CON SECURITY DEFINER
-- ============================================

-- Funzione per incrementare like_count (con SECURITY DEFINER)
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per decrementare like_count (con SECURITY DEFINER)
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per incrementare comment_count (con SECURITY DEFINER)
CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET comment_count = COALESCE(comment_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per decrementare comment_count (con SECURITY DEFINER)
CREATE OR REPLACE FUNCTION decrement_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per incrementare share_count (con SECURITY DEFINER)
CREATE OR REPLACE FUNCTION increment_post_shares(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_post_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_comments(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_shares(UUID) TO authenticated;

-- ============================================
-- CREA TABELLA REPOSTS
-- ============================================

-- Tabella per i repost
CREATE TABLE IF NOT EXISTS public.post_reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(original_post_id, user_id) -- Un utente può fare repost una sola volta per post
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_post_reposts_original_post ON public.post_reposts(original_post_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_user ON public.post_reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_post_reposts_created_at ON public.post_reposts(created_at);

-- Disabilita RLS (per semplicità)
ALTER TABLE public.post_reposts DISABLE ROW LEVEL SECURITY;

-- Funzione per incrementare repost_count
CREATE OR REPLACE FUNCTION increment_post_reposts(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET repost_count = COALESCE(repost_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per decrementare repost_count
CREATE OR REPLACE FUNCTION decrement_post_reposts(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET repost_count = GREATEST(COALESCE(repost_count, 0) - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggiungi colonna repost_count se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'posts' AND column_name = 'repost_count') THEN
    ALTER TABLE public.posts ADD COLUMN repost_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Grant execute permissions per repost functions
GRANT EXECUTE ON FUNCTION increment_post_reposts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_reposts(UUID) TO authenticated;

-- Verifica
SELECT 
    'FUNZIONI RPC' as info,
    proname as function_name,
    prosecdef as security_definer
FROM pg_proc
WHERE proname IN (
    'increment_post_likes', 
    'decrement_post_likes', 
    'increment_post_comments',
    'decrement_post_comments',
    'increment_post_shares',
    'increment_post_reposts',
    'decrement_post_reposts'
)
ORDER BY proname;

SELECT 
    'TABELLA POST_REPOSTS' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'post_reposts'
ORDER BY ordinal_position;


