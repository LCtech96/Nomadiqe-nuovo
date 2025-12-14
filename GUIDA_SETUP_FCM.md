# 🔥 Guida Setup Firebase Cloud Messaging (FCM)

## ✅ Cosa è stato fatto

1. ✅ Firebase installato (`package.json`)
2. ✅ Configurazione Firebase creata (`lib/firebase/config.ts`)
3. ✅ FCM Provider creato (`components/fcm-provider.tsx`)
4. ✅ Service Worker creato (`public/firebase-messaging-sw.js`)
5. ✅ Layout aggiornato (usa `FCMProvider` invece di `OneSignalProvider`)
6. ✅ Script SQL per aggiornare database (`supabase/29_AGGIORNA_PUSH_SUBSCRIPTIONS_FCM.sql`)
7. ✅ API route FCM creata (`app/api/notifications/process-fcm/route.ts`)

---

## 📋 Passi da completare

### STEP 1: Installare Firebase (2 minuti)

Esegui nel terminale:

```bash
npm install
```

Questo installerà Firebase e tutte le dipendenze.

---

### STEP 2: Eseguire Script SQL (2 minuti)

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Apri il file `supabase/29_AGGIORNA_PUSH_SUBSCRIPTIONS_FCM.sql`
3. Copia tutto il contenuto
4. Incolla nel SQL Editor
5. Clicca **Run**

Questo aggiungerà la colonna `fcm_token` alla tabella `push_subscriptions`.

---

### STEP 3: Ottenere Server Key per FCM (5 minuti)

**IMPORTANTE:** Per inviare notifiche dal server, FCM richiede autenticazione OAuth2. 

#### Opzione A: Usa Service Account (Raccomandato)

1. Vai su Firebase Console → **Project Settings** → **Service accounts**
2. Clicca **"Generate new private key"**
3. Scarica il file JSON (NON committarlo nel repository!)
4. Usa questo file per autenticazione OAuth2

#### Opzione B: Usa Server Key Legacy (Più semplice, ma deprecato)

1. Vai su Firebase Console → **Project Settings** → **Cloud Messaging**
2. Cerca **"Server key"** (potrebbe non essere più disponibile)
3. Se disponibile, copiala

**NOTA:** L'API legacy è deprecata. Per ora, possiamo testare senza server key e poi implementare OAuth2.

---

### STEP 4: Aggiornare Variabili d'Ambiente (2 minuti)

Su **Vercel Dashboard** → **Settings** → **Environment Variables**, aggiungi:

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `nomadiqe-622fa`
- `FCM_SERVER_KEY` = (se disponibile, altrimenti lascia vuoto per ora)

---

### STEP 5: Aggiornare vercel.json (1 minuto)

Aggiorna `vercel.json` per usare la nuova route FCM:

```json
{
  "crons": [
    {
      "path": "/api/notifications/process-fcm",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

---

## 🧪 Test

1. **Fai deploy** su Vercel
2. **Fai login** su https://www.nomadiqe.com
3. **Dovresti vedere** il dialog per abilitare notifiche
4. **Clicca "Consenti"**
5. **Verifica** su Supabase → `push_subscriptions` che ci sia un `fcm_token`

---

## ⚠️ Nota Importante

L'API route `process-fcm` attualmente usa l'API legacy di FCM che richiede una server key. Se la server key non è disponibile, dobbiamo implementare OAuth2 con service account.

**Per ora, possiamo testare la parte client (iscrizione utenti) e poi implementiamo l'invio notifiche.**

---

## 🚀 Prossimi Passi

1. Installare Firebase: `npm install`
2. Eseguire script SQL
3. Testare l'iscrizione utenti
4. Implementare OAuth2 per invio notifiche (se necessario)

---

**Inizia con STEP 1 e STEP 2, poi testiamo!** 🔥


