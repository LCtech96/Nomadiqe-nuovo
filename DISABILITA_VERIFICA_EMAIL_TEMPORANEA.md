# ⚡ Soluzione Immediata: Disabilita Temporaneamente la Verifica Email

## 🎯 Obiettivo

Farti procedere con la registrazione SUBITO, senza dover aspettare l'email.

## ✅ Soluzione in 3 Passi (2 minuti)

### **PASSO 1: Disabilita la Verifica Email su Supabase**

1. Apri: https://supabase.com/dashboard
2. Seleziona il progetto: **nomadiqenuovo** (umodgqcplvwmhfagihhu)
3. Vai su: **Authentication** → **Providers** → **Email**
4. **Trova l'opzione**: "Enable email confirmations" (o "Confirm email")
5. **DISABILITA** questa opzione (toggle OFF)
6. Clicca **Save**

### **PASSO 2: Elimina l'Utente Non Verificato**

Vai su **Authentication** → **Users** e:
1. Cerca l'utente: `lucacorrao1996@gmail.com`
2. Clicca sui tre puntini (...) → **Delete user**
3. Conferma l'eliminazione

### **PASSO 3: Riavvia il Server e Registrati di Nuovo**

1. **Nel terminale**, ferma il server (Ctrl+C)
2. Riavvia il server:
   ```bash
   npm run dev
   ```
3. Vai su: http://localhost:3000/auth/signup
4. Registrati di nuovo con:
   - Email: lucacorrao1996@gmail.com
   - Password: (la tua password)
5. **NON ti chiederà più il codice di verifica!**
6. Sarai reindirizzato direttamente a `/onboarding`

---

## ⚠️ IMPORTANTE

Questa è una **soluzione temporanea** per sviluppo/test!

**Prima di andare in produzione**:
1. Configura il template email con `{{ .Token }}`
2. Riabilita "Enable email confirmations"
3. Configura un provider SMTP personalizzato (SendGrid, Mailgun, ecc.)

---

## 📋 Dopo Questo Fix

Potrai:
- ✅ Completare la registrazione immediatamente
- ✅ Accedere senza verificare l'email
- ✅ Testare l'onboarding e le funzionalità dell'app
- ✅ Configurare il resto dell'applicazione

Quando tutto funziona, potrai riabilitare la verifica email.

---

## 🔄 Per Riabilitare la Verifica Email (Dopo)

1. Configura il template email (vedi `CONFIGURA_OTP.md`)
2. Vai su **Authentication** → **Providers** → **Email**
3. Riabilita "Enable email confirmations"
4. Testa con una nuova registrazione

---

**Procedi con questi 3 passi e dimmi se riesci a registrarti!** 🚀

