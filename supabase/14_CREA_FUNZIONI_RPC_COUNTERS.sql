-- ============================================
-- CREA FUNZIONI RPC PER CONTATORI
-- ============================================

-- Funzione per incrementare like_count
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET like_count = COALESCE(like_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Funzione per decrementare like_count
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Funzione per incrementare comment_count
CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET comment_count = COALESCE(comment_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Funzione per incrementare share_count
CREATE OR REPLACE FUNCTION increment_post_shares(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET share_count = COALESCE(share_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Verifica che le funzioni siano state create
SELECT 
    'FUNZIONI RPC' as info,
    proname as function_name,
    pronargs as num_args
FROM pg_proc
WHERE proname IN (
    'increment_post_likes', 
    'decrement_post_likes', 
    'increment_post_comments',
    'increment_post_shares'
)
ORDER BY proname;


