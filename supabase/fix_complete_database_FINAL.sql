-- ============================================
-- FIX COMPLETO DEL DATABASE - VERSIONE FINALE
-- ============================================
-- Questa query risolve TUTTI i problemi:
-- 1. Aggiunge colonna onboarding_completed a profiles
-- 2. Aggiunge altre colonne mancanti a profiles
-- 3. Aggiorna il constraint per i 4 ruoli
-- 4. Corregge le policy RLS per properties
-- ============================================

-- 1. AGGIUNGI COLONNE MANCANTI ALLA TABELLA PROFILES
-- ============================================

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
    RAISE NOTICE 'Colonna onboarding_completed aggiunta';
  ELSE
    RAISE NOTICE 'Colonna onboarding_completed già esistente';
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
    RAISE NOTICE 'Colonna onboarding_step aggiunta';
  END IF;
END $$;

-- Aggiungi email se non esiste
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
    RAISE NOTICE 'Colonna email aggiunta e popolata';
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
    RAISE NOTICE 'Colonna points aggiunta';
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
    RAISE NOTICE 'Colonna updated_at aggiunta';
  END IF;
END $$;

-- 2. AGGIORNA IL CONSTRAINT DEL RUOLO PER INCLUDERE TUTTI I 4 RUOLI
-- ============================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK ((role IS NULL) OR (role IN ('host', 'creator', 'traveler', 'manager')));

-- 3. CORREGGE LE POLICY RLS PER PROPERTIES
-- ============================================

-- Disabilita RLS temporaneamente
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- Elimina tutte le policy esistenti
DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- Verifica quale colonna esiste (host_id o owner_id)
DO $$
DECLARE
  uses_host_id BOOLEAN;
  uses_owner_id BOOLEAN;
BEGIN
  -- Verifica se esiste host_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'host_id'
  ) INTO uses_host_id;
  
  -- Verifica se esiste owner_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'owner_id'
  ) INTO uses_owner_id;
  
  -- Crea policy per SELECT (tutti possono vedere)
  EXECUTE 'CREATE POLICY "Properties are viewable by everyone" ON public.properties FOR SELECT USING (true)';
  
  IF uses_owner_id THEN
    -- Crea policy usando owner_id
    EXECUTE 'CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = owner_id)';
    EXECUTE 'CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id)';
    EXECUTE 'CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = owner_id)';
    RAISE NOTICE 'Policy create usando owner_id';
  ELSIF uses_host_id THEN
    -- Crea policy usando host_id
    EXECUTE 'CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT WITH CHECK (auth.uid() = host_id)';
    EXECUTE 'CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id)';
    EXECUTE 'CREATE POLICY "Users can delete own properties" ON public.properties FOR DELETE USING (auth.uid() = host_id)';
    RAISE NOTICE 'Policy create usando host_id';
  ELSE
    RAISE EXCEPTION 'Né host_id né owner_id trovati nella tabella properties!';
  END IF;
END $$;

-- Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FINE
-- ============================================

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

-- Aggiungi il nuovo constraint con tutti e 4 i ruoli (gestisce sia TEXT che ENUM)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK ((role::text = ANY (ARRAY['host'::text, 'creator'::text, 'traveler'::text, 'manager'::text])) OR 
         (role IS NULL));

-- 3. CORREGGE LE POLICY RLS PER PROPERTIES (USA owner_id, non host_id)
-- ============================================

-- Rimuovi tutte le policy esistenti per properties
DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- Crea policy per SELECT (tutti possono vedere le properties)
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT 
  USING (true);

-- Crea policy per INSERT usando owner_id
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

-- 4. AGGIUNGI COLONNE MANCANTI ALLA TABELLA PROPERTIES
-- ============================================

-- Aggiungi name se manca (potrebbe essere title)
DO $$ 
BEGIN
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
    ELSE
      ALTER TABLE public.properties ADD COLUMN name TEXT;
    END IF;
  END IF;
END $$;

-- Aggiungi altre colonne standard se mancanti
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'property_type') THEN
    ALTER TABLE public.properties ADD COLUMN property_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'address') THEN
    ALTER TABLE public.properties ADD COLUMN address TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'city') THEN
    ALTER TABLE public.properties ADD COLUMN city TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'country') THEN
    ALTER TABLE public.properties ADD COLUMN country TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'price_per_night') THEN
    ALTER TABLE public.properties ADD COLUMN price_per_night DECIMAL(10, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'max_guests') THEN
    ALTER TABLE public.properties ADD COLUMN max_guests INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bedrooms') THEN
    ALTER TABLE public.properties ADD COLUMN bedrooms INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'bathrooms') THEN
    ALTER TABLE public.properties ADD COLUMN bathrooms INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'is_active') THEN
    ALTER TABLE public.properties ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- 5. VERIFICA E CORREGGE I DATI ESISTENTI
-- ============================================

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON public.properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FINE DELLA QUERY DI FIX
-- ============================================

