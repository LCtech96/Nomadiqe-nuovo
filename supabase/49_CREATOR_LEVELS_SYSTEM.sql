-- ============================================
-- SISTEMA LIVELLI PER CREATORS
-- ============================================
-- Aggiunge un sistema di livellamento per i creators basato su:
-- - Punti accumulati (points)
-- - Collaborazioni completate
-- - Post pubblicati
-- - Totale follower (da creator_manual_analytics o social_accounts)
-- ============================================

-- Aggiungi colonna creator_level a profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'creator_level'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN creator_level TEXT DEFAULT 'Starter' 
    CHECK (creator_level IN ('Starter', 'Rising', 'Influencer', 'Elite', 'Icon'));
    RAISE NOTICE 'Colonna creator_level aggiunta a profiles';
  END IF;
END $$;

-- Crea indice per performance
CREATE INDEX IF NOT EXISTS idx_profiles_creator_level ON public.profiles(creator_level) WHERE role = 'creator';

-- Funzione per calcolare il livello creator basato su metriche
CREATE OR REPLACE FUNCTION public.calculate_creator_level(creator_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  v_points INTEGER := 0;
  v_collaborations_completed INTEGER := 0;
  v_posts_count INTEGER := 0;
  v_total_followers INTEGER := 0;
  v_level TEXT := 'Starter';
BEGIN
  -- Ottieni punti del creator
  SELECT COALESCE(points, 0) INTO v_points
  FROM public.profiles
  WHERE id = creator_id_param AND role = 'creator';
  
  IF v_points IS NULL THEN
    RETURN 'Starter';
  END IF;
  
  -- Conta collaborazioni completate
  SELECT COUNT(*) INTO v_collaborations_completed
  FROM public.collaborations
  WHERE creator_id = creator_id_param
    AND status = 'completed';
  
  -- Conta post pubblicati
  SELECT COUNT(*) INTO v_posts_count
  FROM public.posts
  WHERE author_id = creator_id_param;
  
  -- Ottieni totale follower (da creator_manual_analytics o social_accounts)
  SELECT COALESCE(
    (SELECT total_followers FROM public.creator_manual_analytics WHERE creator_id = creator_id_param),
    (SELECT SUM(follower_count) FROM public.social_accounts WHERE user_id = creator_id_param),
    0
  ) INTO v_total_followers;
  
  -- Calcola livello basato su combinazione di metriche
  -- ICON: Punti molto alti (>10000) + molte collaborazioni (>10) + molti post (>100) + molti follower (>100k)
  IF v_points >= 10000 AND v_collaborations_completed >= 10 AND v_posts_count >= 100 AND v_total_followers >= 100000 THEN
    v_level := 'Icon';
  -- ELITE: Punti alti (>5000) + collaborazioni (>5) + post (>50) + follower (>50k)
  ELSIF v_points >= 5000 AND v_collaborations_completed >= 5 AND v_posts_count >= 50 AND v_total_followers >= 50000 THEN
    v_level := 'Elite';
  -- INFLUENCER: Punti buoni (>2000) + collaborazioni (>2) + post (>25) + follower (>10k)
  ELSIF v_points >= 2000 AND v_collaborations_completed >= 2 AND v_posts_count >= 25 AND v_total_followers >= 10000 THEN
    v_level := 'Influencer';
  -- RISING: Punti decenti (>500) + almeno 1 collaborazione o 10 post o 1k follower
  ELSIF v_points >= 500 AND (v_collaborations_completed >= 1 OR v_posts_count >= 10 OR v_total_followers >= 1000) THEN
    v_level := 'Rising';
  -- STARTER: Livello base per tutti i nuovi creator
  ELSE
    v_level := 'Starter';
  END IF;
  
  RETURN v_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per aggiornare il livello creator
CREATE OR REPLACE FUNCTION public.update_creator_level(creator_id_param UUID)
RETURNS VOID AS $$
DECLARE
  new_level TEXT;
  current_level TEXT;
BEGIN
  -- Verifica che sia un creator
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = creator_id_param AND role = 'creator'
  ) THEN
    RETURN;
  END IF;
  
  -- Calcola nuovo livello
  new_level := public.calculate_creator_level(creator_id_param);
  
  -- Ottieni livello attuale
  SELECT COALESCE(creator_level, 'Starter') INTO current_level
  FROM public.profiles
  WHERE id = creator_id_param;
  
  -- Aggiorna solo se è cambiato
  IF new_level != current_level THEN
    UPDATE public.profiles
    SET creator_level = new_level
    WHERE id = creator_id_param;
    
    RAISE NOTICE 'Creator % livello aggiornato da % a %', creator_id_param, current_level, new_level;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per aggiornare automaticamente il livello quando cambiano metriche rilevanti
CREATE OR REPLACE FUNCTION public.on_creator_metrics_changed()
RETURNS TRIGGER AS $$
BEGIN
  -- Se è un creator, aggiorna il livello
  IF (TG_TABLE_NAME = 'profiles' AND NEW.role = 'creator') OR
     (TG_TABLE_NAME = 'collaborations' AND NEW.creator_id IS NOT NULL) OR
     (TG_TABLE_NAME = 'posts' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.author_id AND role = 'creator')) OR
     (TG_TABLE_NAME = 'creator_manual_analytics' AND NEW.creator_id IS NOT NULL) OR
     (TG_TABLE_NAME = 'social_accounts' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND role = 'creator')) OR
     (TG_TABLE_NAME = 'points_history' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND role = 'creator')) THEN
    
    DECLARE
      creator_id_to_update UUID;
    BEGIN
      -- Determina creator_id in base alla tabella
      CASE TG_TABLE_NAME
        WHEN 'profiles' THEN
          creator_id_to_update := NEW.id;
        WHEN 'collaborations' THEN
          creator_id_to_update := NEW.creator_id;
        WHEN 'posts' THEN
          creator_id_to_update := NEW.author_id;
        WHEN 'creator_manual_analytics' THEN
          creator_id_to_update := NEW.creator_id;
        WHEN 'social_accounts' THEN
          creator_id_to_update := NEW.user_id;
        WHEN 'points_history' THEN
          creator_id_to_update := NEW.user_id;
        ELSE
          creator_id_to_update := NULL;
      END CASE;
      
      IF creator_id_to_update IS NOT NULL THEN
        PERFORM public.update_creator_level(creator_id_to_update);
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crea trigger per aggiornare livello quando cambiano i punti
DROP TRIGGER IF EXISTS trigger_update_creator_level_on_points ON public.profiles;
CREATE TRIGGER trigger_update_creator_level_on_points
  AFTER UPDATE OF points ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'creator' AND (OLD.points IS DISTINCT FROM NEW.points))
  EXECUTE FUNCTION public.on_creator_metrics_changed();

-- Crea trigger per aggiornare livello quando cambiano le collaborazioni
DROP TRIGGER IF EXISTS trigger_update_creator_level_on_collaborations ON public.collaborations;
CREATE TRIGGER trigger_update_creator_level_on_collaborations
  AFTER INSERT OR UPDATE OF status ON public.collaborations
  FOR EACH ROW
  WHEN (NEW.creator_id IS NOT NULL AND (NEW.status = 'completed' OR OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.on_creator_metrics_changed();

-- Crea trigger per aggiornare livello quando vengono pubblicati post
DROP TRIGGER IF EXISTS trigger_update_creator_level_on_posts ON public.posts;
CREATE TRIGGER trigger_update_creator_level_on_posts
  AFTER INSERT ON public.posts
  FOR EACH ROW
  WHEN (EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.author_id AND role = 'creator'))
  EXECUTE FUNCTION public.on_creator_metrics_changed();

-- Crea trigger per aggiornare livello quando cambiano le analitiche
DROP TRIGGER IF EXISTS trigger_update_creator_level_on_analytics ON public.creator_manual_analytics;
CREATE TRIGGER trigger_update_creator_level_on_analytics
  AFTER INSERT OR UPDATE OF total_followers ON public.creator_manual_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.on_creator_metrics_changed();

-- Crea trigger per aggiornare livello quando cambiano i follower social
DROP TRIGGER IF EXISTS trigger_update_creator_level_on_social ON public.social_accounts;
CREATE TRIGGER trigger_update_creator_level_on_social
  AFTER INSERT OR UPDATE OF follower_count ON public.social_accounts
  FOR EACH ROW
  WHEN (EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND role = 'creator'))
  EXECUTE FUNCTION public.on_creator_metrics_changed();

-- Crea trigger per aggiornare livello quando vengono assegnati punti
DROP TRIGGER IF EXISTS trigger_update_creator_level_on_points_history ON public.points_history;
CREATE TRIGGER trigger_update_creator_level_on_points_history
  AFTER INSERT ON public.points_history
  FOR EACH ROW
  WHEN (EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND role = 'creator'))
  EXECUTE FUNCTION public.on_creator_metrics_changed();

-- Funzione per aggiornare tutti i livelli creator esistenti (da eseguire una volta)
CREATE OR REPLACE FUNCTION public.update_all_creator_levels()
RETURNS INTEGER AS $$
DECLARE
  creator_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR creator_record IN 
    SELECT id FROM public.profiles WHERE role = 'creator'
  LOOP
    PERFORM public.update_creator_level(creator_record.id);
    updated_count := updated_count + 1;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commenti per documentazione
COMMENT ON COLUMN public.profiles.creator_level IS 'Livello del creator basato su punti, collaborazioni, post e follower: Starter, Rising, Influencer, Elite, Icon';
COMMENT ON FUNCTION public.calculate_creator_level(UUID) IS 'Calcola il livello creator basato su metriche aggregate (punti, collaborazioni, post, follower)';
COMMENT ON FUNCTION public.update_creator_level(UUID) IS 'Aggiorna il livello creator se necessario';
COMMENT ON FUNCTION public.update_all_creator_levels() IS 'Aggiorna i livelli di tutti i creators esistenti';

-- Notifica PostgREST per ricaricare lo schema
NOTIFY pgrst, 'reload schema';

