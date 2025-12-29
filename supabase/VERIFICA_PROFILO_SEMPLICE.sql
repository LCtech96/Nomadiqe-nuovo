-- ============================================
-- VERIFICA PROFILO - VERSIONE SEMPLICE
-- ============================================
-- Modifica l'email alla riga 5 e esegui la query
-- ============================================

-- MODIFICA QUI l'email da cercare
WITH user_check AS (
  SELECT 
    id,
    email,
    created_at as user_created_at
  FROM auth.users
  WHERE email = 'lucacorrao1996@gmail.com'  -- MODIFICA QUI
)
SELECT 
  uc.id as user_id,
  uc.email,
  uc.user_created_at,
  p.id as profile_id,
  p.username,
  p.full_name,
  p.role,
  p.avatar_url,
  p.bio,
  p.created_at as profile_created_at,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ PROFILO ESISTE'
    ELSE '❌ PROFILO NON ESISTE - Completa l''onboarding!'
  END as stato
FROM user_check uc
LEFT JOIN public.profiles p ON uc.id = p.id;





