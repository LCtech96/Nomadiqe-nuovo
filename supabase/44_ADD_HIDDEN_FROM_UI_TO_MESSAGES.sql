-- ============================================
-- AGGIUNGI CAMPO hidden_from_ui PER NASCONDERE MESSAGGI NEL FRONTEND
-- ============================================
-- Questo campo permette di nascondere messaggi generati automaticamente
-- (es. messaggi utente->AI quando compie azioni) nel frontend
-- ============================================

-- Aggiungi colonna hidden_from_ui
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'hidden_from_ui'
  ) THEN
    ALTER TABLE public.messages 
    ADD COLUMN hidden_from_ui BOOLEAN DEFAULT FALSE NOT NULL;
    RAISE NOTICE 'Colonna hidden_from_ui aggiunta a messages';
  END IF;
END $$;

-- Crea indice per performance (quando filtriamo messaggi visibili)
CREATE INDEX IF NOT EXISTS idx_messages_hidden_from_ui ON public.messages(hidden_from_ui) WHERE hidden_from_ui = false;

-- Commento per documentazione
COMMENT ON COLUMN public.messages.hidden_from_ui IS 'Se true, il messaggio non viene mostrato nel frontend. Usato per messaggi generati automaticamente (es. quando utente compie azioni e viene creato un messaggio nascosto utente->AI)';

-- Notifica PostgREST per ricaricare lo schema
NOTIFY pgrst, 'reload schema';

