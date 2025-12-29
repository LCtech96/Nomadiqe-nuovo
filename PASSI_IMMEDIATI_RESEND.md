# ⚡ PASSI IMMEDIATI - Configura Resend (5 minuti)

## 🎯 Obiettivo

Configurare Resend come provider SMTP su Supabase così riceverai le email.

---

## 📋 CHECKLIST RAPIDA

### ✅ **PASSO 1: Vai su Supabase Settings**

1. Apri: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/settings/auth
2. (Questo link ti porta DIRETTAMENTE alle impostazioni Auth)

### ✅ **PASSO 2: Scorri fino a "SMTP Settings"**

1. Scorri la pagina fino in fondo
2. Trova la sezione **"SMTP Settings"**
3. **Abilita**: "Enable Custom SMTP" (toggle ON)

### ✅ **PASSO 3: Inserisci Credenziali Resend**

Copia e incolla questi valori:

```
Sender name: Nomadiqe
Sender email: noreply@nomadiqe.com

Host: smtp.resend.com
Port number: 465
Username: resend
Password: [INCOLLA QUI LA TUA API KEY DI RESEND]

Enable SSL: YES
```

### ✅ **PASSO 4: Salva**

1. Clicca **"Save"** in fondo
2. Aspetta la conferma "Settings saved successfully"

### ✅ **PASSO 5: Verifica Dominio su Resend**

1. Vai su: https://resend.com/domains
2. **Controlla che `nomadiqe.com` sia presente e VERIFICATO**
3. Se non è verificato:
   - Clicca sul dominio
   - Aggiungi i record DNS richiesti
   - Aspetta la verifica

### ✅ **PASSO 6: Elimina Utente Esistente**

1. Torna su Supabase: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/auth/users
2. Cerca: `lucacorrao1996@gmail.com`
3. Clicca tre puntini → **"Delete user"**
4. Conferma

### ✅ **PASSO 7: Registrati di Nuovo**

1. Vai su: http://localhost:3000/auth/signup
2. Registrati con `lucacorrao1996@gmail.com`
3. **Ora riceverai l'email da Resend!** ✅

---

## 🔍 Come Verificare che Funziona

### **Metodo 1: Controlla Resend Dashboard**

1. Vai su: https://resend.com/emails
2. Dovresti vedere la nuova email inviata
3. Status: "Delivered"

### **Metodo 2: Controlla Gmail**

1. Apri Gmail
2. Cerca email da: `noreply@nomadiqe.com`
3. Controlla anche la cartella spam

---

## ⚠️ Se Non Funziona

### **Errore: "Domain not verified"**

**Causa**: Il dominio `nomadiqe.com` non è verificato su Resend.

**Soluzione**:
1. Vai su https://resend.com/domains
2. Verifica il dominio seguendo le istruzioni
3. Aspetta che il dominio sia verificato (può richiedere ore)

### **Errore: "Invalid credentials"**

**Causa**: API key di Resend non corretta.

**Soluzione**:
1. Vai su https://resend.com/api-keys
2. Copia la API key completa
3. Incollala di nuovo nelle SMTP Settings di Supabase

### **Email ancora non arriva**

**Causa**: Configurazione SMTP non salvata o dominio non verificato.

**Soluzione**:
1. Verifica che "Enable Custom SMTP" sia ON
2. Verifica che il dominio sia verificato su Resend
3. Controlla i log su Resend Dashboard

---

## 🚨 ALTERNATIVA VELOCE (Se Resend non funziona)

Se il dominio non è verificato o hai problemi con Resend:

**Disabilita temporaneamente la verifica email**:
1. Authentication → Providers → Email
2. DISABILITA: "Enable email confirmations"
3. Elimina utente esistente
4. Registrati di nuovo (non chiederà il codice)

Potrai configurare Resend correttamente dopo.

---

## 📞 Link Utili

- Supabase Auth Settings: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/settings/auth
- Supabase Users: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/auth/users
- Resend Dashboard: https://resend.com/emails
- Resend Domains: https://resend.com/domains
- Resend API Keys: https://resend.com/api-keys

---

**Segui i passi 1-7 in ordine!** 🚀





