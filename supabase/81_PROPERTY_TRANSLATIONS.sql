-- Tabella per le traduzioni delle proprietà
-- ============================================

-- Crea tabella property_translations
CREATE TABLE IF NOT EXISTS public.property_translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  locale TEXT NOT NULL, -- 'it', 'en', 'es', 'fr', 'de'
  name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, locale)
);

-- Crea index per performance
CREATE INDEX IF NOT EXISTS idx_property_translations_property_id ON public.property_translations(property_id);
CREATE INDEX IF NOT EXISTS idx_property_translations_locale ON public.property_translations(locale);

-- Abilita RLS
ALTER TABLE public.property_translations ENABLE ROW LEVEL SECURITY;

-- Policy: chiunque può leggere le traduzioni
DROP POLICY IF EXISTS "Anyone can view property translations" ON public.property_translations;
CREATE POLICY "Anyone can view property translations"
  ON public.property_translations FOR SELECT
  USING (true);

-- Policy: solo gli owner delle proprietà possono modificare le traduzioni
DROP POLICY IF EXISTS "Property owners can manage translations" ON public.property_translations;
CREATE POLICY "Property owners can manage translations"
  ON public.property_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_translations.property_id
      AND p.owner_id = auth.uid()
    )
  );

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_property_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_property_translations_updated_at ON public.property_translations;
CREATE TRIGGER trigger_update_property_translations_updated_at
  BEFORE UPDATE ON public.property_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_property_translations_updated_at();

-- ============================================
-- FINE
