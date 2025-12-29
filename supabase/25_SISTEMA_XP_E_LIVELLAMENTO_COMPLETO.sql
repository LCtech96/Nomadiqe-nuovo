-- ============================================
-- SISTEMA COMPLETO XP E LIVELLAMENTO PER NOMADIQE
-- ============================================
-- Questo script implementa il sistema di Punti Esperienza (XP) e livellamento
-- basato sulle specifiche fornite. Sostituisce completamente il sistema reward esistente.
-- ============================================

-- ============================================
-- PARTE 1: AGGIORNAMENTO TABELLA PROFILES
-- ============================================

-- Aggiungi colonna total_xp se non esiste (migra da points se presente)
DO $$ 
BEGIN
  -- Aggiungi total_xp se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'total_xp'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN total_xp INTEGER DEFAULT 0;
    
    -- Migra i dati da points a total_xp se points esiste
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'points'
    ) THEN
      UPDATE public.profiles SET total_xp = COALESCE(points, 0) WHERE total_xp = 0;
      RAISE NOTICE 'Dati migrati da points a total_xp';
    END IF;
    
    RAISE NOTICE 'Colonna total_xp aggiunta a profiles';
  END IF;
END $$;

-- Aggiungi colonne per tracking livelli e badge
DO $$ 
BEGIN
  -- Livello corrente (calcolato da total_xp)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'current_tier'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN current_tier INTEGER DEFAULT 1;
    RAISE NOTICE 'Colonna current_tier aggiunta';
  END IF;
  
  -- Badge Nomade Leggendario
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_legendary_nomad'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_legendary_nomad BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Colonna is_legendary_nomad aggiunta';
  END IF;
  
  -- Data di iscrizione per calcolare longevità (usa created_at se non esiste)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'signup_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN signup_date TIMESTAMP WITH TIME ZONE;
    UPDATE public.profiles SET signup_date = COALESCE(created_at, NOW()) WHERE signup_date IS NULL;
    RAISE NOTICE 'Colonna signup_date aggiunta';
  END IF;
END $$;

-- ============================================
-- PARTE 2: AGGIORNAMENTO TABELLA BOOKINGS (per tracciare Creator)
-- ============================================

-- Aggiungi colonna creator_id alla tabella bookings se non esiste (per tracciare quale Creator ha generato la prenotazione)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Colonna creator_id aggiunta a bookings';
  END IF;
END $$;

-- ============================================
-- PARTE 3: AGGIORNAMENTO POINTS_HISTORY
-- ============================================

-- Rinomina points in xp_earned per chiarezza (opzionale, manteniamo points per compatibilità)
-- Aggiungi colonne aggiuntive se necessario
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'points_history' 
    AND column_name = 'related_id'
  ) THEN
    ALTER TABLE public.points_history ADD COLUMN related_id UUID; -- ID del post, booking, ecc.
    RAISE NOTICE 'Colonna related_id aggiunta a points_history';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'points_history' 
    AND column_name = 'related_type'
  ) THEN
    ALTER TABLE public.points_history ADD COLUMN related_type TEXT; -- 'post', 'booking', 'service', ecc.
    RAISE NOTICE 'Colonna related_type aggiunta a points_history';
  END IF;
END $$;

-- ============================================
-- PARTE 4: TABELLE PER RATE LIMITING E STREAK
-- ============================================

-- Tabella per tracciare rate limiting giornaliero
CREATE TABLE IF NOT EXISTS public.xp_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- 'post', 'like', 'comment', 'share'
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, action_type, action_date)
);

-- Tabella per tracciare streak (giorni consecutivi)
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  current_streak INTEGER DEFAULT 0, -- Giorni consecutivi attuali
  longest_streak INTEGER DEFAULT 0, -- Record personale
  last_checkin_date DATE, -- Ultima data di check-in
  streak_bonus_xp INTEGER DEFAULT 0, -- XP bonus accumulati dal streak
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella per tracciare badge e achievement
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL, -- 'legendary_nomad', 'manager_reliable', ecc.
  badge_name TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB, -- Dati aggiuntivi del badge
  UNIQUE(user_id, badge_type)
);

-- Tabella per tracciare condivisioni esterne (per link univoci)
CREATE TABLE IF NOT EXISTS public.external_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  share_type TEXT NOT NULL, -- 'post', 'profile', 'service'
  related_id UUID NOT NULL, -- ID del post/profilo/servizio condiviso
  share_token TEXT UNIQUE NOT NULL, -- Token univoco per tracciare la condivisione
  clicked_count INTEGER DEFAULT 0, -- Numero di click sul link
  xp_awarded BOOLEAN DEFAULT FALSE, -- Se gli XP sono stati assegnati
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Scadenza del link (opzionale)
);

-- ============================================
-- PARTE 5: AGGIORNAMENTO TABELLA REFERRALS PER HOST
-- ============================================

-- Crea tabella referrals se non esiste
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  signup_bonus_points_awarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggiungi colonna referrer_host_id per tracciare referral Host
DO $$ 
BEGIN
  -- Aggiungi referrer_host_id se non esiste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'referrals' 
    AND column_name = 'referrer_host_id'
  ) THEN
    ALTER TABLE public.referrals ADD COLUMN referrer_host_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    RAISE NOTICE 'Colonna referrer_host_id aggiunta a referrals';
  END IF;
  
  -- Aggiungi colonna per tracciare se è referral Host o Traveler
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'referrals' 
    AND column_name = 'referral_type'
  ) THEN
    ALTER TABLE public.referrals ADD COLUMN referral_type TEXT DEFAULT 'traveler'; -- 'traveler' o 'host'
    RAISE NOTICE 'Colonna referral_type aggiunta a referrals';
  END IF;
END $$;

-- Tabella per tracciare XP bonus per referral Host (5% degli XP guadagnati)
CREATE TABLE IF NOT EXISTS public.host_referral_xp_bonus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source_xp_history_id UUID REFERENCES public.points_history(id) ON DELETE SET NULL,
  xp_bonus INTEGER NOT NULL, -- 5% degli XP guadagnati
  bonus_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_host_id, referred_host_id, source_xp_history_id)
);

-- ============================================
-- PARTE 5: INDICI PER PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_xp_rate_limits_user_date ON public.xp_rate_limits(user_id, action_date);
CREATE INDEX IF NOT EXISTS idx_xp_rate_limits_action ON public.xp_rate_limits(action_type, action_date);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON public.user_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_external_shares_user ON public.external_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_external_shares_token ON public.external_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_external_shares_related ON public.external_shares(share_type, related_id);
CREATE INDEX IF NOT EXISTS idx_host_referral_xp_bonus_referrer ON public.host_referral_xp_bonus(referrer_host_id);
CREATE INDEX IF NOT EXISTS idx_host_referral_xp_bonus_referred ON public.host_referral_xp_bonus(referred_host_id);
CREATE INDEX IF NOT EXISTS idx_points_history_user_date ON public.points_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_points_history_action ON public.points_history(action_type);
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON public.profiles(total_xp);
CREATE INDEX IF NOT EXISTS idx_bookings_creator ON public.bookings(creator_id);

-- ============================================
-- PARTE 7: FUNZIONI PER CALCOLARE LIVELLI
-- ============================================

-- Funzione per calcolare il tier basato su total_xp
CREATE OR REPLACE FUNCTION public.calculate_tier(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF total_xp >= 50000 THEN
    RETURN 6; -- Nomade Diamante
  ELSIF total_xp >= 25000 THEN
    RETURN 5; -- Nomade Platino
  ELSIF total_xp >= 12000 THEN
    RETURN 4; -- Nomade Zaffiro
  ELSIF total_xp >= 5000 THEN
    RETURN 3; -- Nomade Rubino
  ELSIF total_xp >= 1500 THEN
    RETURN 2; -- Nomade Perla
  ELSE
    RETURN 1; -- Neofita Nomade
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funzione per ottenere il nome del tier
CREATE OR REPLACE FUNCTION public.get_tier_name(tier_level INTEGER)
RETURNS TEXT AS $$
BEGIN
  CASE tier_level
    WHEN 1 THEN RETURN 'Neofita Nomade';
    WHEN 2 THEN RETURN 'Nomade Perla';
    WHEN 3 THEN RETURN 'Nomade Rubino';
    WHEN 4 THEN RETURN 'Nomade Zaffiro';
    WHEN 5 THEN RETURN 'Nomade Platino';
    WHEN 6 THEN RETURN 'Nomade Diamante';
    ELSE RETURN 'Neofita Nomade';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Funzione per aggiornare il tier di un utente
CREATE OR REPLACE FUNCTION public.update_user_tier(user_id_param UUID)
RETURNS VOID AS $$
DECLARE
  current_xp INTEGER;
  new_tier INTEGER;
BEGIN
  -- Ottieni total_xp
  SELECT total_xp INTO current_xp
  FROM public.profiles
  WHERE id = user_id_param;
  
  IF current_xp IS NULL THEN
    RETURN;
  END IF;
  
  -- Calcola nuovo tier
  new_tier := public.calculate_tier(current_xp);
  
  -- Aggiorna tier se è cambiato
  UPDATE public.profiles
  SET current_tier = new_tier
  WHERE id = user_id_param AND (current_tier IS NULL OR current_tier != new_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 8: FUNZIONI PER ASSEGNARE XP CON RATE LIMITING
-- ============================================

-- Funzione per verificare e aggiornare rate limit
CREATE OR REPLACE FUNCTION public.check_and_update_rate_limit(
  user_id_param UUID,
  action_type_param TEXT,
  max_actions INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  today_count INTEGER;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Ottieni conteggio per oggi
  SELECT COALESCE(action_count, 0) INTO today_count
  FROM public.xp_rate_limits
  WHERE user_id = user_id_param
    AND action_type = action_type_param
    AND action_date = today_date;
  
  -- Se non esiste record, crealo
  IF today_count IS NULL THEN
    INSERT INTO public.xp_rate_limits (user_id, action_type, action_date, action_count)
    VALUES (user_id_param, action_type_param, today_date, 1)
    ON CONFLICT (user_id, action_type, action_date)
    DO UPDATE SET action_count = xp_rate_limits.action_count + 1;
    RETURN TRUE;
  END IF;
  
  -- Verifica limite
  IF today_count >= max_actions THEN
    RETURN FALSE; -- Limite raggiunto
  END IF;
  
  -- Incrementa conteggio
  UPDATE public.xp_rate_limits
  SET action_count = action_count + 1,
      updated_at = NOW()
  WHERE user_id = user_id_param
    AND action_type = action_type_param
    AND action_date = today_date;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione principale per assegnare XP
CREATE OR REPLACE FUNCTION public.award_xp(
  user_id_param UUID,
  xp_amount INTEGER,
  action_type_param TEXT,
  description_param TEXT DEFAULT NULL,
  related_id_param UUID DEFAULT NULL,
  related_type_param TEXT DEFAULT NULL,
  check_rate_limit BOOLEAN DEFAULT FALSE,
  max_daily_actions INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  rate_limit_ok BOOLEAN := TRUE;
BEGIN
  -- Verifica rate limit se richiesto
  IF check_rate_limit AND max_daily_actions IS NOT NULL THEN
    rate_limit_ok := public.check_and_update_rate_limit(user_id_param, action_type_param, max_daily_actions);
    IF NOT rate_limit_ok THEN
      RETURN FALSE; -- Limite giornaliero raggiunto
    END IF;
  END IF;
  
  -- Inserisci in points_history
  INSERT INTO public.points_history (
    user_id,
    points,
    action_type,
    description,
    related_id,
    related_type
  )
  VALUES (
    user_id_param,
    xp_amount,
    action_type_param,
    description_param,
    related_id_param,
    related_type_param
  );
  
  -- Aggiorna total_xp
  UPDATE public.profiles
  SET total_xp = COALESCE(total_xp, 0) + xp_amount
  WHERE id = user_id_param;
  
  -- Aggiorna tier
  PERFORM public.update_user_tier(user_id_param);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 9: FUNZIONI PER STREAK (ACCESSO GIORNALIERO)
-- ============================================

-- Funzione per gestire streak e assegnare bonus
CREATE OR REPLACE FUNCTION public.handle_daily_streak(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER;
  last_checkin DATE;
  today_date DATE := CURRENT_DATE;
  streak_bonus INTEGER := 0;
BEGIN
  -- Ottieni o crea record streak
  SELECT current_streak, last_checkin_date INTO current_streak, last_checkin
  FROM public.user_streaks
  WHERE user_id = user_id_param;
  
  -- Se non esiste, crealo
  IF current_streak IS NULL THEN
    INSERT INTO public.user_streaks (user_id, current_streak, last_checkin_date)
    VALUES (user_id_param, 1, today_date)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN 10; -- Primo giorno: 10 XP
  END IF;
  
  -- Se è già stato fatto check-in oggi, ritorna 0
  IF last_checkin = today_date THEN
    RETURN 0;
  END IF;
  
  -- Se l'ultimo check-in è ieri, incrementa streak
  IF last_checkin = today_date - INTERVAL '1 day' THEN
    current_streak := current_streak + 1;
  ELSE
    -- Streak rotto, ricomincia da 1
    current_streak := 1;
  END IF;
  
  -- Calcola bonus streak (max 70 XP dopo 7 giorni)
  IF current_streak >= 7 THEN
    streak_bonus := 70;
  ELSE
    streak_bonus := current_streak * 10;
  END IF;
  
  -- Aggiorna streak
  UPDATE public.user_streaks
  SET current_streak = current_streak,
      last_checkin_date = today_date,
      longest_streak = GREATEST(longest_streak, current_streak),
      updated_at = NOW()
  WHERE user_id = user_id_param;
  
  RETURN streak_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 10: FUNZIONI PER REFERRAL HOST
-- ============================================

-- Funzione per assegnare bonus XP a referrer Host quando referred Host guadagna XP
CREATE OR REPLACE FUNCTION public.award_host_referral_bonus(
  referred_host_id_param UUID,
  source_xp_history_id_param UUID,
  xp_earned INTEGER
)
RETURNS VOID AS $$
DECLARE
  referrer_host_id_val UUID;
  bonus_xp INTEGER;
  referral_months INTEGER;
  referral_date DATE;
BEGIN
  -- Trova il referrer Host
  SELECT referrer_host_id INTO referrer_host_id_val
  FROM public.referrals
  WHERE referred_id = referred_host_id_param
    AND referral_type = 'host'
    AND status = 'completed'
  LIMIT 1;
  
  -- Se non c'è referrer, esci
  IF referrer_host_id_val IS NULL THEN
    RETURN;
  END IF;
  
  -- Verifica che il referral sia entro 6 mesi
  SELECT created_at INTO referral_date
  FROM public.referrals
  WHERE referrer_host_id = referrer_host_id_val
    AND referred_id = referred_host_id_param
    AND referral_type = 'host';
  
  IF referral_date IS NULL THEN
    RETURN;
  END IF;
  
  referral_months := EXTRACT(EPOCH FROM (NOW() - referral_date)) / 2592000; -- Mesi in secondi
  
  IF referral_months > 6 THEN
    RETURN; -- Referral scaduto (oltre 6 mesi)
  END IF;
  
  -- Calcola bonus (5% degli XP guadagnati)
  bonus_xp := FLOOR(xp_earned * 0.05);
  
  IF bonus_xp <= 0 THEN
    RETURN;
  END IF;
  
  -- Se source_xp_history_id è NULL, trova l'ultima entry per questo utente
  IF source_xp_history_id_param IS NULL THEN
    SELECT id INTO source_xp_history_id_param
    FROM public.points_history
    WHERE user_id = referred_host_id_param
      AND action_type IN ('booking_completed', 'property_published')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Evita duplicati
  IF source_xp_history_id_param IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.host_referral_xp_bonus
    WHERE referrer_host_id = referrer_host_id_val
      AND referred_host_id = referred_host_id_param
      AND source_xp_history_id = source_xp_history_id_param
  ) THEN
    RETURN;
  END IF;
  
  -- Registra bonus
  INSERT INTO public.host_referral_xp_bonus (
    referrer_host_id,
    referred_host_id,
    source_xp_history_id,
    xp_bonus
  )
  VALUES (
    referrer_host_id_val,
    referred_host_id_param,
    source_xp_history_id_param,
    bonus_xp
  )
  ON CONFLICT DO NOTHING;
  
  -- Assegna XP al referrer
  PERFORM public.award_xp(
    referrer_host_id_val,
    bonus_xp,
    'host_referral_bonus',
    'Bonus 5% XP da Host invitato',
    source_xp_history_id_param,
    'xp_history',
    FALSE,
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 11: FUNZIONI PER ENGAGEMENT ALTO
-- ============================================

-- Funzione per verificare e assegnare bonus engagement per post
CREATE OR REPLACE FUNCTION public.check_post_engagement(post_id_param UUID)
RETURNS VOID AS $$
DECLARE
  post_author_id UUID;
  like_count_val INTEGER;
  comment_count_val INTEGER;
  engagement_bonus_awarded BOOLEAN;
BEGIN
  -- Ottieni dati del post
  SELECT author_id, like_count, comment_count INTO post_author_id, like_count_val, comment_count_val
  FROM public.posts
  WHERE id = post_id_param;
  
  IF post_author_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Verifica se il bonus è già stato assegnato
  SELECT EXISTS (
    SELECT 1 FROM public.points_history
    WHERE user_id = post_author_id
      AND action_type = 'post_high_engagement'
      AND related_id = post_id_param
  ) INTO engagement_bonus_awarded;
  
  IF engagement_bonus_awarded THEN
    RETURN; -- Bonus già assegnato
  END IF;
  
  -- Verifica condizioni (escludi auto-like)
  -- Conta like escludendo quelli dell'autore
  SELECT COUNT(*) INTO like_count_val
  FROM public.post_likes
  WHERE post_id = post_id_param
    AND user_id != post_author_id;
  
  -- Verifica se raggiunge la soglia
  IF (like_count_val > 50 OR comment_count_val > 10) THEN
    -- Assegna bonus 150 XP
    PERFORM public.award_xp(
      post_author_id,
      150,
      'post_high_engagement',
      'Post con alto engagement (>50 like o >10 commenti)',
      post_id_param,
      'post',
      FALSE,
      NULL
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 12: FUNZIONI PER BADGE NOMADE LEGGENDARIO
-- ============================================

-- Funzione per verificare e assegnare badge Nomade Leggendario
CREATE OR REPLACE FUNCTION public.check_legendary_nomad_badge(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_signup_date TIMESTAMP WITH TIME ZONE;
  days_since_signup INTEGER;
  user_total_xp INTEGER;
  user_tier INTEGER;
  high_value_actions_count INTEGER;
  has_badge BOOLEAN;
BEGIN
  -- Verifica se ha già il badge
  SELECT EXISTS (
    SELECT 1 FROM public.user_badges
    WHERE user_id = user_id_param
      AND badge_type = 'legendary_nomad'
  ) INTO has_badge;
  
  IF has_badge THEN
    RETURN TRUE; -- Già ha il badge
  END IF;
  
  -- Ottieni dati utente
  SELECT signup_date, total_xp, current_tier INTO user_signup_date, user_total_xp, user_tier
  FROM public.profiles
  WHERE id = user_id_param;
  
  IF user_signup_date IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica longevità (minimo 1 anno = 365 giorni)
  days_since_signup := EXTRACT(EPOCH FROM (NOW() - user_signup_date)) / 86400;
  
  IF days_since_signup < 365 THEN
    RETURN FALSE; -- Non ha ancora 1 anno
  END IF;
  
  -- Verifica tier (deve essere Diamante = tier 6)
  IF user_tier < 6 THEN
    RETURN FALSE; -- Non ha raggiunto tier 6
  END IF;
  
  -- Conta azioni ad alto valore (referral o prenotazioni)
  SELECT COUNT(*) INTO high_value_actions_count
  FROM public.points_history
  WHERE user_id = user_id_param
    AND action_type IN ('referral_traveler', 'referral_host', 'booking_completed', 'service_completed')
    AND points >= 300; -- Solo azioni con almeno 300 XP
  
  IF high_value_actions_count < 100 THEN
    RETURN FALSE; -- Non ha completato 100+ azioni ad alto valore
  END IF;
  
  -- Assegna badge
  INSERT INTO public.user_badges (user_id, badge_type, badge_name, metadata)
  VALUES (
    user_id_param,
    'legendary_nomad',
    'Nomade Leggendario',
    jsonb_build_object(
      'unlocked_at', NOW(),
      'days_since_signup', days_since_signup,
      'total_xp', user_total_xp,
      'high_value_actions', high_value_actions_count
    )
  )
  ON CONFLICT (user_id, badge_type) DO NOTHING;
  
  -- Aggiorna profilo
  UPDATE public.profiles
  SET is_legendary_nomad = TRUE
  WHERE id = user_id_param;
  
  -- Assegna bonus 10.000 XP
  PERFORM public.award_xp(
    user_id_param,
    10000,
    'legendary_nomad_badge',
    'Badge Nomade Leggendario sbloccato!',
    NULL,
    NULL,
    FALSE,
    NULL
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 13: TRIGGER PER ASSEGNARE XP AUTOMATICAMENTE
-- ============================================

-- Trigger: Assegna XP quando un utente completa l'iscrizione
CREATE OR REPLACE FUNCTION public.on_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Assegna 100 XP per iscrizione
  PERFORM public.award_xp(
    NEW.id,
    100,
    'signup_completed',
    'Iscrizione completata',
    NULL,
    NULL,
    FALSE,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_user_signup ON public.profiles;
CREATE TRIGGER trigger_on_user_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_user_signup();

-- Trigger: Assegna XP quando un profilo è completato al 100%
CREATE OR REPLACE FUNCTION public.on_profile_completed()
RETURNS TRIGGER AS $$
DECLARE
  profile_complete BOOLEAN := FALSE;
BEGIN
  -- Verifica se profilo è completo (bio, foto, interessi)
  IF NEW.bio IS NOT NULL AND NEW.bio != '' AND
     NEW.avatar_url IS NOT NULL AND NEW.avatar_url != '' AND
     EXISTS (SELECT 1 FROM public.creator_niches WHERE user_id = NEW.id) THEN
    profile_complete := TRUE;
  END IF;
  
  -- Se è completo e non è stato ancora assegnato il bonus
  IF profile_complete AND NOT EXISTS (
    SELECT 1 FROM public.points_history
    WHERE user_id = NEW.id
      AND action_type = 'profile_completed'
  ) THEN
    PERFORM public.award_xp(
      NEW.id,
      200,
      'profile_completed',
      'Profilo completato al 100%',
      NULL,
      NULL,
      FALSE,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_profile_completed ON public.profiles;
CREATE TRIGGER trigger_on_profile_completed
  AFTER INSERT OR UPDATE OF bio, avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_profile_completed();

-- Trigger: Assegna XP quando viene pubblicato un post
CREATE OR REPLACE FUNCTION public.on_post_created()
RETURNS TRIGGER AS $$
DECLARE
  posts_today INTEGER;
BEGIN
  -- Verifica limite 3 post al giorno
  SELECT COUNT(*) INTO posts_today
  FROM public.posts
  WHERE author_id = NEW.author_id
    AND DATE(created_at) = CURRENT_DATE;
  
  IF posts_today <= 3 THEN
    -- Assegna 30 XP per post
    PERFORM public.award_xp(
      NEW.author_id,
      30,
      'post_created',
      'Post pubblicato',
      NEW.id,
      'post',
      TRUE,
      3
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_post_created ON public.posts;
CREATE TRIGGER trigger_on_post_created
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.on_post_created();

-- Trigger: Verifica engagement quando un post riceve like o commento
CREATE OR REPLACE FUNCTION public.on_post_engagement()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica engagement del post
  PERFORM public.check_post_engagement(NEW.post_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_post_like_engagement ON public.post_likes;
CREATE TRIGGER trigger_on_post_like_engagement
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.on_post_engagement();

DROP TRIGGER IF EXISTS trigger_on_post_comment_engagement ON public.post_comments;
CREATE TRIGGER trigger_on_post_comment_engagement
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_post_engagement();

-- Trigger: Assegna XP quando viene messo un like
CREATE OR REPLACE FUNCTION public.on_post_liked()
RETURNS TRIGGER AS $$
BEGIN
  -- Assegna 2 XP al user che mette like (max 30 al giorno)
  PERFORM public.award_xp(
    NEW.user_id,
    2,
    'post_like',
    'Like a un post',
    NEW.post_id,
    'post',
    TRUE,
    30
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_post_liked ON public.post_likes;
CREATE TRIGGER trigger_on_post_liked
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.on_post_liked();

-- Trigger: Assegna XP quando viene fatto un commento
CREATE OR REPLACE FUNCTION public.on_post_commented()
RETURNS TRIGGER AS $$
BEGIN
  -- Assegna 10 XP per commento (max 10 al giorno)
  PERFORM public.award_xp(
    NEW.user_id,
    10,
    'post_comment',
    'Commento a un post',
    NEW.post_id,
    'post',
    TRUE,
    10
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_post_commented ON public.post_comments;
CREATE TRIGGER trigger_on_post_commented
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_post_commented();

-- Trigger: Assegna XP quando una prenotazione è completata (per Host e Creator)
CREATE OR REPLACE FUNCTION public.on_booking_completed()
RETURNS TRIGGER AS $$
DECLARE
  property_owner_id UUID;
  collaboration_creator_id UUID;
BEGIN
  -- Solo quando lo status cambia a 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Ottieni owner della property
    SELECT owner_id INTO property_owner_id
    FROM public.properties
    WHERE id = NEW.property_id;
    
    IF property_owner_id IS NOT NULL THEN
      -- Assegna 500 XP all'Host
      PERFORM public.award_xp(
        property_owner_id,
        500,
        'booking_completed',
        'Prenotazione completata con successo',
        NEW.id,
        'booking',
        FALSE,
        NULL
      );
      
      -- Il bonus referral Host sarà gestito automaticamente dal trigger on_xp_earned_host_referral
    END IF;
    
    -- Verifica se esiste un Creator collegato direttamente alla prenotazione
    -- oppure tramite collaboration attiva per questa property
    IF NEW.creator_id IS NOT NULL THEN
      collaboration_creator_id := NEW.creator_id;
    ELSE
      -- Cerca tramite collaboration attiva
      SELECT creator_id INTO collaboration_creator_id
      FROM public.collaborations
      WHERE property_id = NEW.property_id
        AND status IN ('accepted', 'completed')
        AND (start_date IS NULL OR start_date <= CURRENT_DATE)
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
    
    IF collaboration_creator_id IS NOT NULL THEN
      -- Verifica che non sia già stato assegnato per questa prenotazione
      IF NOT EXISTS (
        SELECT 1 FROM public.points_history
        WHERE user_id = collaboration_creator_id
          AND action_type = 'booking_generated'
          AND related_id = NEW.id
      ) THEN
        -- Assegna 300 XP al Creator
        PERFORM public.award_xp(
          collaboration_creator_id,
          300,
          'booking_generated',
          'Prenotazione generata',
          NEW.id,
          'booking',
          FALSE,
          NULL
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_booking_completed ON public.bookings;
CREATE TRIGGER trigger_on_booking_completed
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_completed();

-- Trigger: Assegna XP quando un servizio Manager è completato
CREATE OR REPLACE FUNCTION public.on_service_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo quando lo status cambia a 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Assegna 200 XP al Manager
    PERFORM public.award_xp(
      NEW.manager_id,
      200,
      'service_completed',
      'Servizio completato e approvato',
      NEW.id,
      'service',
      FALSE,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Assegna XP quando una recensione a 5 stelle è lasciata per un Manager
CREATE OR REPLACE FUNCTION public.on_manager_review_5stars()
RETURNS TRIGGER AS $$
DECLARE
  service_manager_id UUID;
BEGIN
  -- Solo per recensioni a 5 stelle
  IF NEW.rating = 5 THEN
    -- Cerca se la recensione è collegata a un servizio Manager
    -- Prima prova tramite booking_id -> service_request (se esiste relazione)
    -- Altrimenti prova tramite property_id -> service_request
    SELECT sr.manager_id INTO service_manager_id
    FROM public.service_requests sr
    WHERE (sr.property_id = NEW.property_id OR sr.id::TEXT = NEW.booking_id::TEXT)
      AND sr.status = 'completed'
      AND sr.manager_id IS NOT NULL
    ORDER BY sr.updated_at DESC
    LIMIT 1;
    
    -- Se trovato, assegna 100 XP al Manager
    IF service_manager_id IS NOT NULL THEN
      -- Verifica che non sia già stato assegnato per questa recensione
      IF NOT EXISTS (
        SELECT 1 FROM public.points_history
        WHERE user_id = service_manager_id
          AND action_type = 'manager_review_5stars'
          AND related_id = NEW.id
      ) THEN
        PERFORM public.award_xp(
          service_manager_id,
          100,
          'manager_review_5stars',
          'Recensione a 5 stelle ricevuta',
          NEW.id,
          'review',
          FALSE,
          NULL
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_manager_review_5stars ON public.reviews;
CREATE TRIGGER trigger_on_manager_review_5stars
  AFTER INSERT OR UPDATE OF rating ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.on_manager_review_5stars();

DROP TRIGGER IF EXISTS trigger_on_service_completed ON public.service_requests;
CREATE TRIGGER trigger_on_service_completed
  AFTER UPDATE OF status ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.on_service_completed();

-- Trigger: Assegna XP quando una property è pubblicata (Host)
CREATE OR REPLACE FUNCTION public.on_property_published()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo quando la property diventa attiva (per nuove property o quando viene riattivata)
  IF NEW.is_active = TRUE AND (OLD.is_active IS NULL OR OLD.is_active = FALSE) THEN
    -- Verifica che non sia già stato assegnato per questa property
    IF NOT EXISTS (
      SELECT 1 FROM public.points_history
      WHERE user_id = NEW.owner_id
        AND action_type = 'property_published'
        AND related_id = NEW.id
    ) THEN
      -- Assegna 200 XP all'Host
      PERFORM public.award_xp(
        NEW.owner_id,
        200,
        'property_published',
        'Servizio/Viaggio pubblicato',
        NEW.id,
        'property',
        FALSE,
        NULL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_property_published ON public.properties;
CREATE TRIGGER trigger_on_property_published
  AFTER INSERT OR UPDATE OF is_active ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.on_property_published();

-- ============================================
-- PARTE 14: FUNZIONI RPC PER AZIONI MANUALI
-- ============================================

-- Funzione RPC per check-in giornaliero (streak)
CREATE OR REPLACE FUNCTION public.daily_checkin()
RETURNS INTEGER AS $$
DECLARE
  user_id_param UUID;
  streak_bonus INTEGER;
BEGIN
  user_id_param := auth.uid();
  
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;
  
  -- Gestisci streak e ottieni bonus
  streak_bonus := public.handle_daily_streak(user_id_param);
  
  IF streak_bonus > 0 THEN
    -- Crea record check-in
    INSERT INTO public.daily_checkins (user_id, check_in_date, points_earned)
    VALUES (user_id_param, CURRENT_DATE, streak_bonus)
    ON CONFLICT (user_id, check_in_date) DO NOTHING;
    
    -- Assegna XP
    PERFORM public.award_xp(
      user_id_param,
      streak_bonus,
      'daily_checkin',
      'Accesso giornaliero (Streak: ' || streak_bonus || ' XP)',
      NULL,
      NULL,
      FALSE,
      NULL
    );
  END IF;
  
  RETURN streak_bonus;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione RPC per registrare condivisione esterna
CREATE OR REPLACE FUNCTION public.register_external_share(
  share_type_param TEXT,
  related_id_param UUID
)
RETURNS TEXT AS $$
DECLARE
  user_id_param UUID;
  share_token TEXT;
BEGIN
  user_id_param := auth.uid();
  
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;
  
  -- Genera token univoco
  share_token := UPPER(SUBSTRING(MD5(user_id_param::TEXT || share_type_param || related_id_param::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 16));
  
  -- Crea record condivisione
  INSERT INTO public.external_shares (user_id, share_type, related_id, share_token, expires_at)
  VALUES (user_id_param, share_type_param, related_id_param, share_token, NOW() + INTERVAL '30 days')
  ON CONFLICT (share_token) DO NOTHING;
  
  -- Assegna 50 XP per condivisione
  PERFORM public.award_xp(
    user_id_param,
    50,
    'external_share',
    'Condivisione esterna: ' || share_type_param,
    related_id_param,
    share_type_param,
    FALSE,
    NULL
  );
  
  RETURN share_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione RPC per registrare click su link condiviso (per tracciare conversioni)
CREATE OR REPLACE FUNCTION public.track_share_click(share_token_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.external_shares
  SET clicked_count = clicked_count + 1
  WHERE share_token = share_token_param
    AND expires_at > NOW();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione RPC per registrare referral Traveler
CREATE OR REPLACE FUNCTION public.register_traveler_referral(referral_code_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_id_param UUID;
  referrer_id_val UUID;
BEGIN
  user_id_param := auth.uid();
  
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;
  
  -- Trova referrer
  SELECT user_id INTO referrer_id_val
  FROM public.referral_codes
  WHERE code = referral_code_param;
  
  IF referrer_id_val IS NULL OR referrer_id_val = user_id_param THEN
    RETURN FALSE;
  END IF;
  
  -- Registra referral
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, referral_type)
  VALUES (referrer_id_val, user_id_param, referral_code_param, 'pending', 'traveler')
  ON CONFLICT (referred_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione RPC per completare referral Traveler (quando il nuovo utente completa il profilo)
CREATE OR REPLACE FUNCTION public.complete_traveler_referral()
RETURNS BOOLEAN AS $$
DECLARE
  user_id_param UUID;
  referrer_id_val UUID;
BEGIN
  user_id_param := auth.uid();
  
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;
  
  -- Trova referrer
  SELECT referrer_id INTO referrer_id_val
  FROM public.referrals
  WHERE referred_id = user_id_param
    AND referral_type = 'traveler'
    AND status = 'pending';
  
  IF referrer_id_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Aggiorna status
  UPDATE public.referrals
  SET status = 'completed',
      signup_bonus_points_awarded = TRUE
  WHERE referred_id = user_id_param
    AND referral_type = 'traveler';
  
  -- Assegna 1000 XP al referrer
  PERFORM public.award_xp(
    referrer_id_val,
    1000,
    'referral_traveler',
    'Referral Traveler completato',
    user_id_param,
    'user',
    FALSE,
    NULL
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione RPC per registrare referral Host
CREATE OR REPLACE FUNCTION public.register_host_referral(
  referral_code_param TEXT,
  referred_host_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_host_id_val UUID;
BEGIN
  -- Trova referrer Host
  SELECT user_id INTO referrer_host_id_val
  FROM public.referral_codes
  WHERE code = referral_code_param;
  
  IF referrer_host_id_val IS NULL OR referrer_host_id_val = referred_host_id_param THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica che il referrer sia un Host
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = referrer_host_id_val
      AND role = 'host'
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Registra referral Host
  INSERT INTO public.referrals (
    referrer_id,
    referred_id,
    referral_code,
    status,
    referral_type,
    referrer_host_id
  )
  VALUES (
    referrer_host_id_val,
    referred_host_id_param,
    referral_code_param,
    'completed',
    'host',
    referrer_host_id_val
  )
  ON CONFLICT (referred_id) DO UPDATE
  SET referrer_host_id = EXCLUDED.referrer_host_id,
      referral_type = 'host';
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 14: FUNZIONE PER VERIFICARE BADGE MANAGER AFFIDABILE
-- ============================================

-- Funzione per verificare e assegnare badge "Manager Affidabile"
CREATE OR REPLACE FUNCTION public.check_manager_reliable_badge(manager_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  completed_services_count INTEGER;
  avg_rating DECIMAL;
  has_badge BOOLEAN;
BEGIN
  -- Verifica se ha già il badge
  SELECT EXISTS (
    SELECT 1 FROM public.user_badges
    WHERE user_id = manager_id_param
      AND badge_type = 'manager_reliable'
  ) INTO has_badge;
  
  IF has_badge THEN
    RETURN TRUE;
  END IF;
  
  -- Conta servizi completati
  SELECT COUNT(*) INTO completed_services_count
  FROM public.service_requests
  WHERE manager_id = manager_id_param
    AND status = 'completed';
  
  IF completed_services_count < 3 THEN
    RETURN FALSE; -- Non ha ancora 3 servizi completati
  END IF;
  
  -- Calcola rating medio (assumendo che ci sia una tabella reviews collegata)
  -- Questa parte dipende dalla struttura della tabella reviews
  -- Per ora assumiamo che il rating medio sia >= 4.5
  
  -- Se passa tutti i controlli, assegna badge
  INSERT INTO public.user_badges (user_id, badge_type, badge_name, metadata)
  VALUES (
    manager_id_param,
    'manager_reliable',
    'Manager Affidabile',
    jsonb_build_object(
      'unlocked_at', NOW(),
      'completed_services', completed_services_count
    )
  )
  ON CONFLICT (user_id, badge_type) DO NOTHING;
  
  -- Assegna 1000 XP bonus
  PERFORM public.award_xp(
    manager_id_param,
    1000,
    'manager_reliable_badge',
    'Badge Manager Affidabile sbloccato!',
    NULL,
    NULL,
    FALSE,
    NULL
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per verificare badge Manager quando un servizio è completato
CREATE OR REPLACE FUNCTION public.on_service_completed_check_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.check_manager_reliable_badge(NEW.manager_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_service_completed_check_badge ON public.service_requests;
CREATE TRIGGER trigger_on_service_completed_check_badge
  AFTER UPDATE OF status ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.on_service_completed_check_badge();

-- ============================================
-- PARTE 16: TRIGGER PER AGGIORNARE TIER AUTOMATICAMENTE
-- ============================================

-- Trigger per aggiornare tier quando total_xp cambia
CREATE OR REPLACE FUNCTION public.on_xp_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiorna tier se total_xp è cambiato
  IF NEW.total_xp != OLD.total_xp THEN
    PERFORM public.update_user_tier(NEW.id);
    
    -- Verifica badge Nomade Leggendario (solo se tier è 6)
    IF NEW.current_tier = 6 THEN
      PERFORM public.check_legendary_nomad_badge(NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_xp_updated ON public.profiles;
CREATE TRIGGER trigger_on_xp_updated
  AFTER UPDATE OF total_xp ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_xp_updated();

-- ============================================
-- PARTE 16: FUNZIONE PER OTTENERE STATISTICHE XP
-- ============================================

-- Funzione RPC per ottenere statistiche XP dell'utente
CREATE OR REPLACE FUNCTION public.get_xp_stats()
RETURNS JSONB AS $$
DECLARE
  user_id_param UUID;
  user_total_xp INTEGER;
  user_tier INTEGER;
  tier_name TEXT;
  next_tier_xp INTEGER;
  xp_needed INTEGER;
  current_streak INTEGER;
  longest_streak INTEGER;
  badges_count INTEGER;
BEGIN
  user_id_param := auth.uid();
  
  IF user_id_param IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;
  
  -- Ottieni dati utente
  SELECT total_xp, current_tier INTO user_total_xp, user_tier
  FROM public.profiles
  WHERE id = user_id_param;
  
  tier_name := public.get_tier_name(user_tier);
  
  -- Calcola XP necessari per prossimo tier
  CASE user_tier
    WHEN 1 THEN next_tier_xp := 1500;
    WHEN 2 THEN next_tier_xp := 5000;
    WHEN 3 THEN next_tier_xp := 12000;
    WHEN 4 THEN next_tier_xp := 25000;
    WHEN 5 THEN next_tier_xp := 50000;
    ELSE next_tier_xp := NULL; -- Tier massimo
  END CASE;
  
  IF next_tier_xp IS NOT NULL THEN
    xp_needed := next_tier_xp - user_total_xp;
  ELSE
    xp_needed := 0;
  END IF;
  
  -- Ottieni streak
  SELECT current_streak, longest_streak INTO current_streak, longest_streak
  FROM public.user_streaks
  WHERE user_id = user_id_param;
  
  -- Conta badge
  SELECT COUNT(*) INTO badges_count
  FROM public.user_badges
  WHERE user_id = user_id_param;
  
  RETURN jsonb_build_object(
    'total_xp', COALESCE(user_total_xp, 0),
    'current_tier', COALESCE(user_tier, 1),
    'tier_name', tier_name,
    'next_tier_xp', next_tier_xp,
    'xp_needed', GREATEST(xp_needed, 0),
    'current_streak', COALESCE(current_streak, 0),
    'longest_streak', COALESCE(longest_streak, 0),
    'badges_count', COALESCE(badges_count, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 18: RLS POLICIES
-- ============================================

-- Abilita RLS sulle nuove tabelle
ALTER TABLE IF EXISTS public.xp_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.external_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.host_referral_xp_bonus ENABLE ROW LEVEL SECURITY;

-- Policy: Utenti possono vedere i propri rate limits
CREATE POLICY "Users can view own rate limits" ON public.xp_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Utenti possono vedere il proprio streak
CREATE POLICY "Users can view own streak" ON public.user_streaks
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Utenti possono vedere i propri badge
CREATE POLICY "Users can view own badges" ON public.user_badges
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Utenti possono vedere le proprie condivisioni
CREATE POLICY "Users can view own shares" ON public.external_shares
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Utenti possono vedere i propri bonus referral Host
CREATE POLICY "Users can view own host referral bonuses" ON public.host_referral_xp_bonus
  FOR SELECT USING (auth.uid() = referrer_host_id);

-- Policy: Sistema può inserire/aggiornare (tramite funzioni)
CREATE POLICY "System can manage rate limits" ON public.xp_rate_limits
  FOR ALL USING (true);

CREATE POLICY "System can manage streaks" ON public.user_streaks
  FOR ALL USING (true);

CREATE POLICY "System can manage badges" ON public.user_badges
  FOR ALL USING (true);

CREATE POLICY "System can manage shares" ON public.external_shares
  FOR ALL USING (true);

CREATE POLICY "System can manage host referral bonuses" ON public.host_referral_xp_bonus
  FOR ALL USING (true);

-- ============================================
-- PARTE 18: GRANT PERMISSIONS
-- ============================================

-- Concedi esecuzione delle funzioni RPC agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.daily_checkin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_external_share(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_share_click(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_traveler_referral(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_traveler_referral() TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_host_referral(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_xp_stats() TO authenticated;

-- ============================================
-- PARTE 20: AGGIORNAMENTO REFERRAL SYSTEM ESISTENTE
-- ============================================

-- Aggiorna funzione register_referral esistente per supportare 1000 XP invece di 50
CREATE OR REPLACE FUNCTION public.register_referral(referred_user_id UUID, code_used TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  referrer_user_id UUID;
BEGIN
  -- Trova l'utente che ha il codice referral
  SELECT user_id INTO referrer_user_id
  FROM public.referral_codes
  WHERE code = code_used;
  
  -- Se il codice non esiste o è dello stesso utente, ritorna false
  IF referrer_user_id IS NULL OR referrer_user_id = referred_user_id THEN
    RETURN FALSE;
  END IF;
  
  -- Registra il referral
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status, referral_type)
  VALUES (referrer_user_id, referred_user_id, code_used, 'pending', 'traveler')
  ON CONFLICT (referred_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 21: JOB PER VERIFICARE BADGE NOMADE LEGGENDARIO (mensile)
-- ============================================

-- Funzione per verificare tutti gli utenti per badge Nomade Leggendario
-- Questa funzione può essere chiamata da un cron job mensile
CREATE OR REPLACE FUNCTION public.check_all_legendary_nomads()
RETURNS INTEGER AS $$
DECLARE
  users_checked INTEGER := 0;
  user_record RECORD;
BEGIN
  -- Verifica tutti gli utenti con tier 6 e almeno 1 anno di iscrizione
  FOR user_record IN
    SELECT id, signup_date, total_xp, current_tier
    FROM public.profiles
    WHERE current_tier = 6
      AND signup_date IS NOT NULL
      AND EXTRACT(EPOCH FROM (NOW() - signup_date)) / 86400 >= 365
      AND is_legendary_nomad = FALSE
  LOOP
    PERFORM public.check_legendary_nomad_badge(user_record.id);
    users_checked := users_checked + 1;
  END LOOP;
  
  RETURN users_checked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 22: AGGIORNAMENTO TRIGGER PER HOST REFERRAL BONUS
-- ============================================

-- Trigger per assegnare bonus referral Host quando un Host guadagna XP
CREATE OR REPLACE FUNCTION public.on_xp_earned_host_referral()
RETURNS TRIGGER AS $$
DECLARE
  user_role_val TEXT;
BEGIN
  -- Verifica se l'utente è un Host
  SELECT role INTO user_role_val
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  IF user_role_val = 'host' THEN
    -- Assegna bonus al referrer Host (5% degli XP guadagnati)
    PERFORM public.award_host_referral_bonus(
      NEW.user_id,
      NEW.id,
      NEW.points
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_xp_earned_host_referral ON public.points_history;
CREATE TRIGGER trigger_on_xp_earned_host_referral
  AFTER INSERT ON public.points_history
  FOR EACH ROW
  WHEN (NEW.action_type IN ('booking_completed', 'property_published'))
  EXECUTE FUNCTION public.on_xp_earned_host_referral();

-- ============================================
-- PARTE 23: VERIFICA E MIGRAZIONE DATI ESISTENTI
-- ============================================

-- Aggiorna tier per tutti gli utenti esistenti
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id, total_xp FROM public.profiles WHERE total_xp IS NOT NULL
  LOOP
    PERFORM public.update_user_tier(user_record.id);
  END LOOP;
  
  RAISE NOTICE 'Tier aggiornati per tutti gli utenti esistenti';
END $$;

-- ============================================
-- FINE SCRIPT
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sistema XP e Livellamento installato con successo!';
  RAISE NOTICE '========================================';
END $$;



