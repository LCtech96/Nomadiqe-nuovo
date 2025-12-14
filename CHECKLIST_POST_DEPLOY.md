# ✅ CHECKLIST POST-DEPLOY - Verifica Sistema Notifiche

## 🕐 MENTRE ASPETTI IL DEPLOY (2-3 minuti)

### 1. Verifica Trigger su Supabase

Esegui questa query nel **SQL Editor di Supabase** per verificare che tutti i trigger siano stati creati:

```sql
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_send_message_notification',
    'trigger_send_like_notification',
    'trigger_send_comment_notification',
    'trigger_process_notification_webhook'
  )
ORDER BY trigger_name;
```

**Dovresti vedere 4 trigger:**
- ✅ `trigger_send_message_notification` su tabella `messages`
- ✅ `trigger_send_like_notification` su tabella `post_likes`
- ✅ `trigger_send_comment_notification` su tabella `post_comments`
- ✅ `trigger_process_notification_webhook` su tabella `pending_notifications`

---

### 2. Verifica Tabelle Realtime

Esegui questa query:

```sql
SELECT tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'post_likes', 'post_comments')
ORDER BY tablename;
```

**Dovresti vedere 3 tabelle:**
- ✅ `messages`
- ✅ `post_comments`
- ✅ `post_likes`

---

### 3. Verifica Tabelle Create

Esegui questa query:

```sql
SELECT table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('push_subscriptions', 'pending_notifications')
ORDER BY table_name;
```

**Dovresti vedere 2 tabelle:**
- ✅ `pending_notifications`
- ✅ `push_subscriptions`

---

## 🚀 DOPO IL DEPLOY COMPLETATO

### 4. Verifica Deploy su Vercel

1. Vai su: https://vercel.com/dashboard
2. Seleziona progetto **"nomadiqe-nuovo"**
3. Clicca su **"Deployments"**
4. Verifica che l'ultimo deploy abbia **checkmark verde** ✅ e dica **"Ready"**

---

### 5. Verifica Cron Job

1. Su Vercel Dashboard, vai su **"Settings"** → **"Cron Jobs"**
2. Dovresti vedere il cron job che chiama `/api/notifications/process` ogni minuto
3. Se non lo vedi, aspetta 2-3 minuti e ricarica

---

### 6. Verifica Variabili d'Ambiente

Su Vercel Dashboard → **"Settings"** → **"Environment Variables"**, verifica che ci siano:

- ✅ `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- ✅ `ONESIGNAL_REST_API_KEY`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (appena aggiunta)

---

## 🧪 TEST COMPLETO DEL SISTEMA

### Preparazione

1. **Apri DUE browser diversi** (o due finestre in incognito):
   - **Browser 1:** Chrome - Account A (mittente)
   - **Browser 2:** Firefox - Account B (ricevente)

2. **Su Browser 1:**
   - Vai su https://www.nomadiqe.com
   - Accedi con Account A

3. **Su Browser 2:**
   - Vai su https://www.nomadiqe.com
   - Accedi con Account B
   - **Abilita le notifiche push:**
     - Dovrebbe apparire un dialog dopo 3 secondi
     - Clicca "Abilita notifiche"
     - Oppure: Impostazioni Browser → Notifiche → Permetti per nomadiqe.com

---

### Test 1: Invio Messaggio

1. **Su Browser 1 (mittente):**
   - Vai su un profilo di Account B
   - Clicca su "Invia messaggio" o "Messaggio"
   - Scrivi: "Test notifica push"
   - Clicca "Invia"

2. **Verifica in tempo reale:**
   - **Su Browser 2:** Il messaggio dovrebbe apparire immediatamente senza ricaricare
   - **Su Browser 1:** Dovresti vedere il messaggio nella conversazione

---

### Test 2: Verifica Trigger

1. **Vai su Supabase Dashboard** → **Table Editor** → `pending_notifications`
2. **Dovresti vedere** una nuova riga con:
   - `notification_type`: `message`
   - `sent`: `false`
   - `user_id`: ID di Account B
   - `title`: `💬 Nuovo messaggio`
   - `message`: Nome di Account A + ": Test notifica push"

**Se NON vedi la riga:**
- ❌ I trigger non funzionano
- **Soluzione:** Riesegui lo script `26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`

---

### Test 3: Verifica Processamento (Cron Job)

1. **Attendi 1-2 minuti** dopo aver inviato il messaggio

2. **Torna su Supabase** → `pending_notifications`
3. **La riga creata prima dovrebbe avere:**
   - `sent`: `true` (era `false` prima)
   - `sent_at`: un timestamp (quando è stata processata)

**Se `sent` è ancora `false` dopo 2 minuti:**
- ❌ Il cron job non sta funzionando
- **Soluzione:**
  1. Vai su Vercel Dashboard → Deployments → Ultimo deploy → Functions
  2. Cerca `/api/notifications/process` e controlla i log
  3. Verifica che il cron job sia attivo

---

### Test 4: Verifica Notifica Push

1. **Su Browser 2 (ricevente):**
   - Dovresti ricevere una **notifica push** con suono
   - La notifica dovrebbe dire: "💬 Nuovo messaggio" e il nome di Account A
   - Clicca sulla notifica → Dovrebbe aprire la pagina messaggi

2. **Test con app chiusa:**
   - Chiudi completamente Browser 2 (o la scheda)
   - Su Browser 1, invia un altro messaggio
   - Attendi 1-2 minuti
   - Apri Browser 2 → Dovresti vedere la notifica push

**Se NON arriva la notifica:**
- ❌ OneSignal non è configurato correttamente
- **Soluzione:**
  1. Verifica che Account B sia iscritto:
     - Supabase → Table Editor → `push_subscriptions`
     - Dovresti vedere una riga con `user_id` = ID di Account B
  2. Verifica le variabili d'ambiente su Vercel
  3. Controlla i log di Vercel per errori OneSignal

---

## ✅ CHECKLIST FINALE

- [ ] Deploy completato con successo su Vercel
- [ ] Cron job visibile su Vercel Dashboard
- [ ] Tutti i trigger creati (4 trigger)
- [ ] Tabelle Realtime abilitate (3 tabelle)
- [ ] Tabelle create (2 tabelle)
- [ ] Variabili d'ambiente presenti (5 variabili)
- [ ] Messaggio inviato tra due account
- [ ] Notifica creata in `pending_notifications` con `sent = false`
- [ ] Dopo 1-2 minuti, `sent = true` (cron job funziona)
- [ ] Notifica push ricevuta con suono
- [ ] Notifica funziona anche con app chiusa

---

## 🎉 SE TUTTO FUNZIONA

**Complimenti! Il sistema di notifiche è completamente configurato e funzionante!** 🚀

Ora hai:
- ✅ Messaggi in tempo reale
- ✅ Notifiche push con suono
- ✅ Notifiche anche quando l'app è chiusa
- ✅ Aggiornamento automatico delle conversazioni

---

## 🆘 SE QUALCOSA NON FUNZIONA

Vedi la sezione "Se Qualcosa Non Funziona" nel file `ISTRUZIONI_STEP_BY_STEP_COMPLETE.md`

---

**Inizia con le verifiche mentre aspetti il deploy, poi procedi con i test!** 🚀


