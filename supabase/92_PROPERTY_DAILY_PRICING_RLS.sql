-- property_daily_pricing: allow host to manage (via API/client)
-- La gestione è fatta dal proprietario della property; per semplicità disabilitiamo RLS
-- come per host_availability
ALTER TABLE public.property_daily_pricing DISABLE ROW LEVEL SECURITY;
