-- ============================================
-- REFRESH POSTGREST CACHE
-- ============================================
-- Questo script forza PostgREST ad aggiornare la cache dello schema
-- ============================================

-- Notifica PostgREST di ricar icare lo schema
NOTIFY pgrst, 'reload schema';

-- Verifica che le colonne esistano
SELECT 
  'posts' AS table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'posts'
  AND column_name IN ('creator_id', 'media_url', 'likes_count')

UNION ALL

SELECT 
  'properties' AS table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'properties'
  AND column_name IN ('owner_id', 'title', 'location_data', 'available_for_collab')

UNION ALL

SELECT 
  'profiles' AS table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('onboarding_status', 'onboarding_completed');

-- ============================================
-- FINE
-- ============================================





