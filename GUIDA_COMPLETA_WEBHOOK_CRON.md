# 🔔 GUIDA COMPLETA: Configurazione Notifiche Push

## 📋 Checklist Completa

Segui questi passi **IN ORDINE** per configurare tutto correttamente.

---

## ✅ PASSO 1: Verifica Deploy Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto **nomadiqe-nuovo**
3. Vai su **Deployments** (in alto)
4. Verifica che l'ultimo deploy sia **completato** (dovrebbe avere un checkmark verde)
5. Se il deploy è ancora in corso, aspetta che finisca

**✅ Fatto?** → Vai al Passo 2

---

## ✅ PASSO 2: Verifica Cron Job su Vercel

1. Sempre su Vercel Dashboard, vai su **Settings** (in alto)
2. Nel menu laterale sinistro, clicca su **Cron Jobs**
3. **Cosa dovresti vedere:**
   - Se vedi una sezione "Active Cron Jobs" con il tuo cron job → ✅ **PERFETTO!** Vai al Passo 3
   - Se vedi solo le istruzioni "Get Started" → Il cron job non è stato creato ancora

**Se NON vedi il cron job:**
- Attendi 2-3 minuti dopo il deploy
- Ricarica la pagina
- Se ancora non c'è, verifica che `vercel.json` sia nella root del progetto

**✅ Fatto?** → Vai al Passo 3

---

## ✅ PASSO 3: Configura Trigger Database su Supabase

Questo è il passo più importante! Il trigger database crea le notifiche quando arriva un messaggio.

### 3.1 Apri SQL Editor su Supabase

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il progetto (dovrebbe essere già selezionato)
3. Nel menu laterale sinistro, clicca su **SQL Editor** (icona con `</>`)

### 3.2 Esegui lo Script per Abilitare Realtime

1. Nel SQL Editor, clicca su **New Query** (in alto a destra)
2. Apri il file `supabase/22_ABILITA_REALTIME_ONESIGNAL.sql` dal tuo progetto
3. **COPIA TUTTO** il contenuto del file
4. **INCOLLA** nel SQL Editor di Supabase
5. Clicca su **Run** (o premi `Ctrl+Enter`)
6. **VERIFICA** che non ci siano errori (dovresti vedere messaggi di successo)

**✅ Fatto?** → Vai al Passo 3.3

### 3.3 Esegui lo Script per Creare i Trigger

1. Sempre nel SQL Editor, clicca su **New Query**
2. Apri il file `supabase/26_TRIGGER_NOTIFICHE_ONESIGNAL.sql` dal tuo progetto
3. **COPIA TUTTO** il contenuto del file
4. **INCOLLA** nel SQL Editor di Supabase
5. Clicca su **Run** (o premi `Ctrl+Enter`)
6. **VERIFICA** che non ci siano errori

**✅ Fatto?** → Vai al Passo 4

---

## ✅ PASSO 4: Verifica che i Trigger siano Attivi

1. Sempre su Supabase Dashboard, vai su **Database** (menu laterale)
2. Clicca su **Triggers** (sotto Database)
3. **Cosa dovresti vedere:**
   - `trigger_send_message_notification` sulla tabella `messages`
   - `trigger_send_like_notification` sulla tabella `post_likes`
   - `trigger_send_comment_notification` sulla tabella `post_comments`

**Se NON vedi i trigger:**
- Torna al Passo 3.3 e riesegui lo script
- Controlla gli errori nel SQL Editor

**✅ Fatto?** → Vai al Passo 5

---

## ✅ PASSO 5: Verifica che la Tabella pending_notifications Esista

1. Su Supabase Dashboard, vai su **Table Editor** (menu laterale)
2. Cerca la tabella `pending_notifications`
3. **Se la tabella NON esiste:**
   - Torna al Passo 3.3 e riesegui lo script `26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`
4. **Se la tabella esiste:**
   - ✅ Perfetto! Vai al Passo 6

**✅ Fatto?** → Vai al Passo 6

---

## ✅ PASSO 6: Test Completo

Ora testiamo tutto il sistema!

### 6.1 Test 1: Verifica che le Notifiche Pending vengano Create

1. Apri due browser/account diversi:
   - Browser 1: Account A (mittente)
   - Browser 2: Account B (ricevente)
2. **Su Browser 2 (ricevente):**
   - Assicurati di essere loggato
   - Abilita le notifiche push (se non l'hai già fatto)
3. **Su Browser 1 (mittente):**
   - Invia un messaggio a Account B
4. **Verifica su Supabase:**
   - Vai su Supabase Dashboard → **Table Editor** → `pending_notifications`
   - Dovresti vedere una nuova riga con:
     - `notification_type`: `message`
     - `sent`: `false`
     - `user_id`: ID di Account B

**✅ Fatto?** → Vai al Test 2

### 6.2 Test 2: Verifica che il Cron Job Processi le Notifiche

1. **Attendi 1-2 minuti** dopo aver inviato il messaggio
2. **Verifica su Supabase:**
   - Vai su `pending_notifications`
   - La riga creata prima dovrebbe avere:
     - `sent`: `true`
     - `sent_at`: timestamp di quando è stata processata
3. **Verifica su Vercel:**
   - Vai su Vercel Dashboard → **Deployments** → Clicca sull'ultimo deploy
   - Vai su **Functions** → Cerca `/api/notifications/process`
   - Dovresti vedere chiamate al cron job ogni minuto

**✅ Fatto?** → Vai al Test 3

### 6.3 Test 3: Verifica che la Notifica Arrivi

1. **Su Browser 2 (ricevente):**
   - Dovresti ricevere una notifica push
   - La notifica dovrebbe avere un suono (se il dispositivo non è in silenzioso)
   - Cliccando sulla notifica, dovrebbe aprire `/messages`

**✅ Fatto?** → Tutto funziona! 🎉

---

## 🛠️ Troubleshooting

### Il cron job non appare su Vercel

1. Verifica che `vercel.json` sia nella **root** del progetto
2. Verifica che il deploy sia completato
3. Attendi 2-3 minuti dopo il deploy
4. Ricarica la pagina Cron Jobs

### Le notifiche pending non vengono create

1. Verifica che i trigger siano attivi (Passo 4)
2. Controlla gli errori nel SQL Editor
3. Verifica che la tabella `messages` esista

### Le notifiche pending non vengono processate

1. Verifica che il cron job sia attivo su Vercel
2. Controlla i log di Vercel per errori
3. Verifica che le variabili d'ambiente `ONESIGNAL_REST_API_KEY` e `NEXT_PUBLIC_ONESIGNAL_APP_ID` siano configurate su Vercel

### Le notifiche non arrivano

1. Verifica che l'utente sia iscritto alle notifiche (tabella `push_subscriptions`)
2. Verifica che OneSignal sia configurato correttamente
3. Controlla i log di Vercel per errori nell'invio

---

## 📝 Note Finali

- Il cron job su Vercel funziona solo su piani a pagamento (Hobby o superiore)
- Se sei su un piano gratuito, usa il webhook Supabase (Passo 7 opzionale)

---

## ✅ PASSO 7 (OPZIONALE): Configura Webhook Supabase

Se vuoi che le notifiche vengano processate **immediatamente** invece di aspettare il cron job:

1. Vai su Supabase Dashboard → **SQL Editor**
2. Apri il file `supabase/27_CONFIGURA_WEBHOOK_NOTIFICHE.sql`
3. **COPIA TUTTO** il contenuto
4. **INCOLLA** nel SQL Editor
5. Clicca su **Run**
6. **VERIFICA** che non ci siano errori

**Nota:** Questo richiede che l'estensione `pg_net` o `http` sia disponibile su Supabase.

---

**Tutto pronto! 🎉**

Segui questi passi in ordine e dimmi se hai problemi a qualsiasi passo.




