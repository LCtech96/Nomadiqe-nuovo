-- Aggiornamento schema manager_services per supportare nuovi tipi di servizio
-- ============================================

-- 1. Aggiungi nuovo tipo di servizio "supplier" all'enum
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'supplier';

-- 2. Aggiungi nuovi campi alla tabella manager_services
ALTER TABLE public.manager_services 
  ADD COLUMN IF NOT EXISTS percentage_commission DECIMAL(5, 2), -- Per gestione proprietà
  ADD COLUMN IF NOT EXISTS price_per_route JSONB, -- Per autista: {"<50km": 50, ">50km": 100, ...}
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT, -- Per autista
  ADD COLUMN IF NOT EXISTS service_metadata JSONB; -- Per altri dati specifici del servizio

-- 3. Crea tabella per i prodotti del catalogo fornitore
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES public.manager_services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 0, -- Quantità disponibile
  delivery_time_days INTEGER, -- Tempi di consegna in giorni
  minimum_order INTEGER DEFAULT 1, -- Quantità minima ordine
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Crea index per performance
CREATE INDEX IF NOT EXISTS idx_supplier_products_service_id ON public.supplier_products(service_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_is_active ON public.supplier_products(is_active);

-- 5. Aggiungi RLS policies per supplier_products
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active supplier products" ON public.supplier_products;
CREATE POLICY "Anyone can view active supplier products"
  ON public.supplier_products FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Managers can manage their own products" ON public.supplier_products;
CREATE POLICY "Managers can manage their own products"
  ON public.supplier_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.manager_services ms
      WHERE ms.id = supplier_products.service_id
      AND ms.manager_id = auth.uid()
    )
  );

-- 6. Aggiungi commenti per documentazione
COMMENT ON COLUMN public.manager_services.percentage_commission IS 'Percentuale commissione richiesta per gestione proprietà';
COMMENT ON COLUMN public.manager_services.price_per_route IS 'Prezzi per tratta per servizio autista (JSONB)';
COMMENT ON COLUMN public.manager_services.vehicle_type IS 'Tipo di vettura per servizio autista';
COMMENT ON COLUMN public.manager_services.service_metadata IS 'Metadata aggiuntivi specifici per tipo di servizio';

-- ============================================
-- FINE

