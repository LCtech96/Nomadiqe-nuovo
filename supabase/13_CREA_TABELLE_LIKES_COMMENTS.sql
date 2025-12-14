-- ============================================
-- CREA TABELLE PER LIKES E COMMENTS
-- ============================================

-- Tabella per i like sui post
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id) -- Un utente può mettere like una sola volta per post
);

-- Tabella per i commenti sui post
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user ON public.post_comments(user_id);

-- Disabilita RLS (per semplicità, come per posts e messages)
ALTER TABLE public.post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments DISABLE ROW LEVEL SECURITY;

-- Verifica
SELECT 
    'TABELLA POST_LIKES' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'post_likes'
ORDER BY ordinal_position;

SELECT 
    'TABELLA POST_COMMENTS' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'post_comments'
ORDER BY ordinal_position;

SELECT 
    'RLS STATUS' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('post_likes', 'post_comments')
ORDER BY tablename;


