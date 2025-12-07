-- ============================================
-- FIX COMPLETO: Tutti i problemi del database
-- ============================================
-- Questa query risolve:
-- 1. Errore RLS per properties table
-- 2. Aggiunge tutti i ruoli (host, creator, traveler, manager)
-- 3. Aggiunge colonne mancanti a profiles
-- 4. Corregge le policy RLS per properties usando owner_id
-- ============================================

-- 1. AGGIUNGI LE COLONNE MANCANTI ALLA TABELLA PROFILES
-- ============================================

-- Aggiungi email se non esiste (per compatibilità)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    -- Popola email dagli utenti auth se possibile
    UPDATE public.profiles p
    SET email = au.email
    FROM auth.users au
    WHERE p.id = au.id AND p.email IS NULL;
  END IF;
END $$;

-- Aggiungi onboarding_completed se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Aggiungi onboarding_step se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_step INTEGER DEFAULT 0;
  END IF;
END $$;

-- Aggiungi points se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'points'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN points INTEGER DEFAULT 0;
  END IF;
END $$;

-- Aggiungi updated_at se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 2. AGGIORNA IL CONSTRAINT DEL RUOLO PER INCLUDERE TUTTI I 4 RUOLI
-- ============================================

-- Rimuovi il vecchio constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Aggiungi il nuovo constraint con tutti e 4 i ruoli
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['host'::text, 'creator'::text, 'traveler'::text, 'manager'::text]));

-- 3. CORREGGE LE POLICY RLS PER PROPERTIES
-- ============================================

-- Rimuovi tutte le policy esistenti per properties
DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;

-- Crea policy per SELECT (tutti possono vedere le properties attive)
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT 
  USING (true);

-- Crea policy per INSERT usando owner_id (il nome corretto nel database)
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- Crea policy per UPDATE usando owner_id
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Crea policy per DELETE usando owner_id
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- 4. AGGIUNGI COLONNE MANCANTI ALLA TABELLA PROPERTIES (se necessario)
-- ============================================

-- Aggiungi colonne se la struttura è diversa dallo schema atteso
DO $$ 
BEGIN
  -- Verifica se la colonna host_id esiste (potrebbe essere owner_id nel database reale)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'host_id'
  ) THEN
    -- Se non esiste host_id ma esiste owner_id, creiamo un alias o aggiungiamo host_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'owner_id'
    ) THEN
      -- Aggiungi host_id come alias/colonna alternativa
      ALTER TABLE public.properties ADD COLUMN host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
      -- Copia i dati da owner_id a host_id
      UPDATE public.properties SET host_id = owner_id WHERE host_id IS NULL;
    END IF;
  END IF;
END $$;

-- Aggiungi altre colonne necessarie se mancanti
DO $$ 
BEGIN
  -- Aggiungi name se manca (potrebbe essere title)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'name'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'properties' 
      AND column_name = 'title'
    ) THEN
      ALTER TABLE public.properties ADD COLUMN name TEXT;
      UPDATE public.properties SET name = title WHERE name IS NULL;
    END IF;
  END IF;
END $$;

-- Aggiungi colonne standard se mancanti
DO $$ 
BEGIN
  -- Aggiungi property_type se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'property_type'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN property_type TEXT;
  END IF;
  
  -- Aggiungi address se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN address TEXT;
  END IF;
  
  -- Aggiungi city se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'city'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN city TEXT;
  END IF;
  
  -- Aggiungi country se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'country'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN country TEXT;
  END IF;
  
  -- Aggiungi price_per_night se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'price_per_night'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN price_per_night DECIMAL(10, 2);
  END IF;
  
  -- Aggiungi max_guests se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'max_guests'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN max_guests INTEGER;
  END IF;
  
  -- Aggiungi bedrooms se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'bedrooms'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN bedrooms INTEGER;
  END IF;
  
  -- Aggiungi bathrooms se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'bathrooms'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN bathrooms INTEGER;
  END IF;
  
  -- Aggiungi is_active se manca
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- 5. VERIFICA E CORREGGE I DATI ESISTENTI
-- ============================================

-- Assicurati che tutti i profili abbiano valori di default per i campi aggiunti
UPDATE public.profiles 
SET 
  onboarding_completed = COALESCE(onboarding_completed, FALSE),
  onboarding_step = COALESCE(onboarding_step, 0),
  points = COALESCE(points, 0),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE onboarding_completed IS NULL 
   OR onboarding_step IS NULL 
   OR points IS NULL 
   OR updated_at IS NULL;

-- 6. CREA/RIGENERA TRIGGER PER UPDATED_AT
-- ============================================

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger per properties
DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FINE DELLA QUERY DI FIX
-- ============================================
-- Ora dovresti essere in grado di:
-- 1. Inserire properties senza errori RLS
-- 2. Usare tutti e 4 i ruoli (host, creator, traveler, manager)
-- 3. Avere tutte le colonne necessarie nel database
-- ============================================

