-- ============================================
-- AGGIUNGI CAMPO PER CONTARE AZIONI AI
-- ============================================
-- Aggiunge un campo per tracciare quante azioni ha compiuto l'utente
-- che attivano i messaggi AI (per mostrare disclaimer solo per prime 10)
-- ============================================

-- Aggiungi colonna ai_actions_count a profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'ai_actions_count'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN ai_actions_count INTEGER DEFAULT 0 NOT NULL;
    RAISE NOTICE 'Colonna ai_actions_count aggiunta a profiles';
  END IF;
END $$;

-- Crea indice per performance
CREATE INDEX IF NOT EXISTS idx_profiles_ai_actions_count ON public.profiles(ai_actions_count);

-- Commento per documentazione
COMMENT ON COLUMN public.profiles.ai_actions_count IS 'Contatore delle azioni che attivano messaggi AI. Usato per mostrare disclaimer solo per le prime 10 azioni';

-- Notifica PostgREST per ricaricare lo schema
NOTIFY pgrst, 'reload schema';

