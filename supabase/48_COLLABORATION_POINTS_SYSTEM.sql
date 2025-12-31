-- ============================================
-- SISTEMA PUNTI PER COLLABORAZIONI KOL&BED
-- ============================================
-- Quando un host accetta una collaborazione FREE STAY:
-- - Host guadagna 500 punti per ogni giorno gratuito offerto + 500 punti dal creator
-- - Creator paga 2000 punti totali (500 all'host, 1500 consumati dalla piattaforma)
-- ============================================

-- Funzione per calcolare i giorni gratuiti da una collaborazione
CREATE OR REPLACE FUNCTION public.calculate_free_stay_nights(collab_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_nights INTEGER;
  v_host_id UUID;
  v_nights_from_prefs INTEGER;
BEGIN
  -- Ottieni start_date, end_date e host_id dalla collaborazione
  SELECT start_date, end_date, host_id
  INTO v_start_date, v_end_date, v_host_id
  FROM public.collaborations
  WHERE id = collab_id;
  
  -- Se ci sono start_date e end_date, calcola la differenza
  IF v_start_date IS NOT NULL AND v_end_date IS NOT NULL THEN
    v_nights := GREATEST(1, v_end_date - v_start_date);
  ELSE
    -- Altrimenti usa nights_per_collaboration dalle preferenze host
    SELECT COALESCE(nights_per_collaboration, 0)
    INTO v_nights_from_prefs
    FROM public.host_kol_bed_preferences
    WHERE host_id = v_host_id;
    
    v_nights := GREATEST(1, v_nights_from_prefs);
  END IF;
  
  RETURN v_nights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per assegnare punti quando una collaborazione viene accettata
CREATE OR REPLACE FUNCTION public.on_collaboration_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_free_nights INTEGER;
  v_host_points INTEGER;
  v_creator_points_to_deduct INTEGER := 2000;
  v_host_points_from_creator INTEGER := 500;
  v_platform_points INTEGER := 1500;
  v_host_current_points INTEGER;
  v_creator_current_points INTEGER;
BEGIN
  -- Solo quando lo status cambia a 'accepted' e il tipo è 'free_stay'
  IF NEW.status = 'accepted' 
     AND (OLD.status IS NULL OR OLD.status != 'accepted')
     AND NEW.collaboration_type = 'free_stay' THEN
    
    -- Calcola i giorni gratuiti
    v_free_nights := public.calculate_free_stay_nights(NEW.id);
    
    -- Calcola i punti per l'host: 500 per ogni giorno + 500 dal creator
    v_host_points := (500 * v_free_nights) + v_host_points_from_creator;
    
    -- Verifica che non ci siano già punti assegnati per questa collaborazione
    IF EXISTS (
      SELECT 1 FROM public.points_history
      WHERE related_id = NEW.id
        AND action_type = 'kol_bed_collaboration'
    ) THEN
      -- Punti già assegnati, esci
      RETURN NEW;
    END IF;
    
    -- Verifica che il creator abbia abbastanza punti
    SELECT COALESCE(points, 0) INTO v_creator_current_points
    FROM public.profiles
    WHERE id = NEW.creator_id;
    
    IF v_creator_current_points < v_creator_points_to_deduct THEN
      -- Creator non ha abbastanza punti, blocca l'accettazione della collaborazione
      -- L'API route si occuperà di validare prima, ma questo è un doppio controllo
      RAISE EXCEPTION 'Creator non ha abbastanza punti per accettare questa collaborazione. Necessari: %, disponibili: %', 
        v_creator_points_to_deduct, v_creator_current_points;
    END IF;
    
    -- Ottieni i punti attuali dell'host
    SELECT COALESCE(points, 0) INTO v_host_current_points
    FROM public.profiles
    WHERE id = NEW.host_id;
    
    -- Assegna punti all'host
    INSERT INTO public.points_history (
      user_id,
      points,
      action_type,
      description,
      related_id,
      related_type
    )
    VALUES (
      NEW.host_id,
      v_host_points,
      'kol_bed_collaboration',
      format('Collaborazione KOL&BED accettata: %s giorni gratuiti + bonus creator', v_free_nights),
      NEW.id,
      'collaboration'
    );
    
    -- Aggiorna i punti dell'host
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_host_points
    WHERE id = NEW.host_id;
    
    -- Deduci punti dal creator
    INSERT INTO public.points_history (
      user_id,
      points,
      action_type,
      description,
      related_id,
      related_type
    )
    VALUES (
      NEW.creator_id,
      -v_creator_points_to_deduct,
      'kol_bed_collaboration_payment',
      format('Pagamento collaborazione KOL&BED: %s giorni gratuiti (500 punti all''host, 1500 alla piattaforma)', v_free_nights),
      NEW.id,
      'collaboration'
    );
    
    -- Aggiorna i punti del creator (deduci)
    UPDATE public.profiles
    SET points = GREATEST(0, COALESCE(points, 0) - v_creator_points_to_deduct)
    WHERE id = NEW.creator_id;
    
    -- I 1500 punti "consumati" dalla piattaforma non vengono assegnati a nessuno
    -- Sono semplicemente dedotti dal creator e non assegnati all'host
    
    RAISE NOTICE 'Punti assegnati: Host % ha guadagnato % punti, Creator % ha perso % punti', 
      NEW.host_id, v_host_points, NEW.creator_id, v_creator_points_to_deduct;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crea il trigger
DROP TRIGGER IF EXISTS trigger_on_collaboration_accepted ON public.collaborations;
CREATE TRIGGER trigger_on_collaboration_accepted
  AFTER INSERT OR UPDATE OF status ON public.collaborations
  FOR EACH ROW
  EXECUTE FUNCTION public.on_collaboration_accepted();

-- Commenti per documentazione
COMMENT ON FUNCTION public.calculate_free_stay_nights(UUID) IS 'Calcola i giorni gratuiti di una collaborazione FREE STAY basandosi su start_date/end_date o sulle preferenze host';
COMMENT ON FUNCTION public.on_collaboration_accepted() IS 'Assegna punti quando una collaborazione FREE STAY viene accettata: Host guadagna 500 punti per giorno + 500 dal creator, Creator paga 2000 punti totali';

-- Notifica PostgREST per ricaricare lo schema
NOTIFY pgrst, 'reload schema';

