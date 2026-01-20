-- ============================================
-- WAITLIST REQUESTS TABLE + RLS
-- ============================================

CREATE TABLE IF NOT EXISTS public.waitlist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('host', 'creator', 'traveler', 'manager')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_requests_email_key
  ON public.waitlist_requests (email);

ALTER TABLE public.waitlist_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'waitlist_requests'
      AND policyname = 'Anyone can insert waitlist requests'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can insert waitlist requests" ON public.waitlist_requests FOR INSERT WITH CHECK (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'waitlist_requests'
      AND policyname = 'Admins can read waitlist requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can read waitlist requests"
      ON public.waitlist_requests
      FOR SELECT
      USING (auth.email() IN ('luca@facevoice.ai', 'lucacorrao1996@gmail.com'))
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'waitlist_requests'
      AND policyname = 'Admins can update waitlist requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can update waitlist requests"
      ON public.waitlist_requests
      FOR UPDATE
      USING (auth.email() IN ('luca@facevoice.ai', 'lucacorrao1996@gmail.com'))
      WITH CHECK (auth.email() IN ('luca@facevoice.ai', 'lucacorrao1996@gmail.com'))
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'waitlist_requests'
      AND policyname = 'Admins can delete waitlist requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can delete waitlist requests"
      ON public.waitlist_requests
      FOR DELETE
      USING (auth.email() IN ('luca@facevoice.ai', 'lucacorrao1996@gmail.com'))
    $policy$;
  END IF;
END $$;
