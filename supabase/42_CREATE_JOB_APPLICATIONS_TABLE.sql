-- Crea tabella per le candidature lavorative
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  description TEXT NOT NULL,
  cv_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'contacted', 'rejected'))
);

-- Crea indice per ricerca per posizione
CREATE INDEX IF NOT EXISTS idx_job_applications_position ON job_applications(position);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);

-- Abilita RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Policy: solo admin possono leggere le candidature (da configurare in base alle esigenze)
-- Per ora, nessuno può leggere direttamente (solo tramite admin client)
CREATE POLICY "Only service role can insert job applications"
  ON job_applications FOR INSERT
  WITH CHECK (true);

-- Policy: nessuno può leggere tramite client (solo tramite service role)
CREATE POLICY "No public read access to job applications"
  ON job_applications FOR SELECT
  USING (false);

COMMENT ON TABLE job_applications IS 'Tabella per le candidature lavorative a Nomadiqe';
COMMENT ON COLUMN job_applications.position IS 'Posizione per cui si candida (es: client-success-manager, sales, marketing, cto, vp-business-development)';
COMMENT ON COLUMN job_applications.phone_country_code IS 'Prefisso internazionale (es: +39, +1)';
COMMENT ON COLUMN job_applications.cv_url IS 'URL del PDF del curriculum caricato su Vercel Blob';

