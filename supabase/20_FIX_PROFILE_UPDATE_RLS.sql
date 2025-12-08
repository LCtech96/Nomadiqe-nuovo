-- ============================================
-- FIX PROFILE UPDATE - RLS POLICIES E VERIFICA
-- ============================================
-- Questo script assicura che gli utenti possano aggiornare
-- correttamente il proprio profilo (nome, username, avatar_url)
-- ============================================

-- 1. VERIFICA E CORREGGE RLS POLICIES
-- ============================================

-- Rimuovi policy esistenti per UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.profiles;

-- Crea policy per UPDATE che permette agli utenti di aggiornare il proprio profilo
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. VERIFICA CHE LE COLONNE ESISTANO
-- ============================================

-- Assicurati che la colonna avatar_url esista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Colonna avatar_url aggiunta';
  ELSE
    RAISE NOTICE 'Colonna avatar_url già esistente';
  END IF;
END $$;

-- Assicurati che la colonna username_changed_at esista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username_changed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username_changed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Colonna username_changed_at aggiunta';
  ELSE
    RAISE NOTICE 'Colonna username_changed_at già esistente';
  END IF;
END $$;

-- 3. CREA FUNZIONE PER FORZARE AGGIORNAMENTO
-- ============================================
-- Questa funzione può essere usata per forzare l'aggiornamento
-- anche se ci sono problemi con RLS

CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica che l'utente stia aggiornando il proprio profilo
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Non puoi aggiornare il profilo di un altro utente';
  END IF;

  -- Aggiorna il profilo
  -- IMPORTANT: Se un parametro è NULL, lo imposta a NULL (non mantiene il valore esistente)
  -- Questo permette di sovrascrivere i valori
  UPDATE public.profiles
  SET
    full_name = p_full_name,
    username = p_username,
    bio = p_bio,
    avatar_url = p_avatar_url,
    updated_at = NOW(),
    username_changed_at = CASE 
      WHEN p_username IS NOT NULL AND p_username != (SELECT username FROM public.profiles WHERE id = p_user_id)
      THEN NOW() 
      ELSE username_changed_at 
    END
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. VERIFICA FINALE
-- ============================================

DO $$
DECLARE
  policy_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Verifica policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) INTO policy_exists;

  -- Verifica funzione
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_user_profile'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO function_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICA FINALE:';
  RAISE NOTICE 'Policy UPDATE esistente: %', policy_exists;
  RAISE NOTICE 'Funzione update_user_profile esistente: %', function_exists;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- FINE
-- ============================================
