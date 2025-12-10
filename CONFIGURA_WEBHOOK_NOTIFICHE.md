# 🔔 Configurazione Webhook per Notifiche Push

Questa guida ti aiuta a configurare le notifiche push anche quando l'app è chiusa.

## 🎯 Due Soluzioni Disponibili

### ✅ Soluzione 1: Vercel Cron Jobs (CONSIGLIATA - Più Semplice)

Questa è la soluzione più semplice e affidabile. Vercel chiamerà automaticamente l'API ogni minuto per processare le notifiche pending.

#### Passi:

1. **Il file `vercel.json` è già stato creato** ✅
   - Contiene la configurazione del cron job
   - Chiama `/api/notifications/process` ogni minuto

2. **Fai il deploy su Vercel**
   ```bash
   git add vercel.json
   git commit -m "Add cron job for notifications"
   git push
   ```

3. **Verifica che il cron job sia attivo**
   - Vai su [Vercel Dashboard](https://vercel.com/dashboard)
   - Seleziona il tuo progetto
   - Vai su **Settings** → **Cron Jobs**
   - Dovresti vedere il cron job configurato

4. **Test**
   - Invia un messaggio quando l'app è chiusa
   - La notifica dovrebbe arrivare entro 1 minuto

---

### 🔧 Soluzione 2: Webhook Supabase (Alternativa)

Questa soluzione chiama immediatamente l'API quando viene inserita una notifica, senza aspettare il cron job.

#### Passi:

1. **Esegui lo script SQL su Supabase**
   - Vai su [Supabase Dashboard](https://supabase.com/dashboard)
   - Seleziona il tuo progetto
   - Vai su **SQL Editor**
   - Apri il file `supabase/27_CONFIGURA_WEBHOOK_NOTIFICHE.sql`
   - Copia tutto il contenuto
   - Incolla nel SQL Editor
   - Clicca **Run** o premi `Ctrl+Enter`

2. **Verifica che l'estensione pg_net sia disponibile**
   - Se vedi un errore che dice che `pg_net` non è disponibile, usa la Soluzione 1 (Vercel Cron)

3. **Test**
   - Invia un messaggio quando l'app è chiusa
   - La notifica dovrebbe arrivare immediatamente

---

## 🔍 Verifica che Funzioni

### Test 1: Verifica che le notifiche pending vengano create

1. Invia un messaggio da un account a un altro
2. Vai su Supabase Dashboard → **Table Editor** → `pending_notifications`
3. Dovresti vedere una nuova riga con `sent = false`

### Test 2: Verifica che l'API processi le notifiche

1. Chiama manualmente l'API:
   ```bash
   curl -X POST https://www.nomadiqe.com/api/notifications/process
   ```
2. Oppure vai su: `https://www.nomadiqe.com/api/notifications/process` (GET endpoint)
3. Dovresti vedere il numero di notifiche pending

### Test 3: Verifica che le notifiche vengano inviate

1. Invia un messaggio quando l'app è chiusa
2. Controlla che la notifica arrivi entro 1 minuto (con Vercel Cron)
3. Oppure immediatamente (con Webhook Supabase)

---

## 🛠️ Troubleshooting

### Le notifiche non vengono processate

1. **Verifica che il cron job sia attivo su Vercel**
   - Vai su Vercel Dashboard → Settings → Cron Jobs
   - Dovresti vedere il cron job configurato

2. **Verifica i log di Vercel**
   - Vai su Vercel Dashboard → Deployments → Logs
   - Cerca chiamate a `/api/notifications/process`

3. **Verifica che le notifiche pending esistano**
   - Vai su Supabase → Table Editor → `pending_notifications`
   - Dovresti vedere notifiche con `sent = false`

### Le notifiche non arrivano

1. **Verifica che l'utente sia iscritto alle notifiche**
   - Controlla la tabella `push_subscriptions` in Supabase
   - Dovrebbe esserci una riga con il `user_id` e `onesignal_player_id`

2. **Verifica che OneSignal sia configurato correttamente**
   - Controlla le variabili d'ambiente su Vercel
   - `NEXT_PUBLIC_ONESIGNAL_APP_ID` e `ONESIGNAL_REST_API_KEY` devono essere configurate

3. **Verifica i log dell'API**
   - Controlla i log di Vercel per errori nell'invio delle notifiche

---

## 📝 Note Importanti

- **Vercel Cron Jobs** funzionano solo su piani a pagamento (Hobby o superiore)
- Se sei su un piano gratuito, usa la **Soluzione 2 (Webhook Supabase)**
- Entrambe le soluzioni possono essere usate insieme per maggiore affidabilità

---

## ✅ Checklist

- [ ] File `vercel.json` creato e committato
- [ ] Deploy su Vercel completato
- [ ] Cron job attivo su Vercel (se usi Soluzione 1)
- [ ] Script SQL eseguito su Supabase (se usi Soluzione 2)
- [ ] Test invio messaggio con app chiusa
- [ ] Notifica ricevuta correttamente

---

**Tutto pronto! 🎉**

Se hai problemi, controlla i log di Vercel e Supabase per errori.

