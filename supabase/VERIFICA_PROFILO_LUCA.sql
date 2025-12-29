-- ============================================
-- VERIFICA COMPLETA PROFILO lucacorrao1996@gmail.com
-- ============================================

-- 1. Verifica utente in auth.users
SELECT 
    'AUTH USERS' as tabella,
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'lucacorrao1996@gmail.com';

-- 2. Verifica profilo in public.profiles
SELECT 
    'PROFILES' as tabella,
    id,
    email,
    username,
    full_name,
    role,
    avatar_url,
    onboarding_completed,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'lucacorrao1996@gmail.com';

-- 3. Verifica proprietà
SELECT 
    'PROPERTIES' as tabella,
    COUNT(*) as numero_strutture
FROM public.properties 
WHERE owner_id IN (
    SELECT id FROM public.profiles WHERE email = 'lucacorrao1996@gmail.com'
);

-- 4. Mostra dettaglio proprietà
SELECT 
    id,
    name,
    title,
    city,
    country,
    created_at
FROM public.properties 
WHERE owner_id IN (
    SELECT id FROM public.profiles WHERE email = 'lucacorrao1996@gmail.com'
)
ORDER BY created_at DESC;



