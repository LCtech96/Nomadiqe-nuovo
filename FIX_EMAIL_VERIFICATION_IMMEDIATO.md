# 🚨 Fix Immediato: Non Ricevi il Codice di Verifica Email

## ⚡ Soluzione Rapida (5 minuti)

### **PASSO 1: Vai su Supabase Dashboard**

1. Apri: https://supabase.com/dashboard
2. Seleziona il progetto: **nomadiqenuovo**

### **PASSO 2: Verifica Template Email**

1. Vai su **Authentication** → **Email Templates**
2. Clicca su **"Confirm signup"** (o **"Confirmation"**)
3. **Verifica che il template contenga**:

```html
{{ .Token }}
```

Se NON vedi `{{ .Token }}`, sostituisci tutto il contenuto del template con questo:

```html
<h2>Conferma la tua registrazione su Nomadiqe</h2>

<p>Ciao!</p>

<p>Il tuo codice di verifica a 6 cifre è:</p>

<div style="text-align: center; margin: 30px 0;">
  <h1 style="font-size: 36px; letter-spacing: 12px; font-weight: bold; color: #2563eb; margin: 20px 0;">
    {{ .Token }}
  </h1>
</div>

<p>Inserisci questo codice nella pagina di verifica per completare la registrazione.</p>

<p><strong>Il codice scade tra 1 ora.</strong></p>

<p>Se non hai richiesto questo codice, ignora questa email.</p>
```

4. **Clicca "Save"** o "Update"

### **PASSO 3: Verifica Impostazioni Email**

1. Vai su **Authentication** → **Providers** → **Email**
2. **Controlla che**:
   - ✅ **"Enable email confirmations"** sia **ATTIVO**
   - ✅ **"Secure email change"** può essere attivo o disattivo (non importante ora)

### **PASSO 4: Controlla la Cartella Spam**

1. Apri la tua casella email
2. Cerca nella cartella **Spam/Junk**
3. Cerca email da:
   - `noreply@mail.app.supabase.io`
   - `noreply@supabase.io`
   - O da qualsiasi indirizzo Supabase

### **PASSO 5: Verifica i Log (Opzionale)**

1. Vai su **Logs** → **Auth Logs** in Supabase
2. Cerca errori relativi all'invio email
3. Verifica se l'email è stata inviata

---

## 🔧 Se Ancora Non Funziona

### **Soluzione A: Disabilita Temporaneamente la Verifica (SOLO sviluppo)**

⚠️ **ATTENZIONE**: NON farlo in produzione!

1. Vai su **Authentication** → **Providers** → **Email**
2. **Disabilita** "Enable email confirmations"
3. Ora puoi fare login senza verificare l'email

### **Soluzione B: Configura SMTP Personalizzato**

Per produzione, configura un provider email professionale:

1. Vai su **Project Settings** → **Auth** → **SMTP Settings**
2. Configura:
   - **Gmail SMTP** (per test)
   - **SendGrid** (per produzione)
   - **Mailgun** (per produzione)
   - O qualsiasi altro provider SMTP

### **Soluzione C: Usa Email Diversa**

Prova con un'altra email per verificare se il problema è specifico di un indirizzo.

---

## ✅ Checklist Rapida

Prima di procedere, verifica:

- [ ] Template email contiene `{{ .Token }}`
- [ ] Email confirmations è abilitato
- [ ] Controllata cartella spam
- [ ] Email valida (formato corretto: nome@dominio.com)
- [ ] Non hai fatto troppi tentativi (aspetta 60 secondi)

---

## 📧 Dove Cercare l'Email

1. **Cartella Inbox**
2. **Cartella Spam/Junk**
3. **Tutte le cartelle** (alcuni provider le nascondono)
4. **Filtri email** (controlla se ci sono filtri automatici)

---

## 🔍 Test Rapido

1. Vai su: http://localhost:3000/auth/signup (o https://nomadiqe.com/auth/signup)
2. Registra un nuovo account con un'email di test
3. Controlla l'email **immediatamente** (arriva in pochi secondi)
4. Se non arriva in 2-3 minuti, controlla:
   - Cartella spam
   - Log di Supabase
   - Template email

---

**Prova prima i passi 1-4, poi dimmi cosa vedi!** 📧

