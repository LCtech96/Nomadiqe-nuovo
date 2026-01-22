-- ============================================
-- SISTEMA REFERRAL PER CREATOR
-- ============================================
-- Permette ai creator di invitare altri utenti e tracciare le registrazioni
-- ============================================

-- 1. CREA TABELLA PER I CODICI REFERRAL DEI CREATOR
-- ============================================
CREATE TABLE IF NOT EXISTS public.creator_referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  total_invites INTEGER DEFAULT 0,
  active_invites INTEGER DEFAULT 0
);

-- Indice per ricerca rapida
CREATE INDEX IF NOT EXISTS idx_creator_referral_codes_creator_id ON public.creator_referral_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_referral_codes_code ON public.creator_referral_codes(referral_code);

-- 2. CREA TABELLA PER TRACCIARE GLI INVITI
-- ============================================
CREATE TABLE IF NOT EXISTS public.creator_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referral_code_id UUID NOT NULL REFERENCES public.creator_referral_codes(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_creator_referrals_creator_id ON public.creator_referrals(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_referrals_code_id ON public.creator_referrals(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_creator_referrals_status ON public.creator_referrals(status);
CREATE INDEX IF NOT EXISTS idx_creator_referrals_email ON public.creator_referrals(invited_email);

-- 3. FUNZIONE PER GENERARE CODICE REFERRAL UNIVOCO
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_creator_referral_code(p_creator_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Genera un codice univoco (8 caratteri alfanumerici)
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_creator_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
    
    -- Verifica se esiste già (controlla sia host che creator codes)
    SELECT EXISTS(
      SELECT 1 FROM public.creator_referral_codes WHERE referral_code = v_code
      UNION
      SELECT 1 FROM public.host_referral_codes WHERE referral_code = v_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNZIONE PER CREARE O RECUPERARE CODICE REFERRAL
-- ============================================
CREATE OR REPLACE FUNCTION public.get_or_create_creator_referral_code(p_creator_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_code_id UUID;
BEGIN
  -- Verifica che l'utente sia un creator
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_creator_id AND role = 'creator') THEN
    RAISE EXCEPTION 'Solo i creator possono generare codici referral';
  END IF;
  
  -- Cerca un codice attivo esistente
  SELECT referral_code, id INTO v_code, v_code_id
  FROM public.creator_referral_codes
  WHERE creator_id = p_creator_id AND is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se non esiste, creane uno nuovo
  IF v_code IS NULL THEN
    v_code := public.generate_creator_referral_code(p_creator_id);
    
    INSERT INTO public.creator_referral_codes (creator_id, referral_code)
    VALUES (p_creator_id, v_code)
    RETURNING id INTO v_code_id;
  END IF;
  
  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNZIONE PER REGISTRARE UN INVITO
-- ============================================
CREATE OR REPLACE FUNCTION public.register_creator_referral(
  p_referral_code TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_code_id UUID;
  v_creator_id UUID;
  v_referral_id UUID;
BEGIN
  -- Trova il codice referral e il creator
  SELECT id, creator_id INTO v_code_id, v_creator_id
  FROM public.creator_referral_codes
  WHERE referral_code = p_referral_code AND is_active = TRUE;
  
  IF v_code_id IS NULL THEN
    RAISE EXCEPTION 'Codice referral non valido o scaduto';
  END IF;
  
  -- Verifica che non ci sia già un referral per questa email
  IF EXISTS (SELECT 1 FROM public.creator_referrals WHERE invited_email = LOWER(p_email) AND referral_code_id = v_code_id) THEN
    RAISE EXCEPTION 'Email già registrata con questo codice referral';
  END IF;
  
  -- Crea il record di referral
  INSERT INTO public.creator_referrals (
    referral_code_id,
    creator_id,
    invited_email,
    invited_phone,
    invited_role,
    status
  ) VALUES (
    v_code_id,
    v_creator_id,
    LOWER(p_email),
    p_phone,
    p_role,
    'pending'
  ) RETURNING id INTO v_referral_id;
  
  -- Aggiorna il contatore
  UPDATE public.creator_referral_codes
  SET total_invites = total_invites + 1
  WHERE id = v_code_id;
  
  RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGER PER AGGIORNARE LO STATO QUANDO L'UTENTE SI REGISTRA ALLA WAITLIST
-- ============================================
CREATE OR REPLACE FUNCTION public.update_creator_referral_on_waitlist_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Aggiorna il referral se esiste un codice referral
  IF NEW.referral_code IS NOT NULL THEN
    UPDATE public.creator_referrals
    SET 
      waitlist_request_id = NEW.id,
      status = 'waitlist_registered',
      registered_at = NOW(),
      updated_at = NOW()
    WHERE 
      invited_email = LOWER(NEW.email)
      AND referral_code_id = (
        SELECT id FROM public.creator_referral_codes 
        WHERE referral_code = UPPER(NEW.referral_code)
      );
    
    -- Aggiorna il contatore di inviti attivi
    UPDATE public.creator_referral_codes
    SET active_invites = (
      SELECT COUNT(*) FROM public.creator_referrals
      WHERE referral_code_id = (
        SELECT id FROM public.creator_referral_codes 
        WHERE referral_code = UPPER(NEW.referral_code)
      )
      AND status IN ('waitlist_registered', 'approved', 'profile_created', 'first_booking_received')
    )
    WHERE referral_code = UPPER(NEW.referral_code);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger
DROP TRIGGER IF EXISTS trigger_update_creator_referral_on_waitlist ON public.waitlist_requests;
CREATE TRIGGER trigger_update_creator_referral_on_waitlist
  AFTER INSERT ON public.waitlist_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creator_referral_on_waitlist_registration();

-- 7. TRIGGER PER AGGIORNARE LO STATO QUANDO L'UTENTE CREA IL PROFILO
-- ============================================
CREATE OR REPLACE FUNCTION public.update_creator_referral_on_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Cerca referral basato sull'email
  UPDATE public.creator_referrals
  SET 
    profile_id = NEW.id,
    status = CASE 
      WHEN status = 'waitlist_registered' THEN 'profile_created'
      ELSE status
    END,
    profile_created_at = NOW(),
    updated_at = NOW()
  WHERE 
    invited_email = LOWER(NEW.email)
    AND status IN ('waitlist_registered', 'approved');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger
DROP TRIGGER IF EXISTS trigger_update_creator_referral_on_profile ON public.profiles;
CREATE TRIGGER trigger_update_creator_referral_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creator_referral_on_profile_creation();

-- 8. TRIGGER PER NOTIFICARE IL CREATOR AL PRIMO BOOKING
-- ============================================
CREATE OR REPLACE FUNCTION public.update_creator_referral_on_first_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_id UUID;
  v_creator_id UUID;
  v_creator_email TEXT;
BEGIN
  -- Cerca se c'è un referral per questo utente che ha fatto il booking
  SELECT cr.id, cr.creator_id INTO v_referral_id, v_creator_id
  FROM public.creator_referrals cr
  WHERE cr.profile_id = NEW.traveler_id
    AND cr.status = 'profile_created'
    AND cr.first_booking_at IS NULL
  LIMIT 1;
  
  -- Se trovato, aggiorna lo stato
  IF v_referral_id IS NOT NULL THEN
    UPDATE public.creator_referrals
    SET 
      status = 'first_booking_received',
      first_booking_at = NOW(),
      updated_at = NOW()
    WHERE id = v_referral_id;
    
    -- Ottieni l'email del creator per la notifica
    SELECT email INTO v_creator_email
    FROM public.profiles
    WHERE id = v_creator_id;
    
    -- Qui potresti aggiungere la logica per inviare una notifica
    -- Per ora lo lasciamo come placeholder
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crea il trigger (commentato perché potrebbe essere aggiunto dopo)
-- DROP TRIGGER IF EXISTS trigger_update_creator_referral_on_booking ON public.bookings;
-- CREATE TRIGGER trigger_update_creator_referral_on_booking
--   AFTER INSERT ON public.bookings
--   FOR EACH ROW
--   EXECUTE FUNCTION public.update_creator_referral_on_first_booking();

-- 9. RLS POLICIES
-- ============================================
ALTER TABLE public.creator_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_referrals ENABLE ROW LEVEL SECURITY;

-- Policy: I creator possono vedere solo i propri codici referral
DROP POLICY IF EXISTS "Creators can view their own referral codes" ON public.creator_referral_codes;
CREATE POLICY "Creators can view their own referral codes"
  ON public.creator_referral_codes FOR SELECT
  USING (auth.uid() = creator_id);

-- Policy: I creator possono creare i propri codici referral (tramite funzione)
DROP POLICY IF EXISTS "Creators can create their own referral codes" ON public.creator_referral_codes;
CREATE POLICY "Creators can create their own referral codes"
  ON public.creator_referral_codes FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Policy: I creator possono vedere solo i propri referral
DROP POLICY IF EXISTS "Creators can view their own referrals" ON public.creator_referrals;
CREATE POLICY "Creators can view their own referrals"
  ON public.creator_referrals FOR SELECT
  USING (auth.uid() = creator_id);

-- Policy: Gli utenti invitati possono vedere i propri referral
DROP POLICY IF EXISTS "Users can view creator referrals for their email" ON public.creator_referrals;
CREATE POLICY "Users can view creator referrals for their email"
  ON public.creator_referrals FOR SELECT
  USING (
    invited_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Policy per UPDATE (per i trigger)
DROP POLICY IF EXISTS "System can update creator referrals" ON public.creator_referrals;
CREATE POLICY "System can update creator referrals"
  ON public.creator_referrals FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- 10. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT ON public.creator_referral_codes TO authenticated;
GRANT SELECT ON public.creator_referrals TO authenticated;
GRANT UPDATE ON public.creator_referrals TO authenticated;
GRANT UPDATE ON public.creator_referrals TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_creator_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_creator_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_creator_referral(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 11. COMMENTI PER DOCUMENTAZIONE
-- ============================================
COMMENT ON TABLE public.creator_referral_codes IS 'Codici referral univoci generati dai creator per invitare altri utenti';
COMMENT ON TABLE public.creator_referrals IS 'Traccia gli inviti dei creator e lo stato di registrazione degli utenti invitati';
COMMENT ON COLUMN public.creator_referrals.status IS 'Stato del referral: pending, waitlist_registered, approved, profile_created, first_booking_received';
COMMENT ON FUNCTION public.get_or_create_creator_referral_code(UUID) IS 'Crea o recupera un codice referral per un creator';
COMMENT ON FUNCTION public.register_creator_referral(TEXT, TEXT, TEXT, TEXT) IS 'Registra un nuovo invito tramite codice referral di un creator';

-- ============================================
-- FINE SCRIPT
-- ============================================
