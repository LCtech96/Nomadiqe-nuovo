# ✅ Checklist Deploy Assistente AI

## 📋 Pre-Deploy Checklist

### 1. ✅ Codice Completato
- [x] Sistema AI Assistant implementato
- [x] API routes create (`/api/ai-assistant/welcome` e `/api/ai-assistant/action`)
- [x] Integrazione con `lib/points.ts` per messaggi azioni
- [x] Integrazione con `app/onboarding/page.tsx` per messaggi benvenuto
- [x] UI aggiornata per mostrare conversazioni AI
- [x] Chiavi API rimosse dai file di documentazione

### 2. 🔑 Configurazione Variabili d'Ambiente

#### Su Vercel (OBBLIGATORIO):
1. Vai su https://vercel.com/dashboard
2. Seleziona il progetto **nomadiqe-nuovo**
3. **Settings** → **Environment Variables**
4. Aggiungi:
   - **Name**: `GROQ_API_KEY`
   - **Value**: `[la tua chiave API Groq - NON committare mai nel repository!]`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development
5. Clicca **Save**

#### (Opzionale ma Consigliato):
- **Name**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: [copia da Supabase Dashboard → Settings → API → service_role key]
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

### 3. 🗄️ Database Setup (OBBLIGATORIO)

**Esegui questo script SQL su Supabase:**

File: `supabase/38_MODIFY_MESSAGES_FOR_AI.sql`

Questo script:
- Aggiunge colonna `is_ai_message` alla tabella `messages`
- Rende `sender_id` nullable per messaggi AI
- Rimuove il foreign key constraint su `sender_id`
- Aggiorna le RLS policies per permettere messaggi AI

**Come eseguirlo:**
1. Vai su https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Crea una nuova query
5. Copia e incolla il contenuto di `supabase/38_MODIFY_MESSAGES_FOR_AI.sql`
6. Clicca **Run**

### 4. 🚀 Deploy su Vercel

#### Opzione A: Deploy Automatico (se Git push è già fatto)
- Vercel dovrebbe deployare automaticamente dopo il push
- Controlla su https://vercel.com/dashboard → **Deployments**
- Verifica che il deployment sia completato con successo

#### Opzione B: Deploy Manuale
1. Vai su https://vercel.com/dashboard
2. Seleziona il progetto **nomadiqe-nuovo**
3. Vai su **Deployments**
4. Clicca su **...** (tre puntini) dell'ultimo deployment
5. Seleziona **Redeploy**
6. Seleziona **Use existing Build Cache** (opzionale)
7. Clicca **Redeploy**

### 5. ✅ Post-Deploy Verification

Dopo il deploy, verifica che:

1. **Variabili d'ambiente sono configurate:**
   - Vai su Vercel → Settings → Environment Variables
   - Verifica che `GROQ_API_KEY` sia presente

2. **Database è configurato:**
   - Verifica su Supabase che la colonna `is_ai_message` esista nella tabella `messages`
   - Query di verifica:
     ```sql
     SELECT column_name, data_type, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'messages' AND column_name = 'is_ai_message';
     ```

3. **Test funzionalità:**
   - Crea un nuovo account o completa l'onboarding
   - Dovresti ricevere un messaggio di benvenuto dall'assistente AI
   - Compi un'azione (es. pubblica un post)
   - Dovresti ricevere un messaggio di congratulazioni
   - Vai su `/messages` e verifica la conversazione con "🤖 Nomadiqe Assistant"

## 🐛 Troubleshooting

### Problema: "Impossibile salvare il messaggio" nell'API
**Soluzione**: Assicurati di aver eseguito lo script SQL `supabase/38_MODIFY_MESSAGES_FOR_AI.sql`

### Problema: "GROQ_API_KEY is not defined"
**Soluzione**: Verifica che la variabile d'ambiente sia configurata su Vercel e riavvia il deployment

### Problema: Messaggi AI non appaiono
**Soluzione**: 
1. Verifica che `is_ai_message = true` nei messaggi nel database
2. Controlla i log di Vercel per errori
3. Verifica che le RLS policies siano aggiornate

## 📝 Note Importanti

- ⚠️ **Non committare mai chiavi API nel repository**
- ✅ **Usa sempre variabili d'ambiente per segreti**
- ✅ **Lo script SQL deve essere eseguito PRIMA del deploy**
- ✅ **Il deploy su Vercel è automatico dopo il push su Git**

