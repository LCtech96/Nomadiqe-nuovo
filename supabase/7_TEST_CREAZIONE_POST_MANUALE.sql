-- ============================================
-- TEST CREAZIONE POST MANUALE
-- ============================================
-- Testiamo se puoi creare un post manualmente
-- ============================================

-- Trova il tuo user ID
SELECT 
    '🔍 TUO USER ID' as info,
    id as user_id
FROM auth.users 
WHERE email = 'lucacorrao1996@gmail.com';

-- Prova a inserire un post di test
INSERT INTO public.posts (
    author_id,
    content,
    images,
    created_at,
    updated_at
)
SELECT 
    id,
    'Post di test manuale',
    ARRAY[]::TEXT[],
    NOW(),
    NOW()
FROM auth.users 
WHERE email = 'lucacorrao1996@gmail.com'
RETURNING id, author_id, content, created_at;

-- Verifica che il post sia stato creato
SELECT 
    '✅ POST CREATO' as info,
    id,
    author_id,
    content,
    created_at
FROM public.posts
WHERE author_id IN (
    SELECT id FROM auth.users WHERE email = 'lucacorrao1996@gmail.com'
)
ORDER BY created_at DESC
LIMIT 1;

