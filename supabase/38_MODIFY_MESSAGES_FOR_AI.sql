-- ============================================
-- ALTERNATIVA: Modifica tabella messages per AI Assistant
-- ============================================
-- Questa soluzione modifica la tabella messages per permettere
-- messaggi dall'assistente AI senza bisogno di un utente reale.
-- ============================================

-- Opzione 1: Permettere NULL per sender_id (ma questo rompe altre cose)

-- Opzione 2: Aggiungere una colonna is_ai_message e rendere sender_id nullable per AI
-- Questa è la soluzione migliore!

-- Aggiungi colonna per identificare messaggi AI
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_ai_message BOOLEAN DEFAULT FALSE;

-- Modifica il constraint per permettere NULL quando is_ai_message = TRUE
-- ATTENZIONE: Questo richiede di rimuovere e ricreare il foreign key constraint

-- Step 1: Rimuovi il constraint esistente (se necessario)
-- ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

-- Step 2: Rendi sender_id nullable
ALTER TABLE public.messages 
ALTER COLUMN sender_id DROP NOT NULL;

-- Step 3: Rimuovi il foreign key constraint esistente (sarà ricreato condizionalmente)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.messages 
    DROP CONSTRAINT messages_sender_id_fkey;
  END IF;
END $$;

-- Step 4: Crea un constraint check che permette NULL solo se is_ai_message = true
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_check;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_check 
CHECK (
  (is_ai_message = true AND sender_id IS NULL) OR 
  (is_ai_message = false AND sender_id IS NOT NULL)
);

-- Step 5: Ricrea il foreign key constraint solo per valori non NULL
-- PostgreSQL supporta foreign keys che accettano NULL (NULL = nessuna relazione)
-- Ma per sicurezza, usiamo un partial index
CREATE INDEX IF NOT EXISTS idx_messages_sender_not_null ON public.messages(sender_id) 
WHERE sender_id IS NOT NULL;

-- NOTA: Non ricreiamo il foreign key constraint completo perché sender_id ora può essere NULL
-- Per i messaggi AI: sender_id = NULL, is_ai_message = TRUE
-- Per i messaggi normali: sender_id = NOT NULL, is_ai_message = FALSE

-- Aggiorna RLS policies per permettere la visualizzazione dei messaggi AI
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  is_ai_message = true OR 
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id
);

-- Aggiorna policy per INSERT (solo per AI messages, gli utenti normali usano sender_id)
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  (is_ai_message = false AND auth.uid() = sender_id) OR
  (is_ai_message = true AND sender_id IS NULL)
);

-- Commenti
COMMENT ON COLUMN public.messages.is_ai_message IS 'Se true, il messaggio è dall''assistente AI e sender_id può essere NULL';
COMMENT ON COLUMN public.messages.sender_id IS 'ID del mittente. NULL se is_ai_message = true';

-- ============================================
-- ATTENZIONE: Questa modifica cambia la struttura della tabella!
-- Assicurati di testare prima in un ambiente di sviluppo.
-- ============================================

