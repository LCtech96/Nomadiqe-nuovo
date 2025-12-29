# ✅ Configurazione Completa Groq AI Assistant

## 📋 Riepilogo

Ho creato un sistema completo di assistente AI che invia messaggi personalizzati agli utenti usando Groq.

## 🔑 File da Configurare

### 1. File `.env` (Locale)

Aggiungi questa riga al tuo file `.env` esistente:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 2. File `.env.local` (Locale)

Aggiungi questa riga al tuo file `.env.local` (o crealo se non esiste):

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Vercel Environment Variables

#### A. GROQ_API_KEY (Obbligatorio)

1. Vai su https://vercel.com/dashboard
2. Seleziona il progetto **nomadiqe-nuovo**
3. **Settings** → **Environment Variables**
4. Clicca **Add New**
5. Inserisci:
   - **Name**: `GROQ_API_KEY`
   - **Value**: `[la tua chiave API Groq]` (sostituisci con la chiave reale)
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
6. Clicca **Save**

#### B. SUPABASE_SERVICE_ROLE_KEY (Opzionale ma Consigliato)

**Perché serve?**
Permette alle API routes di bypassare RLS e inserire messaggi con l'ID speciale dell'assistente AI.

**Come ottenerlo:**
1. Vai su https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. **Settings** → **API**
4. Copia la **service_role** key (NON la anon key!)
5. Aggiungila su Vercel:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: [la chiave service_role copiata]
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
6. Clicca **Save**
7. **Deployments** → Seleziona l'ultimo → **...** → **Redeploy**

**Nota**: Se non configuri questa variabile, le API routes useranno il client normale che potrebbe fallire per RLS. È consigliato configurarla.

## 🗄️ SQL da Eseguire su Supabase

**IMPORTANTE**: Il file `supabase/36_CREA_ASSISTENTE_AI_TRIGGER.sql` **NON crea trigger** perché non possiamo inserire messaggi con un sender_id che non esiste in auth.users.

Il sistema funziona completamente tramite le API routes Next.js. Non è necessario eseguire alcuno script SQL.

## 🎯 Cosa Fa l'Assistente AI

### 1. Messaggi di Benvenuto
Quando un utente completa l'onboarding e gli viene assegnato un ruolo, riceve un messaggio di benvenuto personalizzato che:
- Saluta calorosamente
- Spiega il loro ruolo
- Spiega come guadagnare punti
- Fornisce suggerimenti per iniziare

### 2. Messaggi per Azioni
Quando un utente compie un'azione (pubblica post, completa prenotazione, etc.), riceve:
- Complimenti per l'azione
- Spiegazione dei punti guadagnati
- Suggerimenti su cosa fare dopo

### 3. Notifiche
Ogni messaggio dell'assistente genera una notifica che:
- Appare come notifica push
- Quando cliccata, apre la pagina messaggi
- Mostra il messaggio dell'assistente AI

## 📁 File Creati

1. `lib/ai-assistant.ts` - Servizio AI con Groq
2. `lib/ai-messages.ts` - Helper per inviare messaggi
3. `app/api/ai-assistant/welcome/route.ts` - API per messaggi di benvenuto
4. `app/api/ai-assistant/action/route.ts` - API per messaggi di azione
5. `supabase/36_CREA_ASSISTENTE_AI_TRIGGER.sql` - Documentazione (non esegue trigger)

## ✅ Integrazioni

- ✅ Integrato con `lib/points.ts` - Invia messaggi quando vengono assegnati punti
- ✅ Integrato con `app/onboarding/page.tsx` - Invia messaggio quando viene assegnato il ruolo
- ✅ Integrato con sistema notifiche - Crea notifiche per ogni messaggio
- ✅ Integrato con tabella `messages` - Salva i messaggi nel database

## 🚀 Prossimi Passi

1. ✅ Aggiungi `GROQ_API_KEY` a `.env` e `.env.local`
2. ✅ Aggiungi `GROQ_API_KEY` su Vercel
3. ✅ (Opzionale) Aggiungi `SUPABASE_SERVICE_ROLE_KEY` su Vercel (consigliato)
4. ✅ Riavvia il server locale: `pnpm dev`
5. ✅ Testa creando un nuovo account e completando l'onboarding

## 🧪 Test

1. Crea un nuovo account
2. Completa l'onboarding e seleziona un ruolo
3. Dovresti ricevere un messaggio di benvenuto dall'assistente AI
4. Compi un'azione (es. pubblica un post)
5. Dovresti ricevere un messaggio di congratulazioni

## ⚠️ Note Importanti

- L'assistente AI usa il modello `llama-3.1-8b-instant` di Groq (veloce e gratuito)
- I messaggi sono generati in italiano
- I messaggi vengono salvati nella tabella `messages` con sender_id `00000000-0000-0000-0000-000000000000`
- Le notifiche vengono create automaticamente per ogni messaggio
- **Non è necessario eseguire script SQL** - tutto funziona tramite API routes
- Se configuri `SUPABASE_SERVICE_ROLE_KEY`, le API routes bypassano completamente RLS
