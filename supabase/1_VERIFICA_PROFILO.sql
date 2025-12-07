-- ============================================
-- PASSO 1: VERIFICA PROFILO
-- ============================================

SELECT 
    id,
    email,
    username,
    full_name,
    role,
    onboarding_completed,
    created_at
FROM public.profiles 
WHERE email = 'lucacorrao1996@gmail.com';

