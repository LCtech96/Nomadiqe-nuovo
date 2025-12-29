-- ============================================
-- FIX: Ricrea Foreign Key Constraints per messages
-- ============================================
-- Questo script risolve l'errore PGRST200 "Could not find a relationship 
-- between 'messages' and 'profiles' in the schema cache"
-- 
-- Il problema: lo script 38_MODIFY_MESSAGES_FOR_AI.sql ha rimosso il 
-- foreign key constraint ma non l'ha ricreato, causando errori in PostgREST.
-- 
-- Soluzione: Ricrea i foreign key constraints. PostgreSQL supporta foreign 
-- keys che accettano NULL - quando sender_id è NULL, semplicemente non 
-- c'è relazione, ma il constraint deve esistere per PostgREST.
-- ============================================

-- Step 1: Rimuovi constraint esistenti se presenti (idempotente)
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

-- Step 2: Ricrea foreign key per sender_id (accetta NULL per messaggi AI)
-- PostgreSQL supporta foreign key con NULL - quando sender_id è NULL,
-- semplicemente non c'è relazione, ma il constraint deve esistere per PostgREST
ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Step 3: Ricrea foreign key per receiver_id
ALTER TABLE public.messages
ADD CONSTRAINT messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Step 4: Forza il refresh dello schema cache di PostgREST (se supportato)
-- Questo notifica PostgREST di ricaricare lo schema
-- Nota: Potrebbe non funzionare su tutti i progetti Supabase, ma è sicuro provarlo
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignora errori se pg_notify non è disponibile
    NULL;
END $$;

-- Commenti per documentazione
COMMENT ON CONSTRAINT messages_sender_id_fkey ON public.messages IS 
'Foreign key verso profiles. NULL è permesso per messaggi AI (quando is_ai_message = true)';

COMMENT ON CONSTRAINT messages_receiver_id_fkey ON public.messages IS 
'Foreign key verso profiles per il destinatario del messaggio';

-- ============================================
-- NOTA: Dopo aver eseguito questo script, potrebbe essere necessario
-- attendere alcuni secondi affinché PostgREST aggiorni la cache dello schema.
-- In alternativa, riavvia il progetto Supabase o aspetta qualche minuto.
-- ============================================

