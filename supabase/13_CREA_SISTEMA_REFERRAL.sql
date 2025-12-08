-- ============================================
-- SISTEMA REFERRAL E MULTILEVEL MARKETING
-- ============================================

-- Tabella per i referral codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL, -- Codice referral univoco
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella per tracciare i referral
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Chi ha invitato
  referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL, -- Chi è stato invitato
  referral_code TEXT NOT NULL, -- Codice usato per la registrazione
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'active'
  signup_bonus_points_awarded BOOLEAN DEFAULT FALSE, -- Se i punti bonus sono stati assegnati
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabella per le commissioni referral (multilevel)
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Chi riceve la commissione
  referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Chi ha generato il fatturato
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL, -- Prenotazione che ha generato la commissione
  amount DECIMAL(10, 2) NOT NULL, -- Importo della commissione
  percentage DECIMAL(5, 2) NOT NULL, -- Percentuale applicata
  base_amount DECIMAL(10, 2) NOT NULL, -- Importo base su cui è calcolata la commissione
  level INTEGER DEFAULT 1, -- Livello del referral (1 = diretto, 2 = indiretto, etc.)
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Aggiungi colonna referral_code alla tabella profiles se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referral_code TEXT;
    RAISE NOTICE 'Colonna referral_code aggiunta a profiles';
  END IF;
END $$;

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON public.referral_commissions(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_booking ON public.referral_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON public.referral_commissions(status);

-- Funzione per generare un codice referral univoco
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Genera un codice di 8 caratteri alfanumerici
    code := UPPER(SUBSTRING(MD5(user_id::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 8));
    
    -- Controlla se esiste già
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE referral_codes.code = generate_referral_code.code) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Funzione per creare automaticamente un referral code quando un utente completa l'onboarding
CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Solo se l'utente ha completato l'onboarding e non ha ancora un codice
  IF NEW.onboarding_completed = TRUE AND NOT EXISTS (
    SELECT 1 FROM public.referral_codes WHERE referral_codes.user_id = NEW.id
  ) THEN
    new_code := public.generate_referral_code(NEW.id);
    
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (NEW.id, new_code)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Aggiorna anche il profilo con il codice
    UPDATE public.profiles 
    SET referral_code = new_code 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per creare automaticamente il referral code
DROP TRIGGER IF EXISTS on_profile_onboarding_completed ON public.profiles;
CREATE TRIGGER on_profile_onboarding_completed
  AFTER UPDATE OF onboarding_completed ON public.profiles
  FOR EACH ROW
  WHEN (NEW.onboarding_completed = TRUE AND OLD.onboarding_completed = FALSE)
  EXECUTE FUNCTION public.create_referral_code_for_user();

-- Funzione per registrare un referral quando un utente si registra con un codice
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
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
  VALUES (referrer_user_id, referred_user_id, code_used, 'completed')
  ON CONFLICT (referred_id) DO NOTHING;
  
  -- Assegna punti bonus al referrer (se non già assegnati)
  IF NOT EXISTS (
    SELECT 1 FROM public.referrals 
    WHERE referrer_id = referrer_user_id 
    AND referred_id = referred_user_id 
    AND signup_bonus_points_awarded = TRUE
  ) THEN
    -- Assegna 50 punti al referrer
    UPDATE public.profiles 
    SET points = COALESCE(points, 0) + 50
    WHERE id = referrer_user_id;
    
    INSERT INTO public.points_history (user_id, points, action_type, description)
    VALUES (referrer_user_id, 50, 'referral', 'Utente invitato registrato');
    
    -- Marca come assegnato
    UPDATE public.referrals
    SET signup_bonus_points_awarded = TRUE
    WHERE referrer_id = referrer_user_id AND referred_id = referred_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per calcolare commissioni su prenotazioni (multilevel)
CREATE OR REPLACE FUNCTION public.calculate_referral_commission(
  booking_id_param UUID,
  booking_amount DECIMAL
)
RETURNS VOID AS $$
DECLARE
  traveler_id_val UUID;
  referrer_id_val UUID;
  commission_percentage DECIMAL := 5.0; -- 5% per livello 1
  indirect_percentage DECIMAL := 2.0; -- 2% per livello 2
  commission_amount DECIMAL;
  level_num INTEGER := 1;
  current_referred_id UUID;
BEGIN
  -- Ottieni il traveler dalla prenotazione
  SELECT traveler_id INTO traveler_id_val
  FROM public.bookings
  WHERE id = booking_id_param;
  
  IF traveler_id_val IS NULL THEN
    RETURN;
  END IF;
  
  current_referred_id := traveler_id_val;
  
  -- Calcola commissioni per i livelli (max 3 livelli)
  WHILE level_num <= 3 AND current_referred_id IS NOT NULL LOOP
    -- Trova il referrer del current_referred_id
    SELECT referrer_id INTO referrer_id_val
    FROM public.referrals
    WHERE referred_id = current_referred_id
    AND status = 'completed'
    LIMIT 1;
    
    -- Se non c'è referrer, esci
    EXIT WHEN referrer_id_val IS NULL;
    
    -- Calcola la commissione in base al livello
    IF level_num = 1 THEN
      commission_amount := booking_amount * (commission_percentage / 100);
    ELSIF level_num = 2 THEN
      commission_amount := booking_amount * (indirect_percentage / 100);
    ELSE
      commission_amount := booking_amount * (indirect_percentage / 100);
    END IF;
    
    -- Inserisci la commissione
    INSERT INTO public.referral_commissions (
      referrer_id,
      referred_id,
      booking_id,
      amount,
      percentage,
      base_amount,
      level,
      status
    )
    VALUES (
      referrer_id_val,
      current_referred_id,
      booking_id_param,
      commission_amount,
      CASE 
        WHEN level_num = 1 THEN commission_percentage
        ELSE indirect_percentage
      END,
      booking_amount,
      level_num,
      'pending'
    );
    
    -- Passa al livello successivo
    current_referred_id := referrer_id_val;
    level_num := level_num + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per calcolare commissioni quando una prenotazione viene confermata
CREATE OR REPLACE FUNCTION public.on_booking_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  booking_total DECIMAL;
BEGIN
  -- Solo quando lo status cambia a 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Calcola il totale della prenotazione (giorni * prezzo per notte)
    SELECT (EXTRACT(EPOCH FROM (NEW.check_out - NEW.check_in)) / 86400) * p.price_per_night
    INTO booking_total
    FROM public.properties p
    WHERE p.id = NEW.property_id;
    
    IF booking_total IS NOT NULL AND booking_total > 0 THEN
      PERFORM public.calculate_referral_commission(NEW.id, booking_total);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_referral_commission ON public.bookings;
CREATE TRIGGER trigger_calculate_referral_commission
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_confirmed();

-- RLS Policies per referral
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- Policy: Utenti possono vedere il proprio referral code
CREATE POLICY "Users can view own referral code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Utenti possono vedere i propri referral
CREATE POLICY "Users can view own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Policy: Utenti possono vedere le proprie commissioni
CREATE POLICY "Users can view own commissions" ON public.referral_commissions
  FOR SELECT USING (auth.uid() = referrer_id);

-- Policy: Sistema può inserire referral (tramite funzione)
CREATE POLICY "System can insert referrals" ON public.referrals
  FOR INSERT WITH CHECK (true);

-- Policy: Sistema può inserire commissioni (tramite trigger)
CREATE POLICY "System can insert commissions" ON public.referral_commissions
  FOR INSERT WITH CHECK (true);
