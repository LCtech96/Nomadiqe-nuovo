-- Livello struttura (1-4) per host, impostabile dall'admin
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'structure_level'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN structure_level INTEGER CHECK (structure_level >= 1 AND structure_level <= 4);
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.structure_level IS 'Livello struttura (1-4) per host, impostato dall''admin. 1=basic, 4=top.';

-- ============================================
-- FINE
