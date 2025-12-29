-- Aggiunta tipo servizio "farmacista" e campi per luogo/orari
-- ============================================

-- 1. Aggiungi "pharmacist" all'enum service_type
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'pharmacist';

-- 2. Aggiungi campi per luogo e orari alla tabella manager_services
ALTER TABLE public.manager_services 
  ADD COLUMN IF NOT EXISTS location_address TEXT, -- Indirizzo completo
  ADD COLUMN IF NOT EXISTS location_city TEXT, -- Città
  ADD COLUMN IF NOT EXISTS location_country TEXT, -- Paese
  ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 8), -- Latitudine per mappe
  ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(11, 8), -- Longitudine per mappe
  ADD COLUMN IF NOT EXISTS operating_hours JSONB; -- Orari operativi: {"monday": {"open": "09:00", "close": "19:00"}, ...}

-- 3. Aggiungi campo per pubblicare prodotti sul feed
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS publish_to_feed BOOLEAN DEFAULT FALSE; -- Se true, il prodotto appare sul feed

-- 4. Crea indice per prodotti pubblicati sul feed
CREATE INDEX IF NOT EXISTS idx_supplier_products_publish_to_feed ON public.supplier_products(publish_to_feed) WHERE publish_to_feed = true;

-- 5. Aggiungi commenti per documentazione
COMMENT ON COLUMN public.manager_services.location_address IS 'Indirizzo completo del luogo di operazione';
COMMENT ON COLUMN public.manager_services.location_city IS 'Città del luogo di operazione';
COMMENT ON COLUMN public.manager_services.location_country IS 'Paese del luogo di operazione';
COMMENT ON COLUMN public.manager_services.location_latitude IS 'Latitudine per geolocalizzazione';
COMMENT ON COLUMN public.manager_services.location_longitude IS 'Longitudine per geolocalizzazione';
COMMENT ON COLUMN public.manager_services.operating_hours IS 'Orari operativi in formato JSONB: {"monday": {"open": "09:00", "close": "19:00", "closed": false}, ...}';
COMMENT ON COLUMN public.supplier_products.publish_to_feed IS 'Se true, il prodotto viene pubblicato sul feed principale';

-- ============================================
-- FINE

