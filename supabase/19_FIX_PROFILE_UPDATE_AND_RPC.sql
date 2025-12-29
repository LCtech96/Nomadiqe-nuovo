-- ============================================
-- FIX PROFILE UPDATE E VERIFICA RPC FUNCTIONS
-- ============================================

-- Verifica che le funzioni RPC esistano e abbiano i permessi corretti
DO $$
BEGIN
  -- Verifica e ricrea increment_post_likes se necessario
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_post_likes' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
    RETURNS VOID AS $$
    BEGIN
      UPDATE public.posts
      SET like_count = COALESCE(like_count, 0) + 1
      WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    GRANT EXECUTE ON FUNCTION increment_post_likes(UUID) TO authenticated;
  END IF;

  -- Verifica e ricrea decrement_post_likes se necessario
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'decrement_post_likes' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
    RETURNS VOID AS $$
    BEGIN
      UPDATE public.posts
      SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0)
      WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    GRANT EXECUTE ON FUNCTION decrement_post_likes(UUID) TO authenticated;
  END IF;

  -- Verifica e ricrea increment_post_comments se necessario
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_post_comments' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
    RETURNS VOID AS $$
    BEGIN
      UPDATE public.posts
      SET comment_count = COALESCE(comment_count, 0) + 1
      WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    GRANT EXECUTE ON FUNCTION increment_post_comments(UUID) TO authenticated;
  END IF;

  -- Verifica e ricrea decrement_post_comments se necessario
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'decrement_post_comments' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION decrement_post_comments(post_id UUID)
    RETURNS VOID AS $$
    BEGIN
      UPDATE public.posts
      SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0)
      WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    GRANT EXECUTE ON FUNCTION decrement_post_comments(UUID) TO authenticated;
  END IF;

  -- Verifica e ricrea increment_post_shares se necessario
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_post_shares' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION increment_post_shares(post_id UUID)
    RETURNS VOID AS $$
    BEGIN
      UPDATE public.posts
      SET share_count = COALESCE(share_count, 0) + 1
      WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    GRANT EXECUTE ON FUNCTION increment_post_shares(UUID) TO authenticated;
  END IF;

  -- Verifica e ricrea increment_post_reposts se necessario
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_post_reposts' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION increment_post_reposts(post_id UUID)
    RETURNS VOID AS $$
    BEGIN
      UPDATE public.posts
      SET repost_count = COALESCE(repost_count, 0) + 1
      WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    GRANT EXECUTE ON FUNCTION increment_post_reposts(UUID) TO authenticated;
  END IF;

  -- Verifica e ricrea decrement_post_reposts se necessario
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'decrement_post_reposts' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE OR REPLACE FUNCTION decrement_post_reposts(post_id UUID)
    RETURNS VOID AS $$
    BEGIN
      UPDATE public.posts
      SET repost_count = GREATEST(COALESCE(repost_count, 0) - 1, 0)
      WHERE id = post_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    GRANT EXECUTE ON FUNCTION decrement_post_reposts(UUID) TO authenticated;
  END IF;
END $$;

-- Verifica che tutte le funzioni abbiano SECURITY DEFINER
SELECT 
    'VERIFICA FUNZIONI RPC' as info,
    proname as function_name,
    prosecdef as security_definer,
    CASE 
        WHEN prosecdef THEN '✓ SECURITY DEFINER'
        ELSE '✗ NO SECURITY DEFINER'
    END as status
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
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;



