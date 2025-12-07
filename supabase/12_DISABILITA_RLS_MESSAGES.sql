-- ============================================
-- DISABILITA RLS PER MESSAGES
-- ============================================
-- Permette di inviare messaggi senza errori RLS
-- ============================================

-- Disabilita RLS per la tabella messages
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Verifica
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'messages';

-- Dovrebbe mostrare rls_enabled = false

