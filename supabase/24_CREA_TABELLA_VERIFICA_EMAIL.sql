-- ============================================
-- CREA TABELLA PER TRACCIARE VERIFICA EMAIL E TENTATIVI RINVIO
-- ============================================
-- Questa tabella traccia:
-- 1. Prima verifica email (completata o meno)
-- 2. Seconda verifica email per domini personalizzati (completata o meno)
-- 3. Tentativi di rinvio codice con limiti temporali
-- ============================================

-- Crea tabella per tracciare verifica email
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  first_verification_completed BOOLEAN DEFAULT FALSE,
  first_verification_completed_at TIMESTAMP WITH TIME ZONE,
  second_verification_required BOOLEAN DEFAULT FALSE, -- true per domini personalizzati
  second_verification_completed BOOLEAN DEFAULT FALSE,
  second_verification_completed_at TIMESTAMP WITH TIME ZONE,
  second_verification_code TEXT, -- Codice OTP per seconda verifica
  second_verification_code_expires_at TIMESTAMP WITH TIME ZONE,
  resend_attempts INTEGER DEFAULT 0, -- Contatore tentativi rinvio
  last_resend_at TIMESTAMP WITH TIME ZONE, -- Ultimo tentativo di rinvio
  next_resend_allowed_at TIMESTAMP WITH TIME ZONE, -- Prossimo rinvio permesso
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON public.email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications(email);

-- Disabilita RLS per semplicità
ALTER TABLE public.email_verifications DISABLE ROW LEVEL SECURITY;

-- Funzione helper per verificare se un dominio richiede seconda verifica
CREATE OR REPLACE FUNCTION public.requires_second_verification(email_domain TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Domini che NON richiedono seconda verifica
  IF email_domain IN ('gmail.com', 'outlook.it', 'libero.it', 'hotmail.com') THEN
    RETURN FALSE;
  END IF;
  
  -- Tutti gli altri domini richiedono seconda verifica
  RETURN TRUE;
END;
$$;

-- Verifica
SELECT 
    'TABELLA EMAIL_VERIFICATIONS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'email_verifications'
ORDER BY ordinal_position;

