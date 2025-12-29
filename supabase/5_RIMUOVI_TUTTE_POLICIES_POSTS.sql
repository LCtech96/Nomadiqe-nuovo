-- ============================================
-- RIMUOVI TUTTE LE POLICIES PER POSTS
-- ============================================
-- Questo script rimuove TUTTE le policies esistenti per posts
-- indipendentemente dal nome
-- ============================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Disabilita RLS
    ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;
    
    -- Loop attraverso tutte le policies per la tabella posts
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'posts'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.posts', policy_record.policyname);
        RAISE NOTICE 'Rimossa policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '✅ Tutte le policies per posts sono state rimosse';
    
    -- Riabilita RLS (senza policies per ora)
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
END $$;

-- Verifica che non ci siano più policies
SELECT 
    COUNT(*) as numero_policies_rimaste
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts';

-- Dovrebbe essere 0



