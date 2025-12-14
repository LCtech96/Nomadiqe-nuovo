-- ============================================
-- FIX RLS POLICY PER MANAGER_SERVICES
-- ============================================

-- Rimuovi tutte le policy esistenti per manager_services
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'manager_services'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.manager_services', policy_record.policyname);
        RAISE NOTICE 'Rimossa policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Disabilita RLS temporaneamente
ALTER TABLE public.manager_services DISABLE ROW LEVEL SECURITY;

-- Verifica stato
SELECT 
    'RLS STATUS' as info,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'manager_services';

-- Verifica struttura tabella
SELECT 
    'COLONNE MANAGER_SERVICES' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'manager_services'
ORDER BY ordinal_position;


