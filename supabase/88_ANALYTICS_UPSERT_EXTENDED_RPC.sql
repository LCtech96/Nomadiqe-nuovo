-- Estende RPC upsert per supportare tutte le categorie analitiche
-- PREREQUISITO: 87_ANALYTICS_EXTENDED_CATEGORIES.sql
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_creator_onboarding_analytics(
  p_user_id UUID,
  p_period TEXT, -- '90'|'30'|'7'|'views_pie'|'accounts_reached'|'reels_content'|'posts_content'|'stories_content'|'profile_activity'|'profile_visits'|'external_links'|'audience_30'|'audience_7'
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
  v_col := CASE p_period
    WHEN '90' THEN 'analytics_90_days_urls'
    WHEN '30' THEN 'analytics_30_days_urls'
    WHEN '7' THEN 'analytics_7_days_urls'
    WHEN 'views_pie' THEN 'views_pie_chart_urls'
    WHEN 'accounts_reached' THEN 'accounts_reached_urls'
    WHEN 'reels_content' THEN 'reels_content_urls'
    WHEN 'posts_content' THEN 'posts_content_urls'
    WHEN 'stories_content' THEN 'stories_content_urls'
    WHEN 'profile_activity' THEN 'profile_activity_urls'
    WHEN 'profile_visits' THEN 'profile_visits_urls'
    WHEN 'external_links' THEN 'external_links_taps_urls'
    WHEN 'audience_30' THEN 'audience_demographics_30_urls'
    WHEN 'audience_7' THEN 'audience_demographics_7_urls'
    ELSE NULL
  END;

  IF v_col IS NULL THEN
    RAISE EXCEPTION 'period non valido: %', p_period;
  END IF;

  EXECUTE format(
    'INSERT INTO public.creator_onboarding (user_id, %I) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET %I = EXCLUDED.%I, updated_at = NOW()',
    v_col, v_col, v_col
  ) USING p_user_id, p_urls;
END;
$$;

COMMENT ON FUNCTION public.upsert_creator_onboarding_analytics IS 'Upsert analytics screenshot URLs per creator. Supporta 90|30|7 e categorie estese (views_pie, accounts_reached, reels_content, posts_content, stories_content, profile_activity, profile_visits, external_links, audience_30, audience_7).';

GRANT EXECUTE ON FUNCTION public.upsert_creator_onboarding_analytics TO service_role;
