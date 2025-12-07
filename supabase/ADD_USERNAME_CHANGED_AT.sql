-- ============================================
-- AGGIUNGI COLONNA username_changed_at
-- ============================================
-- Questa colonna traccia quando l'username è stato cambiato l'ultima volta
-- Necessaria per implementare il limite settimanale di cambio username
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username_changed_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username_changed_at TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Colonna username_changed_at aggiunta con successo';
  ELSE
    RAISE NOTICE 'Colonna username_changed_at già esistente';
  END IF;
END $$;

-- ============================================
-- FINE
-- ============================================



