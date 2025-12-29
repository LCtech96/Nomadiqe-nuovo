-- ============================================
-- FIX: Permettere messaggi dall'assistente AI
-- ============================================
-- Questo script crea un profilo speciale per l'assistente AI
-- che esiste realmente nel database, in modo da rispettare
-- il foreign key constraint.
--
-- SOLUZIONE: Creare un utente reale in auth.users per l'assistente AI
-- e poi il profilo corrispondente.
-- ============================================

-- IMPORTANTE: Questo script richiede di creare prima l'utente in auth.users
-- tramite l'interfaccia Supabase o l'API.
--
-- PASSI:
-- 1. Vai su Supabase Dashboard → Authentication → Users
-- 2. Clicca "Add User" → "Create new user"
-- 3. Email: ai-assistant@nomadiqe.com (o qualsiasi email, non verrà usata)
-- 4. Password: [genera una password casuale, non verrà usata]
-- 5. User UID: Copia l'UUID generato
-- 6. Usa quello UUID qui sotto invece di '00000000-0000-0000-0000-000000000000'
--
-- ALTERNATIVA AUTOMATICA (usando SQL diretto):
-- NOTA: Questo richiede privilegi di amministratore del database

-- Crea un utente in auth.users per l'assistente AI (solo se non esiste)
-- ATTENZIONE: Questo richiede accesso diretto al database, non funziona tramite SQL Editor normale
-- Meglio creare l'utente manualmente tramite Dashboard

-- Dopo aver creato l'utente in auth.users, esegui questo per creare il profilo:
INSERT INTO public.profiles (
  id,
  email,
  username,
  full_name,
  role,
  points
)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Sostituisci con l'UUID reale dell'utente creato
  'ai-assistant@nomadiqe.com',
  'nomadiqe_assistant',
  'Nomadiqe Assistant',
  'traveler',
  0
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email;

-- Commenti
COMMENT ON TABLE public.profiles IS 'Il profilo con id = ''00000000-0000-0000-0000-000000000000'' (o UUID reale) rappresenta l''assistente AI';

-- ============================================
-- ISTRUZIONI ALTERNATIVE (PIÙ SEMPLICE)
-- ============================================
-- 
-- SOLUZIONE PIÙ PRATICA: Modifica la tabella messages per permettere
-- sender_id NULL o rimuovere il constraint.
--
-- Vedi supabase/38_MODIFY_MESSAGES_FOR_AI.sql per questa alternativa.

