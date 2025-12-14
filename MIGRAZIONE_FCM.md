# 🔥 Migrazione da OneSignal a Firebase Cloud Messaging (FCM)

## Perché FCM?

- ✅ **Completamente gratuito** - Nessun limite
- ✅ **Nessun problema di dominio** - Funziona su qualsiasi dominio
- ✅ **Molto stabile** - Supportato da Google
- ✅ **Facile da integrare** - SDK ben documentato
- ✅ **Supporta web e mobile** - Stessa API per entrambi

---

## 📋 Piano di Migrazione

### STEP 1: Creare Progetto Firebase (5 minuti)

1. Vai su https://console.firebase.google.com/
2. Clicca **"Aggiungi progetto"** o **"Add project"**
3. Nome progetto: `nomadiqe` (o quello che preferisci)
4. Disabilita Google Analytics (opzionale, per semplicità)
5. Clicca **"Crea progetto"**

### STEP 2: Configurare Web App (3 minuti)

1. Nel progetto Firebase, clicca sull'icona **Web** (`</>`)
2. Nome app: `nomadiqe-web`
3. **NON** spuntare "Also set up Firebase Hosting"
4. Clicca **"Registra app"**
5. **COPIA** le credenziali che appaiono:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "nomadiqe.firebaseapp.com",
     projectId: "nomadiqe",
     storageBucket: "nomadiqe.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```

### STEP 3: Abilitare Cloud Messaging (2 minuti)

1. Nel menu laterale, vai su **"Build"** → **"Cloud Messaging"**
2. Clicca su **"Web configuration"**
3. **COPIA** la **"Web Push certificate"** (chiave server)
4. **COPIA** anche il **"Sender ID"** (se visibile)

### STEP 4: Generare Service Worker (1 minuto)

1. Vai su **"Cloud Messaging"** → **"Web Push certificates"**
2. Clicca **"Generate key pair"**
3. **COPIA** la chiave pubblica generata

---

## 🔧 Implementazione

Dopo aver completato i passi sopra, ti guiderò nell'implementazione del codice.

**Tempo totale stimato: 15-20 minuti**

---

## ✅ Vantaggi rispetto a OneSignal

- ❌ **OneSignal:** Problemi con dominio (nomadiqe.com vs www.nomadiqe.com)
- ✅ **FCM:** Funziona su qualsiasi dominio

- ❌ **OneSignal:** Limiti sul piano gratuito
- ✅ **FCM:** Completamente gratuito, nessun limite

- ❌ **OneSignal:** Configurazione complessa
- ✅ **FCM:** Setup semplice, ben documentato

---

**Inizia con STEP 1 e dimmi quando hai creato il progetto Firebase!** 🚀


