-- ============================================
-- FIX RLS POLICIES PER BOOKINGS E SISTEMA RICHIESTE PRENOTAZIONE
-- ============================================
-- Aggiunge RLS policies per INSERT/UPDATE/DELETE su bookings
-- E aggiunge colonna booking_request_id per tracciare richieste via messaggi
-- ============================================

-- 1. AGGIUNGI COLONNA booking_request_message_id A BOOKINGS (opzionale, per tracciare richiesta originale)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'booking_request_message_id'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN booking_request_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
    RAISE NOTICE 'Colonna booking_request_message_id aggiunta a bookings';
  END IF;
END $$;

-- 2. AGGIUNGI COLONNA booking_request_data A MESSAGES (per tracciare richieste di prenotazione)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'booking_request_data'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN booking_request_data JSONB; -- Contiene: property_id, check_in, check_out, guests, total_price
    RAISE NOTICE 'Colonna booking_request_data aggiunta a messages';
  END IF;
END $$;

-- 3. AGGIUNGI COLONNA booking_request_status A MESSAGES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'booking_request_status'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN booking_request_status TEXT; -- 'pending', 'accepted', 'rejected'
    RAISE NOTICE 'Colonna booking_request_status aggiunta a messages';
  END IF;
END $$;

-- 4. RIMUOVI POLICY ESISTENTI SU BOOKINGS (per ricrearle correttamente)
DROP POLICY IF EXISTS "Bookings are viewable by traveler and host" ON public.bookings;
DROP POLICY IF EXISTS "Travelers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can update own property bookings" ON public.bookings;
DROP POLICY IF EXISTS "Travelers can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can create bookings for their properties" ON public.bookings;
DROP POLICY IF EXISTS "Users can update relevant bookings" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can delete bookings for their properties" ON public.bookings;

-- 5. CREA POLICY PER SELECT (viaggiatore e host proprietario della proprietà possono vedere)
CREATE POLICY "Bookings are viewable by traveler and host" ON public.bookings
  FOR SELECT 
  USING (
    auth.uid() = traveler_id 
    OR 
    auth.uid() IN (
      SELECT owner_id 
      FROM public.properties 
      WHERE id = property_id
    )
  );

-- 6. CREA POLICY PER INSERT (solo host proprietario può creare bookings - quando accetta richiesta)
-- I viaggiatori NON possono creare direttamente bookings, devono passare per le richieste via messaggi
CREATE POLICY "Hosts can create bookings for their properties" ON public.bookings
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT owner_id 
      FROM public.properties 
      WHERE id = property_id
    )
  );

-- 7. CREA POLICY PER UPDATE (viaggiatore può aggiornare le proprie, host può aggiornare quelle delle sue proprietà)
CREATE POLICY "Users can update relevant bookings" ON public.bookings
  FOR UPDATE 
  USING (
    auth.uid() = traveler_id 
    OR 
    auth.uid() IN (
      SELECT owner_id 
      FROM public.properties 
      WHERE id = property_id
    )
  )
  WITH CHECK (
    auth.uid() = traveler_id 
    OR 
    auth.uid() IN (
      SELECT owner_id 
      FROM public.properties 
      WHERE id = property_id
    )
  );

-- 8. CREA POLICY PER DELETE (solo host proprietario può eliminare bookings)
CREATE POLICY "Hosts can delete bookings for their properties" ON public.bookings
  FOR DELETE 
  USING (
    auth.uid() IN (
      SELECT owner_id 
      FROM public.properties 
      WHERE id = property_id
    )
  );

-- 9. CREA FUNZIONE HELPER PER VERIFICARE SE UN UTENTE È PROPRIETARIO DI UNA PROPRIETÀ
CREATE OR REPLACE FUNCTION public.is_property_owner(property_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.properties 
    WHERE id = property_id_param 
    AND owner_id = user_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FORZA REFRESH CACHE POSTGREST (IMPORTANTE!)
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- ============================================
-- ISTRUZIONI:
-- ============================================
-- 1. Copia tutto questo script
-- 2. Incollalo nel SQL Editor di Supabase
-- 3. Clicca "Run" (o premi F5)
-- 4. Attendi 10-30 secondi per il refresh della cache
-- 5. Ricarica l'app e riprova la prenotazione
-- ============================================

