-- =============================================================================
-- Aggiunge 'jolly' all'enum user_role
-- Esegui questo script nel SQL Editor di Supabase per risolvere l'errore:
--   invalid input value for enum user_role: "jolly"
-- =============================================================================

-- Aggiungi 'jolly' all'enum user_role (se non esiste già)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'jolly';

-- Verifica: elenca i valori dell'enum
-- SELECT enumlabel FROM pg_enum e
-- JOIN pg_type t ON e.enumtypid = t.oid
-- WHERE t.typname = 'user_role'
-- ORDER BY enumsortorder;
