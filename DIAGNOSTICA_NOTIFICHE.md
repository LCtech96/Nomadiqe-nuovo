# 🔍 DIAGNOSTICA NOTIFICHE PUSH

## Problema: Notifiche create ma non arrivano sul cellulare

### ✅ Cosa funziona:
- I trigger creano le notifiche in `pending_notifications` ✅
- Il cron job processa le notifiche (`sent: TRUE`) ✅

### ❌ Cosa non funziona:
- Le notifiche non arrivano sul cellulare ❌

---

## 🔍 STEP 1: Verifica Iscrizione Utente

### Controlla se l'utente ricevente è iscritto:

1. **Vai su Supabase Dashboard** → **Table Editor** → `push_subscriptions`
2. **Cerca** una riga con `user_id` = ID dell'utente ricevente
3. **Verifica** che ci sia un `onesignal_player_id` (non vuoto)

**Se NON vedi la riga:**
- ❌ L'utente non è iscritto alle notifiche push
- **Soluzione:** Vedi STEP 2

**Se vedi la riga ma `onesignal_player_id` è vuoto:**
- ❌ OneSignal non ha salvato il player ID
- **Soluzione:** Vedi STEP 2

---

## 🔍 STEP 2: Iscrivi l'Utente alle Notifiche

### Su ogni cellulare:

1. **Apri l'app** su https://www.nomadiqe.com
2. **Accedi** con l'account ricevente
3. **Attendi 3-5 secondi** dopo il login
4. **Dovrebbe apparire** un dialog per abilitare le notifiche
5. **Clicca "Consenti"** o "Abilita notifiche"

### Se il dialog non appare:

1. **Apri la console del browser** (F12 → Console)
2. **Cerca** messaggi che iniziano con "OneSignal"
3. **Verifica** che non ci siano errori
4. **Ricarica la pagina** e riprova

### Verifica dopo l'iscrizione:

1. **Torna su Supabase** → `push_subscriptions`
2. **Dovresti vedere** una nuova riga con:
   - `user_id`: ID dell'utente
   - `onesignal_player_id`: Un ID lungo (es. `abc123-def456-...`)

---

## 🔍 STEP 3: Verifica Log di Vercel

### Controlla se OneSignal sta ricevendo le richieste:

1. **Vai su Vercel Dashboard** → **Deployments** → Ultimo deploy
2. **Clicca** su **"Functions"** o **"Logs"**
3. **Cerca** `/api/notifications/process` nei log
4. **Cerca** messaggi di errore o risposte da OneSignal

### Cosa cercare:

- ✅ **Successo:** `processed: 1` o `response.ok`
- ❌ **Errore OneSignal:** `OneSignal API error` o `status: 400/401/500`
- ❌ **Utente non iscritto:** `Utente non iscritto` o `subscription not found`

---

## 🔍 STEP 4: Test Manuale OneSignal

### Testa direttamente l'API OneSignal:

1. **Ottieni** il `onesignal_player_id` dell'utente ricevente da `push_subscriptions`
2. **Usa** questo comando (sostituisci i valori):

```bash
curl -X POST "https://onesignal.com/api/v1/notifications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YOUR_REST_API_KEY" \
  -d '{
    "app_id": "YOUR_APP_ID",
    "include_player_ids": ["PLAYER_ID_UTENTE"],
    "headings": {"en": "Test", "it": "Test"},
    "contents": {"en": "Test notifica", "it": "Test notifica"},
    "sound": "default",
    "priority": 10
  }'
```

**Se funziona:**
- ✅ OneSignal funziona, il problema è nel codice
- **Soluzione:** Vedi STEP 5

**Se NON funziona:**
- ❌ Problema con OneSignal o credenziali
- **Soluzione:** Verifica le variabili d'ambiente su Vercel

---

## 🔍 STEP 5: Verifica Configurazione OneSignal

### Controlla le variabili d'ambiente su Vercel:

1. **Vai su Vercel Dashboard** → **Settings** → **Environment Variables**
2. **Verifica** che ci siano:
   - `NEXT_PUBLIC_ONESIGNAL_APP_ID` = `3b54b91a-7afb-47a4-b50b-36294def8760`
   - `ONESIGNAL_REST_API_KEY` = (dovrebbe iniziare con `os_v2_app_...`)

### Controlla OneSignal Dashboard:

1. **Vai su** https://onesignal.com/apps
2. **Seleziona** la tua app
3. **Vai su** **Settings** → **Platforms** → **Web Push**
4. **Verifica** che:
   - **Site URL** = `https://www.nomadiqe.com`
   - **Safari Web ID** è configurato (se usi Safari)

---

## 🔍 STEP 6: Verifica Permessi Dispositivo

### Su Android:

1. **Impostazioni** → **App** → **Chrome** (o il browser che usi)
2. **Notifiche** → **Abilita** le notifiche
3. **Permessi** → **Notifiche** → **Consenti**

### Su iOS (Safari):

1. **Impostazioni** → **Safari** → **Notifiche**
2. **Abilita** le notifiche per nomadiqe.com
3. **Oppure** quando apri il sito, clicca sull'icona 🔒 nella barra degli indirizzi → **Notifiche** → **Consenti**

---

## 🔍 STEP 7: Debug nel Codice

### Aggiungi logging per vedere cosa succede:

Modifica `app/api/notifications/process/route.ts` per aggiungere più log:

```typescript
console.log("🔔 Processing notification:", notification.id)
console.log("👤 User ID:", notification.user_id)
console.log("📱 Subscription:", subscription)
console.log("📤 Sending to OneSignal...")
console.log("📥 OneSignal response:", response.status, await response.text())
```

Poi controlla i log di Vercel dopo aver inviato un messaggio.

---

## ✅ CHECKLIST COMPLETA

- [ ] Utente ricevente è iscritto in `push_subscriptions`
- [ ] `onesignal_player_id` non è vuoto
- [ ] Le notifiche sono abilitate sul dispositivo
- [ ] Le variabili d'ambiente su Vercel sono corrette
- [ ] OneSignal Dashboard è configurato correttamente
- [ ] I log di Vercel non mostrano errori
- [ ] Test manuale OneSignal funziona

---

## 🆘 Se Nulla Funziona

1. **Verifica** che stai usando HTTPS (non HTTP)
2. **Prova** su un dispositivo diverso
3. **Prova** con un browser diverso
4. **Controlla** i log di OneSignal Dashboard → **Delivery** → **Notifications**

---

**Inizia con STEP 1 e dimmi cosa trovi!** 🔍



