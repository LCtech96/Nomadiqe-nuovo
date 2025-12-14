-- ============================================
-- FIX COMPLETO - Tutti i problemi di lucacorrao1996@gmail.com
-- ============================================
-- 1. Fix profilo
-- 2. Fix RLS policies per posts
-- 3. Fix RLS policies per profiles
-- ============================================

-- PASSO 1: Assicura che il profilo sia corretto
DO $$
DECLARE
    user_id_var UUID;
BEGIN
    -- Trova l'ID utente
    SELECT id INTO user_id_var
    FROM auth.users
    WHERE email = 'lucacorrao1996@gmail.com';

    IF user_id_var IS NULL THEN
        RAISE EXCEPTION 'Utente con email lucacorrao1996@gmail.com non trovato';
    END IF;

    RAISE NOTICE 'Utente trovato con ID: %', user_id_var;

    -- Aggiorna o inserisci profilo
    INSERT INTO public.profiles (
        id,
        email,
        username,
        full_name,
        role,
        onboarding_completed,
        created_at,
        updated_at
    ) VALUES (
        user_id_var,
        'lucacorrao1996@gmail.com',
        'lucacorrao1996',
        'Luca Corrao',
        'host',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'host',
        email = 'lucacorrao1996@gmail.com',
        onboarding_completed = true,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Profilo aggiornato/creato';
END $$;

-- PASSO 2: Fix RLS Policies per POSTS
-- Disabilita RLS temporaneamente
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- Rimuovi tutte le policy esistenti per posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Ricrea policies semplici e funzionanti
CREATE POLICY "Anyone can view posts"
ON public.posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own posts"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

-- Riabilita RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- PASSO 3: Fix RLS Policies per PROFILES
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Rimuovi policies esistenti
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Ricrea policies
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Refresh cache PostgREST
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- PASSO 5: Verifica il risultato
SELECT 
    '✅ PROFILO' as tipo,
    id,
    email,
    username,
    full_name,
    role,
    onboarding_completed
FROM public.profiles 
WHERE email = 'lucacorrao1996@gmail.com';

-- Verifica policies posts
SELECT 
    '✅ POLICIES POSTS' as tipo,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'posts'
ORDER BY policyname;

-- Verifica policies profiles
SELECT 
    '✅ POLICIES PROFILES' as tipo,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;


