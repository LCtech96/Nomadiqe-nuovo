-- ============================================
-- AGGIUNGI COLONNA host_level PER GESTIRE LIVELLI HOST
-- ============================================
-- Aggiunge una colonna per tracciare il livello dell'host
-- basato sugli utenti invitati: Base, Advanced, Rubino, Zaffiro, Prime
-- ============================================

-- Aggiungi colonna host_level a profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'host_level'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN host_level TEXT DEFAULT 'Base' CHECK (host_level IN ('Base', 'Advanced', 'Rubino', 'Zaffiro', 'Prime'));
    RAISE NOTICE 'Colonna host_level aggiunta a profiles';
  END IF;
END $$;

-- Crea indice per performance
CREATE INDEX IF NOT EXISTS idx_profiles_host_level ON public.profiles(host_level) WHERE role = 'host';

-- Imposta luca corrao host come Prime (cerca per username o full_name)
UPDATE public.profiles
SET host_level = 'Prime'
WHERE (username ILIKE '%lucacorrao%' OR username ILIKE '%luca%corrao%' OR full_name ILIKE '%luca%corrao%' OR full_name ILIKE '%Luca Corrao%')
  AND role = 'host';

-- Commento per documentazione
COMMENT ON COLUMN public.profiles.host_level IS 'Livello dell''host basato su utenti invitati: Base, Advanced, Rubino, Zaffiro, Prime';

-- Notifica PostgREST per ricaricare lo schema
NOTIFY pgrst, 'reload schema';

