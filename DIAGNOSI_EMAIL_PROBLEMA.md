# 🔍 Diagnosi: Email Non Arriva (Template Corretto)

## ✅ Verifica Completata

Il template email su Supabase è **CORRETTO** — contiene `{{ .Token }}` per mostrare il codice OTP.

## 🔍 Possibili Cause

Dato che il template è corretto, il problema è uno di questi:

### **Causa 1: Email finisce nello SPAM** (90% dei casi)

**Soluzione**:
1. Apri la tua casella email: `lucacorrao1996@gmail.com`
2. Vai nella cartella **Spam/Posta indesiderata**
3. Cerca email da:
   - `noreply@mail.app.supabase.io`
   - `noreply@supabase.io`
   - Qualsiasi email con oggetto "Conferma la tua registrazione"
4. Se la trovi:
   - Segnala come "Non spam"
   - Usa il codice OTP mostrato nell'email

### **Causa 2: Provider Email Gratuito di Supabase ha Limitazioni**

Supabase usa un provider email gratuito con limitazioni:
- Rate limiting aggressivo
- Alcune email provider (Gmail, Outlook) possono bloccarle
- Deliverability non garantita

**Soluzione**:
- Per ora: Disabilita verifica email (vedi sotto)
- Per produzione: Configura provider SMTP personalizzato

### **Causa 3: Rate Limiting**

Se hai fatto troppi tentativi:
- Supabase blocca l'invio per 60 secondi
- Aspetta 2-3 minuti prima di riprovare

### **Causa 4: Email non Valida o Esistente**

Se l'account `lucacorrao1996@gmail.com` esiste già ma non è verificato:
- Supabase potrebbe non reinviare l'email
- Elimina l'utente e riprova

---

## ⚡ Soluzione IMMEDIATA

Dato che il template è corretto ma l'email non arriva, ti consiglio di:

### **Opzione A: Disabilita Verifica Email (Veloce)** ⚡

1. Vai su Supabase: https://supabase.com/dashboard
2. Authentication → Providers → Email
3. **DISABILITA**: "Enable email confirmations"
4. Salva
5. **Elimina utente esistente**:
   - Authentication → Users
   - Cerca `lucacorrao1996@gmail.com`
   - Delete user
6. **Registrati di nuovo** (non chiederà il codice)

### **Opzione B: Usa Email Diversa** 📧

Prova con un'altra email per testare:
- Se con l'altra email funziona → problema specifico di Gmail
- Se non funziona nemmeno con l'altra → problema di provider Supabase

---

## 📋 Checklist di Verifica

Prima di procedere, controlla:

- [x] Template contiene `{{ .Token }}` ✅
- [ ] Email nella cartella spam
- [ ] Aspettato almeno 2-3 minuti
- [ ] Non fatto troppi tentativi (rate limiting)
- [ ] Utente eliminato e ricreato

---

## 🚀 Configurazione per Produzione

Quando l'app funziona, per la produzione configura:

1. **Provider SMTP Personalizzato**:
   - SendGrid (consigliato)
   - Mailgun
   - AWS SES
   - Gmail SMTP (solo per test)

2. **Supabase Dashboard** → **Project Settings** → **Auth** → **SMTP Settings**

3. **Inserisci credenziali SMTP**:
   - Host
   - Port
   - Username
   - Password

Questo risolverà definitivamente il problema di deliverability.

---

## 🎯 Cosa Fare ADESSO

1. **Controlla cartella SPAM** (2 minuti)
2. Se non trovi l'email → **Disabilita verifica email** (Opzione A)
3. Procedi con l'onboarding
4. Configura SMTP dopo

---

**Controlla prima lo spam, poi dimmi se vuoi disabilitare la verifica email!** 📧



