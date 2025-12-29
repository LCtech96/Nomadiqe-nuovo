-- ============================================
-- ABILITA REALTIME E CREA TABELLA PUSH SUBSCRIPTIONS
-- ============================================

-- Aggiungi le tabelle alla publication supabase_realtime
-- Nota: Se le tabelle sono già nella publication, questo darà un warning ma non un errore
DO $$
BEGIN
  -- Aggiungi messages se non è già presente
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  -- Aggiungi post_likes se non è già presente
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'post_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
  END IF;

  -- Aggiungi post_comments se non è già presente
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
  END IF;
END $$;

-- Crea tabella per salvare le subscription OneSignal
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  onesignal_player_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(onesignal_player_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_player ON public.push_subscriptions(onesignal_player_id);

-- Disabilita RLS per semplicità (come per altre tabelle simili)
ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;

-- Verifica publication
SELECT 
    'PUBLICATION TABLES' as info,
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'post_likes', 'post_comments')
ORDER BY tablename;

-- Verifica tabella push_subscriptions
SELECT 
    'TABELLA PUSH_SUBSCRIPTIONS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
ORDER BY ordinal_position;

SELECT 
    'RLS STATUS' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'push_subscriptions';



