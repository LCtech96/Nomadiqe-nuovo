-- ============================================
-- Fix: get_hosts_in_area "ORDER BY expressions must appear in select list"
-- ============================================
-- Con SELECT DISTINCT, tutte le espressioni in ORDER BY devono essere
-- nella select list. Usiamo una CTE con sort_prio in SELECT, poi
-- ritorniamo solo le 7 colonne e ordiniamo per sort_prio.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_hosts_in_area(city_param TEXT DEFAULT NULL, country_param TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  country TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT DISTINCT
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.bio,
      prop.city,
      prop.country,
      (CASE WHEN city_param IS NOT NULL AND prop.city = city_param THEN 0 ELSE 1 END) AS sort_prio
    FROM public.profiles p
    JOIN public.properties prop ON prop.owner_id = p.id
    WHERE p.role = 'host'
      AND prop.is_active = true
      AND p.id != auth.uid()
      AND (country_param IS NULL OR prop.country = country_param)
  )
  SELECT r.id, r.username, r.full_name, r.avatar_url, r.bio, r.city, r.country
  FROM ranked r
  ORDER BY r.sort_prio, r.full_name, r.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';
