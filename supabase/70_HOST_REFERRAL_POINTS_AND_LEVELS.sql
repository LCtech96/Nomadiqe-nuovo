-- ============================================
-- SISTEMA PUNTI E LIVELLI PER REFERRAL HOST
-- ============================================
-- Assegna punti e aggiorna livelli quando un host si registra tramite referral
-- ============================================

-- 1. FUNZIONE PER REGISTRARE REFERRAL HOST E ASSEGNARE PUNTI
-- ============================================
CREATE OR REPLACE FUNCTION public.register_host_referral_with_points(
  referral_code_param TEXT,
  referred_host_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_host_id_val UUID;
  referral_code_id_val UUID;
  referral_exists BOOLEAN;
BEGIN
  -- Trova il referrer Host dal codice referral
  SELECT hrc.host_id, hrc.id INTO referrer_host_id_val, referral_code_id_val
  FROM public.host_referral_codes hrc
  WHERE hrc.referral_code = referral_code_param 
    AND hrc.is_active = TRUE
  LIMIT 1;
  
  -- Se non trova il codice, esci
  IF referrer_host_id_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica che non sia un auto-referral
  IF referrer_host_id_val = referred_host_id_param THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica se esiste già un referral per questo host
  SELECT EXISTS(
    SELECT 1 FROM public.host_referrals
    WHERE profile_id = referred_host_id_param
      AND host_id = referrer_host_id_val
  ) INTO referral_exists;
  
  -- Se esiste già, non fare nulla
  IF referral_exists THEN
    RETURN TRUE;
  END IF;
  
  -- Crea o aggiorna il record di referral
  INSERT INTO public.host_referrals (
    referral_code_id,
    host_id,
    profile_id,
    status,
    profile_created_at
  ) VALUES (
    referral_code_id_val,
    referrer_host_id_val,
    referred_host_id_param,
    'profile_created',
    NOW()
  )
  ON CONFLICT (profile_id) DO UPDATE
  SET 
    status = 'profile_created',
    profile_created_at = NOW(),
    updated_at = NOW()
  WHERE host_referrals.profile_id = referred_host_id_param;
  
  -- Aggiorna il contatore active_invites
  UPDATE public.host_referral_codes
  SET active_invites = (
    SELECT COUNT(*) 
    FROM public.host_referrals 
    WHERE referral_code_id = host_referral_codes.id 
      AND status IN ('waitlist_registered', 'approved', 'profile_created', 'first_booking_received')
  )
  WHERE id = referral_code_id_val;
  
  -- Assegna punti al referrer host (1000 XP per ogni host invitato che completa la registrazione)
  PERFORM public.award_xp(
    referrer_host_id_val,
    1000,
    'referral_host',
    'Host invitato completato registrazione',
    referred_host_id_param,
    'user',
    FALSE,
    NULL
  );
  
  -- Crea notifica per il referrer
  INSERT INTO public.pending_notifications (
    user_id,
    notification_type,
    title,
    message,
    url,
    data
  ) VALUES (
    referrer_host_id_val,
    'referral',
    '🎉 Nuovo host invitato!',
    'Un host che hai invitato ha completato la registrazione. Hai guadagnato 1000 XP!',
    '/dashboard/host',
    jsonb_build_object(
      'type', 'host_referral_completed',
      'referred_host_id', referred_host_id_param,
      'xp_earned', 1000
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER PER REGISTRARE REFERRAL QUANDO UN HOST COMPLETA L'ONBOARDING
-- ============================================
CREATE OR REPLACE FUNCTION public.on_host_onboarding_completed_referral()
RETURNS TRIGGER AS $$
DECLARE
  referral_code_used TEXT;
BEGIN
  -- Verifica se l'utente è un host
  IF NEW.role != 'host' THEN
    RETURN NEW;
  END IF;
  
  -- Verifica se l'onboarding è stato completato
  IF NEW.onboarding_completed = TRUE AND (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = FALSE) THEN
    -- Cerca se c'è un referral code salvato nel localStorage o nel profilo
    -- Per ora, controlliamo se c'è un referral code associato alla registrazione
    -- Questo verrà gestito dal frontend che chiamerà la funzione dopo la registrazione
    
    -- Verifica se esiste un referral code nella tabella host_referrals per questo profilo
    -- Se esiste già un referral registrato, non fare nulla
    IF NOT EXISTS (
      SELECT 1 FROM public.host_referrals
      WHERE profile_id = NEW.id
        AND status = 'profile_created'
    ) THEN
      -- Il referral verrà registrato dal frontend quando l'utente si registra con il codice
      -- Questo trigger serve solo come backup
      RETURN NEW;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_host_onboarding_completed_referral ON public.profiles;
CREATE TRIGGER trigger_on_host_onboarding_completed_referral
  AFTER UPDATE OF onboarding_completed ON public.profiles
  FOR EACH ROW
  WHEN (NEW.role = 'host' AND NEW.onboarding_completed = TRUE AND (OLD.onboarding_completed IS NULL OR OLD.onboarding_completed = FALSE))
  EXECUTE FUNCTION public.on_host_onboarding_completed_referral();

-- 3. FUNZIONE PER AGGIORNARE LIVELLI HOST BASATI SUI REFERRAL
-- ============================================
CREATE OR REPLACE FUNCTION public.update_host_level_from_referrals(p_host_id UUID)
RETURNS VOID AS $$
DECLARE
  total_referrals INTEGER;
  current_level INTEGER;
  new_level INTEGER;
BEGIN
  -- Conta i referral completati (host che hanno completato la registrazione)
  SELECT COUNT(*) INTO total_referrals
  FROM public.host_referrals
  WHERE host_id = p_host_id
    AND status = 'profile_created';
  
  -- Recupera il livello corrente
  SELECT COALESCE(current_tier, 1) INTO current_level
  FROM public.profiles
  WHERE id = p_host_id;
  
  -- Calcola il nuovo livello basato sui referral
  -- Ogni 5 referral completati = +1 livello (max livello 10)
  new_level := LEAST(1 + (total_referrals / 5), 10);
  
  -- Se il nuovo livello è maggiore del corrente, aggiorna
  IF new_level > current_level THEN
    UPDATE public.profiles
    SET current_tier = new_level
    WHERE id = p_host_id;
    
    -- Crea notifica per il cambio livello
    INSERT INTO public.pending_notifications (
      user_id,
      notification_type,
      title,
      message,
      url,
      data
    ) VALUES (
      p_host_id,
      'level_up',
      '🎉 Livello aumentato!',
      'Hai raggiunto il livello ' || new_level || ' grazie ai tuoi referral!',
      '/dashboard/host',
      jsonb_build_object(
        'type', 'host_level_up',
        'new_level', new_level,
        'total_referrals', total_referrals
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. TRIGGER PER AGGIORNARE LIVELLO QUANDO UN REFERRAL VIENE COMPLETATO
-- ============================================
CREATE OR REPLACE FUNCTION public.on_host_referral_completed_update_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando un referral viene completato (status = 'profile_created')
  IF NEW.status = 'profile_created' AND (OLD.status IS NULL OR OLD.status != 'profile_created') THEN
    -- Aggiorna il livello del referrer host
    PERFORM public.update_host_level_from_referrals(NEW.host_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_host_referral_completed_update_level ON public.host_referrals;
CREATE TRIGGER trigger_on_host_referral_completed_update_level
  AFTER INSERT OR UPDATE OF status ON public.host_referrals
  FOR EACH ROW
  WHEN (NEW.status = 'profile_created')
  EXECUTE FUNCTION public.on_host_referral_completed_update_level();

-- 5. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION public.register_host_referral_with_points(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_host_level_from_referrals(UUID) TO authenticated;

-- 6. COMMENTI PER DOCUMENTAZIONE
-- ============================================
COMMENT ON FUNCTION public.register_host_referral_with_points(TEXT, UUID) IS 'Registra un referral host e assegna 1000 XP al referrer quando un host completa la registrazione';
COMMENT ON FUNCTION public.update_host_level_from_referrals(UUID) IS 'Aggiorna il livello di un host basandosi sul numero di referral completati (1 livello ogni 5 referral)';
COMMENT ON FUNCTION public.on_host_onboarding_completed_referral() IS 'Trigger che verifica se un host ha completato l''onboarding e se c''è un referral da registrare';

-- ============================================
-- FINE SCRIPT
-- ============================================
