-- ============================================
-- VERIFICA UTENTI MANCANTI IN auth.users
-- ============================================
-- Questo script verifica quali utenti esistono in public.profiles
-- ma NON esistono in auth.users
-- ============================================

-- Query per vedere gli utenti che esistono in profiles ma non in auth.users
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.username,
  p.role,
  p.created_at as profile_created_at,
  CASE 
    WHEN u.id IS NULL THEN '❌ MANCA IN auth.users'
    ELSE '✅ ESISTE IN auth.users'
  END as stato_auth,
  u.email_confirmed_at,
  u.created_at as auth_created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY 
  CASE WHEN u.id IS NULL THEN 0 ELSE 1 END, -- Prima quelli mancanti
  p.created_at DESC;

-- ============================================
-- RISULTATO ATTESO:
-- ============================================
-- Se vedi utenti con "❌ MANCA IN auth.users", 
-- questi utenti NON possono fare login o reset password
-- perché non esistono nel sistema di autenticazione.
-- ============================================
-- SOLUZIONE:
-- ============================================
-- Per creare questi utenti in auth.users, devi:
-- 1. Usare l'endpoint API /api/admin/create-missing-users
-- 2. Oppure creare manualmente gli utenti tramite Supabase Dashboard
-- 3. Gli utenti dovranno poi usare "Password dimenticata" per impostare la password
-- ============================================
