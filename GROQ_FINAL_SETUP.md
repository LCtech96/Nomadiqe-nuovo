# 🎯 Setup Finale Assistente AI - Istruzioni Complete

## ⚠️ IMPORTANTE: Problema da Risolvere

Il sistema è stato implementato, ma c'è un problema tecnico: la tabella `messages` ha un foreign key constraint su `sender_id` che impedisce di inserire messaggi con un ID che non esiste in `auth.users`.

## ✅ Soluzione: Modificare la Tabella Messages

Per risolvere questo, dobbiamo modificare la struttura della tabella `messages` per permettere messaggi dall'assistente AI.

### Passo 1: Esegui lo Script SQL

Esegui questo script SQL su Supabase:

**File**: `supabase/38_MODIFY_MESSAGES_FOR_AI.sql`

Questo script:
- Aggiunge una colonna `is_ai_message` alla tabella `messages`
- Rende `sender_id` nullable
- Rimuove il foreign key constraint su `sender_id`
- Aggiunge un constraint check per garantire che `sender_id` sia NULL solo quando `is_ai_message = true`

### Passo 2: Configura Variabili d'Ambiente

1. **Aggiungi `GROQ_API_KEY`** a:
   - `.env` (locale)
   - `.env.local` (locale)
   - Vercel Environment Variables

2. **(Opzionale ma consigliato) Aggiungi `SUPABASE_SERVICE_ROLE_KEY`** su Vercel:
   - Supabase Dashboard → Settings → API → Copia "service_role" key
   - Vercel → Settings → Environment Variables → Aggiungi `SUPABASE_SERVICE_ROLE_KEY`

### Passo 3: Verifica

Dopo aver eseguito lo script SQL, il sistema dovrebbe funzionare:

1. **Messaggi di Benvenuto**: Quando completi l'onboarding e viene assegnato un ruolo
2. **Messaggi per Azioni**: Quando compi azioni (pubblica post, prenota, etc.)
3. **Notifiche**: Ogni messaggio crea una notifica cliccabile
4. **Conversazione AI**: I messaggi dell'assistente appaiono in una conversazione dedicata "Nomadiqe Assistant"

## 🧪 Test

1. Completa un'azione (es. pubblica un post)
2. Dovresti ricevere una notifica
3. Vai su `/messages`
4. Dovresti vedere una conversazione con "🤖 Nomadiqe Assistant"
5. Clicca sulla conversazione per vedere il messaggio

## 📝 Cosa Riceverai

Quando compi un'azione, riceverai un messaggio che:
- ✅ Ti congratula per l'azione specifica
- ✅ Spiega i punti guadagnati
- ✅ Suggerisce cosa fare dopo
- ✅ È personalizzato in base al tuo ruolo

## ⚠️ Nota Tecnica

Lo script SQL modificherà la struttura della tabella `messages`. Assicurati di:
- Eseguirlo in un ambiente di test prima se possibile
- Fare un backup se hai dati importanti
- Verificare che funzioni correttamente dopo l'esecuzione

