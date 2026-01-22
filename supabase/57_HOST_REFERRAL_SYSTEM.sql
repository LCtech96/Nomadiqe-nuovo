-- ============================================
-- SISTEMA REFERRAL PER HOST
-- ============================================
-- Permette agli host di invitare altri utenti e tracciare le registrazioni
-- ============================================

-- 1. CREA TABELLA PER I CODICI REFERRAL DEGLI HOST
-- ============================================
CREATE TABLE IF NOT EXISTS public.host_referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  total_invites INTEGER DEFAULT 0,
  active_invites INTEGER DEFAULT 0
);

-- Indice per ricerca rapida
CREATE INDEX IF NOT EXISTS idx_host_referral_codes_host_id ON public.host_referral_codes(host_id);
CREATE INDEX IF NOT EXISTS idx_host_referral_codes_code ON public.host_referral_codes(referral_code);

-- 2. CREA TABELLA PER TRACCIARE GLI INVITI
-- ============================================
CREATE TABLE IF NOT EXISTS public.host_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code_id UUID NOT NULL REFERENCES public.host_referral_codes(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_email TEXT,
  invited_phone TEXT,
  invited_role TEXT CHECK (invited_role IN ('host', 'creator', 'traveler', 'jolly')),
  waitlist_request_id UUID REFERENCES public.waitlist_requests(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waitlist_registered', 'approved', 'profile_created', 'first_booking_received')),
  registered_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  profile_created_at TIMESTAMP WITH TIME ZONE,
  first_booking_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_host_referrals_host_id ON public.host_referrals(host_id);
CREATE INDEX IF NOT EXISTS idx_host_referrals_code_id ON public.host_referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_host_referrals_status ON public.host_referrals(status);
CREATE INDEX IF NOT EXISTS idx_host_referrals_email ON public.host_referrals(invited_email);

-- 3. FUNZIONE PER GENERARE CODICE REFERRAL UNIVOCO
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_host_referral_code(p_host_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Genera un codice univoco (8 caratteri alfanumerici)
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_host_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
    
    -- Verifica se esiste già
    SELECT EXISTS(SELECT 1 FROM public.host_referral_codes WHERE referral_code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNZIONE PER CREARE O RECUPERARE CODICE REFERRAL
-- ============================================
CREATE OR REPLACE FUNCTION public.get_or_create_host_referral_code(p_host_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_code_id UUID;
BEGIN
  -- Verifica che l'utente sia un host
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_host_id AND role = 'host') THEN
    RAISE EXCEPTION 'Solo gli host possono generare codici referral';
  END IF;
  
  -- Cerca un codice attivo esistente
  SELECT referral_code, id INTO v_code, v_code_id
  FROM public.host_referral_codes
  WHERE host_id = p_host_id AND is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se non esiste, creane uno nuovo
  IF v_code IS NULL THEN
    v_code := public.generate_host_referral_code(p_host_id);
    
    INSERT INTO public.host_referral_codes (host_id, referral_code)
    VALUES (p_host_id, v_code)
    RETURNING id INTO v_code_id;
  END IF;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNZIONE PER REGISTRARE UN INVITO
-- ============================================
CREATE OR REPLACE FUNCTION public.register_host_referral(
  p_referral_code TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_code_id UUID;
  v_host_id UUID;
  v_referral_id UUID;
BEGIN
  -- Trova il codice referral e l'host
  SELECT id, host_id INTO v_code_id, v_host_id
  FROM public.host_referral_codes
  WHERE referral_code = p_referral_code AND is_active = TRUE;
  
  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Codice referral non valido o scaduto';
  END IF;
  
  -- Verifica che non ci sia già un referral per questa email
  IF EXISTS (SELECT 1 FROM public.host_referrals WHERE invited_email = LOWER(p_email) AND referral_code_id = v_code_id) THEN
    RAISE EXCEPTION 'Email già registrata con questo codice referral';
  END IF;
  
  -- Crea il record di referral
  INSERT INTO public.host_referrals (
    referral_code_id,
    host_id,
    invited_email,
    invited_phone,
    invited_role,
    status
  ) VALUES (
    v_code_id,
    v_host_id,
    LOWER(p_email),
    p_phone,
    p_role,
    'pending'
  ) RETURNING id INTO v_referral_id;
  
  -- Aggiorna il contatore
  UPDATE public.host_referral_codes
  SET total_invites = total_invites + 1
  WHERE id = v_code_id;
  
  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGER PER AGGIORNARE STATO REFERRAL QUANDO SI REGISTRA ALLA WAITLIST
-- ============================================
CREATE OR REPLACE FUNCTION public.update_referral_on_waitlist_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Se l'utente si registra alla waitlist con un referral code
  IF NEW.referral_code IS NOT NULL THEN
    -- Cerca il referral corrispondente
    UPDATE public.host_referrals
    SET 
      waitlist_request_id = NEW.id,
      status = 'waitlist_registered',
      registered_at = NOW(),
      updated_at = NOW()
    WHERE 
      invited_email = LOWER(NEW.email)
      AND status = 'pending';
    
    -- Aggiorna contatore active_invites
    UPDATE public.host_referral_codes
    SET active_invites = (
      SELECT COUNT(*) 
      FROM public.host_referrals 
      WHERE referral_code_id = host_referral_codes.id 
        AND status IN ('waitlist_registered', 'approved', 'profile_created', 'first_booking_received')
    )
    WHERE id IN (
      SELECT referral_code_id 
      FROM public.host_referrals 
      WHERE invited_email = LOWER(NEW.email)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_referral_on_waitlist ON public.waitlist_requests;
CREATE TRIGGER trigger_update_referral_on_waitlist
  AFTER INSERT ON public.waitlist_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_on_waitlist_registration();

-- 7. TRIGGER PER AGGIORNARE STATO REFERRAL QUANDO VIENE APPROVATO
-- ============================================
CREATE OR REPLACE FUNCTION public.update_referral_on_waitlist_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Se lo stato cambia in "approved"
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE public.host_referrals
    SET 
      status = 'approved',
      approved_at = NOW(),
      updated_at = NOW()
    WHERE 
      waitlist_request_id = NEW.id
      AND status = 'waitlist_registered';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_referral_on_approval ON public.waitlist_requests;
CREATE TRIGGER trigger_update_referral_on_approval
  AFTER UPDATE ON public.waitlist_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_on_waitlist_approval();

-- 8. TRIGGER PER AGGIORNARE STATO REFERRAL QUANDO VIENE CREATO IL PROFILO
-- ============================================
CREATE OR REPLACE FUNCTION public.update_referral_on_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se viene creato un profilo, verifica se c'è un referral associato
  UPDATE public.host_referrals
  SET 
    profile_id = NEW.id,
    status = 'profile_created',
    profile_created_at = NOW(),
    updated_at = NOW()
  WHERE 
    invited_email = LOWER(NEW.email)
    AND status IN ('approved', 'waitlist_registered')
    AND profile_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_referral_on_profile ON public.profiles;
CREATE TRIGGER trigger_update_referral_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_referral_on_profile_creation();

-- 9. TRIGGER PER AGGIORNARE STATO REFERRAL QUANDO VIENE RICEVUTA LA PRIMA PRENOTAZIONE
-- ============================================
CREATE OR REPLACE FUNCTION public.update_referral_on_first_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_id UUID;
  v_host_id UUID;
BEGIN
  -- Verifica se questa è la prima prenotazione per questo host (owner_id)
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings 
    WHERE property_id IN (
      SELECT id FROM public.properties WHERE owner_id = NEW.property_id
    )
    AND id != NEW.id
    AND created_at < NEW.created_at
  ) THEN
    -- Trova il referral associato al profilo che ha fatto la prenotazione
    SELECT hr.id, hr.host_id INTO v_referral_id, v_host_id
    FROM public.host_referrals hr
    JOIN public.profiles p ON p.id = hr.profile_id
    JOIN public.properties prop ON prop.owner_id = p.id
    WHERE prop.id = NEW.property_id
      AND hr.status = 'profile_created'
      AND hr.first_booking_at IS NULL
    LIMIT 1;
    
    -- Se trovato, aggiorna lo stato
    IF v_referral_id IS NOT NULL THEN
      UPDATE public.host_referrals
      SET 
        status = 'first_booking_received',
        first_booking_at = NOW(),
        updated_at = NOW()
      WHERE id = v_referral_id;
      
      -- Crea una notifica per l'host invitante
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
      ) VALUES (
        v_host_id,
        'referral_first_booking',
        'Prima prenotazione ricevuta!',
        'L''utente che hai invitato ha ricevuto la sua prima prenotazione!',
        jsonb_build_object(
          'referral_id', v_referral_id,
          'booking_id', NEW.id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Nota: Questo trigger richiede che esista la tabella bookings
-- Se non esiste, commenta questa sezione
-- DROP TRIGGER IF EXISTS trigger_update_referral_on_booking ON public.bookings;
-- CREATE TRIGGER trigger_update_referral_on_booking
--   AFTER INSERT ON public.bookings
--   FOR EACH ROW
--   EXECUTE FUNCTION public.update_referral_on_first_booking();

-- 10. AGGIUNGI COLONNA referral_code ALLA TABELLA waitlist_requests
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'waitlist_requests' 
    AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE public.waitlist_requests ADD COLUMN referral_code TEXT;
    CREATE INDEX IF NOT EXISTS idx_waitlist_requests_referral_code ON public.waitlist_requests(referral_code);
  END IF;
END $$;

-- 11. RLS POLICIES
-- ============================================
ALTER TABLE public.host_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Gli host possono vedere solo i propri codici referral
DROP POLICY IF EXISTS "Hosts can view their own referral codes" ON public.host_referral_codes;
CREATE POLICY "Hosts can view their own referral codes"
  ON public.host_referral_codes FOR SELECT
  USING (auth.uid() = host_id);

-- Policy: Gli host possono creare i propri codici referral (tramite funzione)
DROP POLICY IF EXISTS "Hosts can create their own referral codes" ON public.host_referral_codes;
CREATE POLICY "Hosts can create their own referral codes"
  ON public.host_referral_codes FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Policy: Gli host possono vedere solo i propri referral
DROP POLICY IF EXISTS "Hosts can view their own referrals" ON public.host_referrals;
CREATE POLICY "Hosts can view their own referrals"
  ON public.host_referrals FOR SELECT
  USING (auth.uid() = host_id);

-- Policy: Gli utenti possono vedere i propri referral (per verificare stato)
DROP POLICY IF EXISTS "Users can view referrals for their email" ON public.host_referrals;
CREATE POLICY "Users can view referrals for their email"
  ON public.host_referrals FOR SELECT
  USING (
    invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 12. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT ON public.host_referral_codes TO authenticated;
GRANT SELECT ON public.host_referrals TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_host_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_host_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_host_referral(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 13. COMMENTI PER DOCUMENTAZIONE
-- ============================================
COMMENT ON TABLE public.host_referral_codes IS 'Codici referral univoci generati dagli host per invitare altri utenti';
COMMENT ON TABLE public.host_referrals IS 'Traccia gli inviti degli host e lo stato di registrazione degli utenti invitati';
COMMENT ON COLUMN public.host_referrals.status IS 'Stato del referral: pending, waitlist_registered, approved, profile_created, first_booking_received';
COMMENT ON FUNCTION public.get_or_create_host_referral_code(UUID) IS 'Crea o recupera un codice referral per un host';
COMMENT ON FUNCTION public.register_host_referral(TEXT, TEXT, TEXT, TEXT) IS 'Registra un nuovo invito tramite codice referral';

-- ============================================
-- FINE SCRIPT
-- ============================================
