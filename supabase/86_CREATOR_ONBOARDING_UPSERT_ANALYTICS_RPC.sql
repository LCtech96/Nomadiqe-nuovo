-- RPC per upsert analytics screenshots (bypassa RLS)
-- Chiamato dall'API server-side dopo verifica sessione
-- PREREQUISITO: eseguire prima 85_ANALYTICS_SCREENSHOTS_BY_PERIOD.sql
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_creator_onboarding_analytics(
  p_user_id UUID,
  p_period TEXT, -- '90', '30', '7'
  p_urls TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col TEXT;
BEGIN
  IF p_period NOT IN ('90', '30', '7') THEN
    RAISE EXCEPTION 'period deve essere 90, 30 o 7';
  END IF;

  v_col := CASE p_period
    WHEN '90' THEN 'analytics_90_days_urls'
    WHEN '30' THEN 'analytics_30_days_urls'
    WHEN '7' THEN 'analytics_7_days_urls'
  END;

  EXECUTE format(
    'INSERT INTO public.creator_onboarding (user_id, %I) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET %I = EXCLUDED.%I, updated_at = NOW()',
    v_col, v_col, v_col
  ) USING p_user_id, p_urls;
END;
$$;

COMMENT ON FUNCTION public.upsert_creator_onboarding_analytics IS 'Upsert analytics screenshot URLs per creator. SECURITY DEFINER per bypassare RLS. Chiamare solo da API server-side.';

GRANT EXECUTE ON FUNCTION public.upsert_creator_onboarding_analytics TO service_role;
