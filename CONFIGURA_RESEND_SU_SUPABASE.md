# 🔧 CONFIGURA RESEND COME SMTP SU SUPABASE

## ❌ Problema Attuale

L'app **NON sta usando Resend** anche se hai la API key. L'app usa `supabase.auth.signUp()` che invia email attraverso il servizio **integrato di Supabase**, che ha la restrizione di inviare solo ai membri del team.

## ✅ Soluzione: Configura Resend come SMTP Personalizzato

Per usare Resend, devi configurarlo come provider SMTP nelle **impostazioni di Supabase**.

---

## 📋 PASSI DA SEGUIRE

### **PASSO 1: Ottieni le Credenziali SMTP da Resend**

1. Vai su: https://resend.com/api-keys
2. **Trova o crea** la tua API key
3. **Copia** la API key (es: `re_123abc...`)

### **PASSO 2: Vai su Supabase Dashboard**

1. Apri: https://supabase.com/dashboard
2. Seleziona il progetto: **nomadiqenuovo**

### **PASSO 3: Configura SMTP Settings**

1. **Vai su**: **Project Settings** (icona ingranaggio in basso a sinistra)
2. **Clicca su**: **Authentication** (nel menu Settings)
3. **Scorri fino a**: **SMTP Settings** (sezione in basso)
4. **Abilita**: "Enable Custom SMTP" (toggle ON)

### **PASSO 4: Inserisci le Credenziali Resend**

Inserisci questi valori:

```
Sender name: Nomadiqe
Sender email: noreply@nomadiqe.com

Host: smtp.resend.com
Port number: 465
Username: resend
Password: [LA TUA API KEY DI RESEND]

Enable SSL: YES (se usi porta 465)
```

**Oppure usa porta 587 con TLS**:
```
Port number: 587
Enable SSL: NO (usa TLS invece)
```

### **PASSO 5: Salva la Configurazione**

1. Clicca **"Save"** in fondo alla pagina
2. Aspetta la conferma "Settings saved successfully"

### **PASSO 6: Verifica il Dominio su Resend**

⚠️ **IMPORTANTE**: Il dominio `nomadiqe.com` deve essere **verificato** su Resend!

1. Vai su: https://resend.com/domains
2. Se `nomadiqe.com` non è presente:
   - Clicca "Add Domain"
   - Inserisci `nomadiqe.com`
   - Segui le istruzioni per aggiungere i record DNS
3. Se è presente ma non verificato:
   - Clicca sul dominio
   - Verifica i record DNS richiesti
   - Aspetta la verifica (può richiedere qualche minuto)

### **PASSO 7: Testa la Registrazione**

1. **Elimina l'utente esistente**:
   - Vai su Authentication → Users
   - Cerca `lucacorrao1996@gmail.com`
   - Delete user
2. **Vai su**: http://localhost:3000/auth/signup
3. **Registrati** con `lucacorrao1996@gmail.com`
4. **Ora riceverai l'email da Resend!** ✅

---

## 🔍 Come Verificare che Funzioni

### **1. Controlla i Log di Resend**

1. Vai su: https://resend.com/emails
2. Dovresti vedere l'email appena inviata
3. Status dovrebbe essere "Delivered"

### **2. Controlla l'Email**

1. Apri Gmail: `lucacorrao1996@gmail.com`
2. Cerca email da: `noreply@nomadiqe.com`
3. Dovresti vedere il codice OTP a 6 cifre

### **3. Controlla i Log di Supabase**

1. Vai su Supabase Dashboard → Logs → Auth Logs
2. Cerca eventi di "signup" o "send_email"
3. Verifica che non ci siano errori

---

## ⚠️ Problemi Comuni

### **Problema 1: "Domain not verified"**

**Soluzione**:
- Verifica il dominio `nomadiqe.com` su Resend
- Aggiungi i record DNS richiesti
- Aspetta la verifica (può richiedere fino a 24 ore)

### **Problema 2: "Invalid API key"**

**Soluzione**:
- Verifica che la API key sia corretta
- Assicurati di aver copiato TUTTA la key
- Rigenera una nuova API key su Resend se necessario

### **Problema 3: Email ancora non arriva**

**Soluzione**:
- Controlla cartella spam
- Verifica che il dominio sia verificato su Resend
- Controlla i log di Resend per vedere se l'email è stata inviata
- Verifica che il sender email sia `noreply@nomadiqe.com`

---

## 📊 Verifica Configurazione

Dopo aver configurato SMTP, verifica che:

- [ ] Custom SMTP è abilitato su Supabase
- [ ] Credenziali Resend inserite correttamente
- [ ] Dominio `nomadiqe.com` verificato su Resend
- [ ] Sender email: `noreply@nomadiqe.com`
- [ ] Utente esistente eliminato
- [ ] Nuova registrazione testata

---

## 🎯 Riepilogo

**Cosa sta succedendo ora**:
- ❌ L'app usa il servizio email integrato di Supabase
- ❌ Supabase invia solo ai membri del team
- ❌ `lucacorrao1996@gmail.com` non riceve l'email

**Cosa succederà dopo la configurazione**:
- ✅ L'app userà Resend tramite SMTP
- ✅ Resend invierà email a TUTTI gli indirizzi
- ✅ `lucacorrao1996@gmail.com` riceverà l'email con il codice OTP
- ✅ Email inviate da `noreply@nomadiqe.com`

---

**Segui i passi 1-7 e dimmi se funziona!** 📧






