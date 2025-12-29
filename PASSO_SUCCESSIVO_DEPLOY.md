# ✅ Repository Collegato - Prossimi Passi

## 📍 PASSO 1: Triggera Deploy Manuale (2 minuti)

### Cosa fare:

1. **Sempre su Vercel Dashboard**, clicca su **"Deployments"** (menu in alto, accanto a "Overview")
2. **Cerca** il pulsante **"..."** (tre puntini) in alto a destra OPPURE cerca **"Redeploy"** o **"Create Deployment"**
3. **Clicca** su **"Redeploy"** o **"Create Deployment"**
4. **Se ti chiede di selezionare un branch**, seleziona **"main"**
5. **Clicca** su **"Redeploy"** o **"Deploy"**

### Cosa succede:

- Vercel inizierà a fare il deploy
- Vedrai un nuovo deploy nella lista con status **"Building"** (icona arancione/gialla)
- **Aspetta** che finisca (può richiedere 1-3 minuti)

### ✅ Checkpoint:
- [ ] Deploy manuale avviato
- [ ] Vedo un nuovo deploy con status "Building"

**Quando vedi "Building", vai al Passo 2**

---

## 📍 PASSO 2: Attendi Completamento Deploy (2-3 minuti)

### Cosa fare:

1. **Resta sulla pagina Deployments**
2. **Aspetta** che il deploy finisca
3. **Verifica** lo status:
   - **"Building"** → Aspetta ancora
   - **"Ready"** o **"Completed"** con checkmark verde ✅ → **PERFETTO!**
   - **"Error"** o **"Failed"** → Clicca sul deploy e dimmi quali errori vedi

### ✅ Checkpoint:
- [ ] Deploy completato con checkmark verde ✅

**Quando vedi il checkmark verde, vai al Passo 3**

---

## 📍 PASSO 3: Verifica Cron Job (2 minuti)

### Cosa fare:

1. **Vai su Settings** → **Cron Jobs** (menu laterale sinistro)
2. **Scorri** la pagina
3. **Cosa dovresti vedere:**
   - **Opzione A:** Vedi una sezione "Active Cron Jobs" o "Cron Jobs" con una lista che mostra:
     - Path: `/api/notifications/process`
     - Schedule: `*/1 * * * *` (ogni minuto)
     - Status: Active
     → ✅ **PERFETTO!** Vai al Passo 4
   
   - **Opzione B:** Vedi solo le istruzioni "Get Started with Cron Jobs"
     → Aspetta 1-2 minuti, ricarica la pagina (F5), e controlla di nuovo

### Se ancora non vedi il cron job:

1. **Verifica** che il deploy sia completato (checkmark verde)
2. **Attendi** altri 2-3 minuti
3. **Ricarica** la pagina Cron Jobs
4. Se ancora non c'è, dimmi e verificheremo insieme

### ✅ Checkpoint:
- [ ] Vedo il cron job nella lista OPPURE ho atteso e ricaricato

**Quando hai verificato, vai al Passo 4**

---

## 📍 PASSO 4: Configura Database Supabase - Script 1 (5 minuti)

### 4.1 Apri SQL Editor

1. **Apri una nuova scheda** del browser (o una nuova finestra)
2. Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/sql/new
3. **Se non sei loggato**, accedi al tuo account Supabase

### 4.2 Esegui Script per Abilitare Realtime

1. **Nel tuo editor** (VS Code), apri il file:
   ```
   supabase/22_ABILITA_REALTIME_ONESIGNAL.sql
   ```

2. **Seleziona TUTTO** il contenuto del file:
   - Premi `Ctrl+A` (Windows) per selezionare tutto

3. **Copia** tutto:
   - Premi `Ctrl+C` per copiare

4. **Torna al browser** su Supabase SQL Editor

5. **Incolla** tutto nel campo di testo grande:
   - Premi `Ctrl+V` per incollare

6. **Esegui lo script:**
   - Clicca sul pulsante **"Run"** (in basso a destra) OPPURE
   - Premi **Ctrl+Enter**

7. **Aspetta** che lo script finisca (1-2 secondi)

8. **Verifica** i risultati:
   - Dovresti vedere una tabella con i risultati
   - **NON devono esserci errori rossi**
   - Se vedi "PUBLICATION TABLES" e "TABELLA PUSH_SUBSCRIPTIONS" → ✅ **PERFETTO!**

### ✅ Checkpoint:
- [ ] Script eseguito senza errori
- [ ] Vedo i risultati delle query di verifica

**Quando hai completato, vai al Passo 5**

---

## 📍 PASSO 5: Configura Database Supabase - Script 2 (5 minuti)

### 5.1 Esegui Script per Creare i Trigger

1. **Nel SQL Editor di Supabase**, clicca su **"New Query"** (in alto a destra) OPPURE apri una nuova scheda SQL

2. **Nel tuo editor**, apri il file:
   ```
   supabase/26_TRIGGER_NOTIFICHE_ONESIGNAL.sql
   ```

3. **Seleziona TUTTO** il contenuto (Ctrl+A)

4. **Copia** tutto (Ctrl+C)

5. **Torna al browser** su Supabase SQL Editor

6. **Incolla** tutto nel campo di testo (Ctrl+V)

7. **Esegui lo script:**
   - Clicca su **"Run"** OPPURE premi **Ctrl+Enter**

8. **Aspetta** che lo script finisca (2-3 secondi)

9. **Verifica** i risultati:
   - Dovresti vedere messaggi di successo
   - **NON devono esserci errori rossi**
   - Se vedi "TRIGGER PER MESSAGGI", "TRIGGER PER LIKE", ecc. → ✅ **PERFETTO!**

### ✅ Checkpoint:
- [ ] Script eseguito senza errori
- [ ] Vedo i messaggi di successo per i trigger

**Quando hai completato, vai al Passo 6**

---

## 📍 PASSO 6: Verifica Trigger su Supabase (2 minuti)

### Cosa fare:

1. **Su Supabase Dashboard**, nel menu laterale sinistro, clicca su **"Database"**

2. **Sotto "Database"**, clicca su **"Triggers"**

3. **Cosa dovresti vedere:**
   - Una lista di trigger
   - Dovresti vedere almeno:
     - `trigger_send_message_notification` sulla tabella `messages`
     - `trigger_send_like_notification` sulla tabella `post_likes`
     - `trigger_send_comment_notification` sulla tabella `post_comments`

### Se NON vedi i trigger:

1. **Torna al Passo 5** e riesegui lo script `26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`
2. **Controlla** se ci sono errori nel SQL Editor
3. **Se ci sono errori**, copiali e condividili

### ✅ Checkpoint:
- [ ] Vedo almeno `trigger_send_message_notification` nella lista

**Quando hai verificato, vai al Passo 7**

---

## 📍 PASSO 7: Verifica Tabella pending_notifications (1 minuto)

### Cosa fare:

1. **Su Supabase Dashboard**, nel menu laterale sinistro, clicca su **"Table Editor"**

2. **Nella lista delle tabelle**, cerca **"pending_notifications"**

3. **Clicca** su **"pending_notifications"**

4. **Cosa dovresti vedere:**
   - Una tabella con colonne: `id`, `user_id`, `notification_type`, `title`, `message`, `url`, `data`, `sent`, `sent_at`, `created_at`
   - La tabella può essere vuota (è normale)

### Se la tabella NON esiste:

1. **Torna al Passo 5** e riesegui lo script `26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`
2. **Verifica** che non ci siano errori

### ✅ Checkpoint:
- [ ] La tabella `pending_notifications` esiste e posso vederla

**Quando hai verificato, vai al Passo 8**

---

## 📍 PASSO 8: Test Completo (10 minuti)

### 8.1 Preparazione

1. **Apri DUE browser diversi** (o due finestre in incognito):
   - **Browser 1:** Chrome - Account A (mittente)
   - **Browser 2:** Firefox - Account B (ricevente)

2. **Su Browser 1:**
   - Vai su https://www.nomadiqe.com
   - **Accedi** con Account A

3. **Su Browser 2:**
   - Vai su https://www.nomadiqe.com
   - **Accedi** con Account B
   - **Abilita le notifiche push:**
     - Dovrebbe apparire un dialog dopo 3 secondi
     - Clicca "Abilita notifiche"
     - Oppure: Impostazioni Browser → Notifiche → Permetti per nomadiqe.com

### 8.2 Test Invio Messaggio

1. **Su Browser 1 (mittente):**
   - Vai su un profilo di Account B
   - Clicca su "Invia messaggio"
   - Scrivi: "Test notifica"
   - Clicca "Invia"

2. **Verifica su Supabase:**
   - Vai su Supabase Dashboard → **Table Editor** → `pending_notifications`
   - **Dovresti vedere** una nuova riga con:
     - `notification_type`: `message`
     - `sent`: `false`
     - `user_id`: ID di Account B

### 8.3 Test Processamento

1. **Attendi 1-2 minuti**

2. **Verifica su Supabase:**
   - Vai su `pending_notifications`
   - La riga dovrebbe avere:
     - `sent`: `true` (era `false` prima)
     - `sent_at`: un timestamp

### 8.4 Test Notifica

1. **Su Browser 2 (ricevente):**
   - Dovresti ricevere una notifica push
   - Con suono (se il dispositivo non è in silenzioso)

---

**Inizia dal Passo 1 (Deploy Manuale) e dimmi quando completi ogni passo!** 🚀



