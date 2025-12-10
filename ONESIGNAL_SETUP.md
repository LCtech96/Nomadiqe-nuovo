# 🔔 Setup OneSignal Push Notifications

## ✅ File Creati

1. ✅ `supabase/22_ABILITA_REALTIME_ONESIGNAL.sql` - Script SQL per abilitare Realtime e creare tabella push_subscriptions
2. ✅ `components/onesignal-provider.tsx` - Provider React per OneSignal
3. ✅ `app/api/notifications/send/route.ts` - API route per inviare notifiche
4. ✅ `app/layout.tsx` - Aggiornato per includere OneSignalProvider

## 🚀 Passi da Completare

### 1️⃣ Esegui lo Script SQL su Supabase (2 minuti)

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Apri il file `supabase/22_ABILITA_REALTIME_ONESIGNAL.sql`
5. Copia tutto il contenuto
6. Incolla nel SQL Editor
7. Clicca **Run** o premi `Ctrl+Enter`
8. Verifica che non ci siano errori

**Risultato atteso:**
- Le tabelle `messages`, `post_likes`, `post_comments` sono aggiunte alla publication `supabase_realtime`
- La tabella `push_subscriptions` è creata
- RLS è disabilitato per `push_subscriptions`

---

### 2️⃣ Aggiungi Variabili d'Ambiente (3 minuti)

#### A. File `.env.local` (Locale)

Aggiungi queste righe al file `.env.local` nella root del progetto:

```env
# OneSignal Configuration
NEXT_PUBLIC_ONESIGNAL_APP_ID=3b54b91a-7afb-47a4-b50b-36294def8760
ONESIGNAL_REST_API_KEY=LA_TUA_CHIAVE_ONESIGNAL_QUI
```

#### B. Vercel Environment Variables (Produzione)

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto **nomadiqe-nuovo** (o il nome del tuo progetto)
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi queste due variabili:

   **Variabile 1:**
   - **Name**: `NEXT_PUBLIC_ONESIGNAL_APP_ID`
   - **Value**: `3b54b91a-7afb-47a4-b50b-36294def8760`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

   **Variabile 2:**
   - **Name**: `ONESIGNAL_REST_API_KEY`
   - **Value**: `LA_TUA_CHIAVE_ONESIGNAL_QUI`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

5. Clicca **Save** per ogni variabile

---

### 3️⃣ Redeploy su Vercel (2 minuti)

Dopo aver aggiunto le variabili d'ambiente:

1. Vai su **Deployments** nel dashboard Vercel
2. Trova l'ultimo deployment
3. Clicca sui **tre puntini** (`...`)
4. Seleziona **Redeploy**
5. Aspetta 2-3 minuti per il completamento

**Oppure** fai un nuovo commit e push:

```bash
git add .
git commit -m "Add OneSignal push notifications"
git push
```

---

## 🧪 Test delle Notifiche

### Test Locale

1. Avvia il server di sviluppo:
   ```bash
   pnpm dev
   ```

2. Apri il browser su `http://localhost:3000`
3. Fai login con un account
4. Dovresti vedere un dialog che chiede di abilitare le notifiche (dopo 3 secondi)
5. Clicca **"Abilita notifiche"** e accetta nel browser
6. Apri la console del browser (F12) e verifica che non ci siano errori

### Test Produzione

1. Dopo il deploy, vai sul sito in produzione
2. Fai login
3. Dovresti vedere il dialog per abilitare le notifiche
4. Abilita le notifiche
5. Per testare:
   - Chiedi a un altro utente di inviarti un messaggio
   - Chiedi a un altro utente di mettere like a un tuo post
   - Chiedi a un altro utente di commentare un tuo post
6. Dovresti ricevere una notifica push anche se l'app è chiusa

---

## 📋 Cosa Fa il Sistema

### Notifiche Automatiche

Il sistema invia automaticamente notifiche push quando:

1. **Nuovo Messaggio**: Qualcuno ti invia un messaggio
   - Titolo: "💬 Nuovo messaggio"
   - Messaggio: "{Nome mittente}: {Anteprima messaggio}"
   - Link: `/messages`

2. **Nuovo Like**: Qualcuno mette like a un tuo post
   - Titolo: "❤️ Nuovo like"
   - Messaggio: "{Nome utente} ha messo mi piace al tuo post"
   - Link: `/posts/{post_id}`

3. **Nuovo Commento**: Qualcuno commenta un tuo post
   - Titolo: "💬 Nuovo commento"
   - Messaggio: "{Nome utente}: {Anteprima commento}"
   - Link: `/posts/{post_id}`

### Funzionalità

- ✅ Notifiche anche quando l'app è chiusa
- ✅ Dialog automatico per richiedere permessi
- ✅ Salvataggio automatico del Player ID in Supabase
- ✅ Listener Realtime per eventi in tempo reale
- ✅ Notifiche personalizzate con nome utente e contenuto

---

## 🔍 Troubleshooting

### Errore: "Can only be used on: https://nomadiqe.com"

**Problema:** OneSignal è configurato per funzionare solo su un dominio specifico.

**Soluzione:** Devi aggiungere i domini autorizzati nel dashboard OneSignal:

1. Vai su [OneSignal Dashboard](https://app.onesignal.com/)
2. Seleziona la tua app
3. Vai su **Settings** → **Platforms** → **Web Push**
4. Nella sezione **Web Push Configuration**, trova **"Allowed Origins"** o **"Authorized Domains"**
5. Aggiungi questi domini:
   - `https://nomadiqe.com`
   - `https://www.nomadiqe.com`
   - `http://localhost:3000` (per sviluppo locale)
   - `http://127.0.0.1:3000` (per sviluppo locale)
   - Qualsiasi altro dominio di preview/staging che usi
6. Clicca **Save**
7. **Importante:** Potrebbe richiedere alcuni minuti per propagare le modifiche

**Nota:** Se stai testando in produzione, assicurati che il dominio sia esattamente quello configurato (con o senza `www`).

### Le notifiche non arrivano

1. **Verifica le variabili d'ambiente:**
   - Controlla che siano presenti in `.env.local` (locale)
   - Controlla che siano presenti su Vercel (produzione)

2. **Verifica lo script SQL:**
   - Assicurati di aver eseguito `22_ABILITA_REALTIME_ONESIGNAL.sql`
   - Verifica che la tabella `push_subscriptions` esista

3. **Verifica la console del browser:**
   - Apri F12 → Console
   - Cerca errori relativi a OneSignal
   - Verifica che OneSignal sia inizializzato

4. **Verifica i permessi del browser:**
   - Vai su Impostazioni → Privacy → Notifiche
   - Assicurati che il sito abbia i permessi per le notifiche

5. **Verifica in Supabase:**
   - Controlla la tabella `push_subscriptions`
   - Dovresti vedere una riga con il tuo `user_id` e `onesignal_player_id`

6. **Verifica i domini autorizzati:**
   - Controlla che il dominio corrente sia nella lista dei domini autorizzati in OneSignal
   - Vedi la sezione sopra per come aggiungere domini

### Il dialog non appare

- Il dialog appare dopo 3 secondi solo se l'utente non è già iscritto
- Se hai già abilitato le notifiche, il dialog non apparirà
- Controlla la console per errori

### Errori nella console

- **"OneSignal non configurato"**: Le variabili d'ambiente non sono impostate correttamente
- **"Utente non iscritto"**: L'utente non ha ancora abilitato le notifiche
- **"OneSignal API error"**: Problema con la REST API Key o con la richiesta a OneSignal
- **"Can only be used on: https://nomadiqe.com"**: Il dominio corrente non è autorizzato. Vedi la sezione sopra per come risolvere

---

## 📚 Documentazione

- [OneSignal Web SDK](https://documentation.onesignal.com/docs/web-sdk-setup)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

## ✅ Checklist Finale

- [ ] Script SQL eseguito su Supabase
- [ ] Variabili d'ambiente aggiunte a `.env.local`
- [ ] Variabili d'ambiente aggiunte su Vercel
- [ ] Deploy completato su Vercel
- [ ] Test locale funzionante
- [ ] Notifiche ricevute in produzione

---

**Tutto pronto! 🎉**

Se hai problemi, controlla la console del browser e i log di Vercel per errori.
