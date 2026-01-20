-- ============================================
-- WAITLIST: COUNTRY FIELD + STANDBY STATUS
-- ============================================

-- Add country column if missing
ALTER TABLE public.waitlist_requests
ADD COLUMN IF NOT EXISTS country TEXT;

-- Ensure existing rows have a default value
UPDATE public.waitlist_requests
SET country = COALESCE(country, '')
WHERE country IS NULL;

-- Update status constraint to include 'standby'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'waitlist_requests'
      AND constraint_type = 'CHECK'
      AND constraint_name = 'waitlist_requests_status_check'
  ) THEN
    ALTER TABLE public.waitlist_requests
      DROP CONSTRAINT waitlist_requests_status_check;
  END IF;

  ALTER TABLE public.waitlist_requests
    ADD CONSTRAINT waitlist_requests_status_check
    CHECK (status IN ('pending', 'approved', 'standby', 'rejected'));
END $$;
