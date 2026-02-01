-- Aggiungi URL iCal per sync con Airbnb e Booking.com
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS airbnb_ical_url TEXT,
  ADD COLUMN IF NOT EXISTS booking_ical_url TEXT;

COMMENT ON COLUMN public.properties.airbnb_ical_url IS 'URL export iCal Airbnb - importa prenotazioni in Nomadiqe';
COMMENT ON COLUMN public.properties.booking_ical_url IS 'URL export iCal Booking.com - importa prenotazioni in Nomadiqe';
