# 🚀 GUIDA RAPIDA - Esecuzione Script SQL

## 📁 DOVE TROVARE GLI SCRIPT

Gli script SQL si trovano nella cartella `supabase/` del tuo progetto:

1. **`supabase/22_ABILITA_REALTIME_ONESIGNAL.sql`**
   - Abilita Realtime per messaggi, like e commenti
   - Crea la tabella `push_subscriptions`

2. **`supabase/26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`**
   - Crea i trigger per inviare notifiche quando arrivano messaggi/like/commenti
   - Crea la tabella `pending_notifications`

3. **`supabase/27_CONFIGURA_WEBHOOK_NOTIFICHE.sql`** (OPZIONALE)
   - Configura un webhook Supabase (non necessario se usi Vercel Cron Jobs)

---

## 🎯 COME ESEGUIRE GLI SCRIPT

### PASSO 1: Apri Supabase SQL Editor

1. Vai su: **https://supabase.com/dashboard**
2. Seleziona il tuo progetto
3. Nel menu laterale sinistro, clicca su **"SQL Editor"**
4. Clicca su **"New Query"** (in alto a destra)

---

### PASSO 2: Esegui Script 1 - Abilita Realtime

1. **Apri il file** `supabase/22_ABILITA_REALTIME_ONESIGNAL.sql` nel tuo editor
2. **Seleziona TUTTO** (Ctrl+A) e **Copia** (Ctrl+C)
3. **Torna a Supabase SQL Editor**
4. **Incolla** lo script (Ctrl+V)
5. **Clicca "Run"** (o premi Ctrl+Enter)
6. **Verifica** che non ci siano errori rossi
7. Dovresti vedere tabelle con risultati di verifica

---

### PASSO 3: Esegui Script 2 - Crea Trigger

1. **Nel SQL Editor**, clicca su **"New Query"** per una nuova query
2. **Apri il file** `supabase/26_TRIGGER_NOTIFICHE_ONESIGNAL.sql`
3. **Copia tutto** e **Incolla** nel SQL Editor
4. **Clicca "Run"**
5. **Verifica** che non ci siano errori
6. Dovresti vedere "TRIGGER CREATI" e "TABELLA PENDING_NOTIFICATIONS"

---

### PASSO 4: (OPZIONALE) Esegui Script 3 - Webhook

⚠️ **NOTA**: Questo script è **OPZIONALE** perché stai già usando Vercel Cron Jobs.

Se vuoi comunque eseguirlo:
1. **Apri** `supabase/27_CONFIGURA_WEBHOOK_NOTIFICHE.sql`
2. **Copia e incolla** nel SQL Editor
3. **Esegui**

---

## ✅ VERIFICA FINALE

Dopo aver eseguito gli script, verifica che tutto sia stato creato:

### Verifica 1: Tabelle create
Esegui questa query nel SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('push_subscriptions', 'pending_notifications')
ORDER BY table_name;
```

**Dovresti vedere 2 righe**: `pending_notifications` e `push_subscriptions`

---

### Verifica 2: Trigger creati
Esegui questa query:
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_send_message_notification',
    'trigger_send_like_notification',
    'trigger_send_comment_notification'
  )
ORDER BY trigger_name;
```

**Dovresti vedere 3 righe** con i nomi dei trigger.

---

### Verifica 3: Realtime abilitato
Esegui questa query:
```sql
SELECT tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('messages', 'post_likes', 'post_comments')
ORDER BY tablename;
```

**Dovresti vedere 3 righe**: `messages`, `post_comments`, `post_likes`

---

## 🆘 PROBLEMI COMUNI

### Errore: "extension http does not exist"
- **Soluzione**: Ignora questo errore. Supabase potrebbe non avere l'estensione `http`, ma non è necessaria se usi Vercel Cron Jobs.

### Errore: "relation already exists"
- **Soluzione**: Normale! Significa che la tabella/trigger esiste già. Lo script usa `CREATE IF NOT EXISTS`, quindi è sicuro.

### Non vedo i risultati delle query di verifica
- **Soluzione**: Scorri in basso nella finestra dei risultati. A volte i risultati sono più in basso.

---

## 📞 PROSSIMI PASSI

Dopo aver eseguito gli script SQL:
1. ✅ Verifica le variabili d'ambiente su Vercel (vedi `ISTRUZIONI_STEP_BY_STEP_COMPLETE.md`)
2. ✅ Testa l'invio di un messaggio tra due account
3. ✅ Verifica che arrivi la notifica push con suono

---

**Hai bisogno di aiuto?** Controlla il file `ISTRUZIONI_STEP_BY_STEP_COMPLETE.md` per la guida completa.


