# 🎯 GUIDA STEP-BY-STEP COMPLETA - Configurazione Notifiche

Segui questi passi **IN ORDINE CRONOLOGICO**. Non saltare nessun passo!

---

## 📍 PASSO 1: Verifica Deploy Vercel (2 minuti)

### Cosa fare:

1. **Apri il browser** e vai su: https://vercel.com/dashboard
2. **Accedi** al tuo account Vercel (se non sei già loggato)
3. **Clicca** sul progetto **"nomadiqe-nuovo"** (o il nome del tuo progetto)
4. **Clicca** su **"Deployments"** (menu in alto)
5. **Cerca** l'ultimo deploy nella lista (dovrebbe essere in cima)
6. **Verifica** che abbia un **checkmark verde** ✅ e dica "Ready" o "Completed"

### Se il deploy è ancora in corso:
- **Aspetta** che finisca (può richiedere 1-3 minuti)
- **Ricarica** la pagina ogni 30 secondi fino a vedere "Ready"

### ✅ Checkpoint:
- [ ] Deploy completato con successo

**Quando hai il checkmark verde, vai al Passo 2**

---

## 📍 PASSO 2: Verifica Cron Job su Vercel (1 minuto)

### Cosa fare:

1. **Sempre su Vercel Dashboard**, clicca su **"Settings"** (menu in alto)
2. **Nel menu laterale sinistro**, scorri e clicca su **"Cron Jobs"**
3. **Cosa dovresti vedere:**
   - **Opzione A:** Vedi una sezione "Active Cron Jobs" o "Cron Jobs" con una lista → ✅ **PERFETTO!** Vai al Passo 3
   - **Opzione B:** Vedi solo le istruzioni "Get Started with Cron Jobs" → Il cron job non è stato creato

### Se NON vedi il cron job (Opzione B):

1. **Attendi 2-3 minuti** dopo il deploy
2. **Ricarica** la pagina (F5)
3. **Se ancora non c'è:**
   - Verifica che il file `vercel.json` sia nella root del progetto
   - Controlla che il deploy sia completato

### ✅ Checkpoint:
- [ ] Vedo il cron job nella lista OPPURE ho verificato che non c'è e ho atteso

**Quando hai verificato, vai al Passo 3**

---

## 📍 PASSO 3: Configura Database Supabase - Script 1 (5 minuti)

### 3.1 Apri SQL Editor

1. **Apri una nuova scheda** del browser
2. Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/sql/new
3. **Se non sei loggato**, accedi al tuo account Supabase

### 3.2 Esegui Script per Abilitare Realtime

1. **Nel tuo editor** (VS Code o altro), apri il file:
   ```
   supabase/22_ABILITA_REALTIME_ONESIGNAL.sql
   ```

2. **Seleziona TUTTO** il contenuto del file (Ctrl+A)

3. **Copia** tutto (Ctrl+C)

4. **Torna al browser** su Supabase SQL Editor

5. **Incolla** tutto nel campo di testo grande (Ctrl+V)

6. **Clicca** sul pulsante **"Run"** (in basso a destra) OPPURE premi **Ctrl+Enter**

7. **Aspetta** che lo script finisca (dovrebbe richiedere 1-2 secondi)

8. **Verifica** i risultati:
   - Dovresti vedere una tabella con i risultati
   - **NON devono esserci errori rossi**
   - Se vedi "PUBLICATION TABLES" e "TABELLA PUSH_SUBSCRIPTIONS" → ✅ **PERFETTO!**

### ✅ Checkpoint:
- [ ] Script eseguito senza errori
- [ ] Vedo i risultati delle query di verifica

**Quando hai completato, vai al Passo 4**

---

## 📍 PASSO 4: Configura Database Supabase - Script 2 (5 minuti)

### 4.1 Esegui Script per Creare i Trigger

1. **Nel SQL Editor di Supabase**, clicca su **"New Query"** (in alto a destra) OPPURE apri una nuova scheda

2. **Nel tuo editor**, apri il file:
   ```
   supabase/26_TRIGGER_NOTIFICHE_ONESIGNAL.sql
   ```

3. **Seleziona TUTTO** il contenuto (Ctrl+A)

4. **Copia** tutto (Ctrl+C)

5. **Torna al browser** su Supabase SQL Editor

6. **Incolla** tutto nel campo di testo (Ctrl+V)

7. **Clicca** su **"Run"** OPPURE premi **Ctrl+Enter**

8. **Aspetta** che lo script finisca (può richiedere 2-3 secondi)

9. **Verifica** i risultati:
   - Dovresti vedere messaggi di successo
   - **NON devono esserci errori rossi**
   - Se vedi "TRIGGER PER MESSAGGI", "TRIGGER PER LIKE", ecc. → ✅ **PERFETTO!**

### ✅ Checkpoint:
- [ ] Script eseguito senza errori
- [ ] Vedo i messaggi di successo per i trigger

**Quando hai completato, vai al Passo 5**

---

## 📍 PASSO 5: Verifica Trigger su Supabase (2 minuti)

### Cosa fare:

1. **Su Supabase Dashboard**, nel menu laterale sinistro, clicca su **"Database"**

2. **Sotto "Database"**, clicca su **"Triggers"**

3. **Cosa dovresti vedere:**
   - Una lista di trigger
   - Dovresti vedere almeno questi trigger:
     - `trigger_send_message_notification` sulla tabella `messages`
     - `trigger_send_like_notification` sulla tabella `post_likes`
     - `trigger_send_comment_notification` sulla tabella `post_comments`

### Se NON vedi i trigger:

1. **Torna al Passo 4** e riesegui lo script `26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`
2. **Controlla** se ci sono errori nel SQL Editor
3. **Se ci sono errori**, copiali e condividili

### ✅ Checkpoint:
- [ ] Vedo almeno `trigger_send_message_notification` nella lista

**Quando hai verificato, vai al Passo 6**

---

## 📍 PASSO 6: Verifica Tabella pending_notifications (1 minuto)

### Cosa fare:

1. **Su Supabase Dashboard**, nel menu laterale sinistro, clicca su **"Table Editor"**

2. **Nella lista delle tabelle**, cerca **"pending_notifications"**

3. **Clicca** su **"pending_notifications"**

4. **Cosa dovresti vedere:**
   - Una tabella con colonne: `id`, `user_id`, `notification_type`, `title`, `message`, `url`, `data`, `sent`, `sent_at`, `created_at`
   - La tabella può essere vuota (è normale)

### Se la tabella NON esiste:

1. **Torna al Passo 4** e riesegui lo script `26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`
2. **Verifica** che non ci siano errori

### ✅ Checkpoint:
- [ ] La tabella `pending_notifications` esiste e posso vederla

**Quando hai verificato, vai al Passo 7**

---

## 📍 PASSO 7: Verifica Variabili d'Ambiente su Vercel (2 minuti)

### Cosa fare:

1. **Torna su Vercel Dashboard** (scheda precedente o nuova scheda)

2. **Seleziona** il progetto **"nomadiqe-nuovo"**

3. **Clicca** su **"Settings"** (menu in alto)

4. **Nel menu laterale sinistro**, clicca su **"Environment Variables"**

5. **Cerca** queste due variabili nella lista:
   - `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - `ONESIGNAL_REST_API_KEY`

6. **Verifica** che entrambe siano presenti e abbiano valori

### Se manca una variabile:

1. **Clicca** su **"Add New"** (in alto a destra)
2. **Name:** Inserisci il nome della variabile (es. `NEXT_PUBLIC_ONESIGNAL_APP_ID`)
3. **Value:** Inserisci il valore (per `NEXT_PUBLIC_ONESIGNAL_APP_ID` dovrebbe essere: `3b54b91a-7afb-47a4-b50b-36294def8760`)
4. **Environments:** Seleziona tutte (Production, Preview, Development)
5. **Clicca** su **"Save"**
6. **Ripeti** per `ONESIGNAL_REST_API_KEY` (il valore è nel tuo `.env.local`)

### ✅ Checkpoint:
- [ ] Entrambe le variabili d'ambiente sono presenti su Vercel

**Quando hai verificato, vai al Passo 8**

---

## 📍 PASSO 8: Test Completo del Sistema (10 minuti)

### 8.1 Preparazione

1. **Apri DUE browser diversi** (o due finestre in incognito):
   - **Browser 1:** Chrome (o altro) - Account A
   - **Browser 2:** Firefox (o altro) - Account B

2. **Su Browser 1:**
   - Vai su https://www.nomadiqe.com
   - **Accedi** con Account A (mittente)

3. **Su Browser 2:**
   - Vai su https://www.nomadiqe.com
   - **Accedi** con Account B (ricevente)
   - **Abilita le notifiche push** (se non l'hai già fatto):
     - Dovrebbe apparire un dialog dopo 3 secondi
     - Clicca "Abilita notifiche"
     - Oppure vai su Impostazioni Browser → Notifiche → Permetti per nomadiqe.com

### 8.2 Test Invio Messaggio

1. **Su Browser 1 (mittente):**
   - Vai su un profilo di Account B
   - Clicca su "Invia messaggio" o simile
   - Scrivi un messaggio di test (es. "Test notifica")
   - Clicca "Invia"

2. **Verifica su Supabase:**
   - Vai su Supabase Dashboard → **Table Editor** → `pending_notifications`
   - **Dovresti vedere** una nuova riga con:
     - `notification_type`: `message`
     - `sent`: `false`
     - `user_id`: ID di Account B
   - **Se NON vedi la riga:**
     - I trigger non funzionano → Torna al Passo 4 e verifica

### 8.3 Test Processamento Notifica

1. **Attendi 1-2 minuti** dopo aver inviato il messaggio

2. **Verifica su Supabase:**
   - Vai su `pending_notifications`
   - La riga creata prima dovrebbe avere:
     - `sent`: `true` (era `false` prima)
     - `sent_at`: un timestamp (quando è stata processata)

3. **Se `sent` è ancora `false`:**
   - Il cron job non sta funzionando
   - Vai su Vercel Dashboard → Deployments → Clicca sull'ultimo deploy → Functions
   - Cerca `/api/notifications/process` e controlla i log

### 8.4 Test Ricezione Notifica

1. **Su Browser 2 (ricevente):**
   - Dovresti ricevere una notifica push
   - La notifica dovrebbe dire "💬 Nuovo messaggio" e il nome del mittente
   - **Se NON arriva:**
     - Verifica che le notifiche siano abilitate nel browser
     - Controlla che Account B sia iscritto (tabella `push_subscriptions` in Supabase)

### ✅ Checkpoint Finale:
- [ ] Messaggio inviato
- [ ] Notifica creata in `pending_notifications` con `sent = false`
- [ ] Dopo 1-2 minuti, `sent = true`
- [ ] Notifica push ricevuta su Browser 2

**Se tutto funziona → 🎉 COMPLETATO!**

---

## 🆘 Se Qualcosa Non Funziona

### Le notifiche pending non vengono create:
- **Problema:** I trigger non funzionano
- **Soluzione:** Torna al Passo 4 e riesegui lo script `26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`

### Le notifiche pending non vengono processate:
- **Problema:** Il cron job non funziona
- **Soluzione:** 
  1. Verifica che il cron job sia attivo su Vercel (Passo 2)
  2. Controlla i log di Vercel per errori
  3. Verifica le variabili d'ambiente (Passo 7)

### Le notifiche non arrivano:
- **Problema:** OneSignal non è configurato correttamente
- **Soluzione:**
  1. Verifica che l'utente sia iscritto (tabella `push_subscriptions`)
  2. Verifica le variabili d'ambiente su Vercel
  3. Controlla i log di Vercel per errori OneSignal

---

**Inizia dal Passo 1 e dimmi a quale passo sei arrivato!** 🚀



