# 🔧 Soluzione: Non Ricevi il Codice di Verifica Email

## ❌ Problema

Non ricevi il codice OTP a 6 cifre via email durante la registrazione o il login.

## 🔍 Cause Possibili

1. **Template Email non configurato correttamente** - Supabase usa un template predefinito
2. **Email nella cartella spam** - Il filtro anti-spam potrebbe bloccare l'email
3. **Provider email non configurato** - Supabase usa un servizio email limitato di default
4. **Rate limiting** - Troppi tentativi in breve tempo
5. **Email non valida** - L'indirizzo email inserito potrebbe avere errori

## ✅ Soluzioni

### **SOLUZIONE 1: Verifica le Impostazioni Email in Supabase**

1. **Vai su Supabase Dashboard**:
   - https://supabase.com/dashboard
   - Seleziona il progetto **nomadiqenuovo**

2. **Controlla Email Templates**:
   - Vai su **Authentication** > **Email Templates**
   - Seleziona **"Confirm signup"** (o **"Confirmation"**)
   - Verifica che il template contenga `{{ .Token }}` per mostrare il codice OTP

3. **Verifica Provider Email**:
   - Vai su **Authentication** > **Providers** > **Email**
   - Controlla che **"Enable email confirmations"** sia attivo

### **SOLUZIONE 2: Configura il Template Email Corretto**

Se il template non mostra il codice OTP, sostituiscilo con questo:

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

**Importante**: Salva il template dopo le modifiche!

### **SOLUZIONE 3: Controlla la Cartella Spam**

1. Apri la tua casella email
2. Controlla la cartella **Spam/Junk**
3. Cerca email da **noreply@mail.app.supabase.io** o **noreply@supabase.io**
4. Se la trovi, segnalala come "Non spam"

### **SOLUZIONE 4: Usa un Provider Email Personalizzato (Produzione)**

Per produzione, configura un provider email professionale:

1. **Vai su Supabase Dashboard** → **Project Settings** → **Auth**
2. **Email Provider**: Configura SMTP personalizzato
   - Gmail SMTP
   - SendGrid
   - Mailgun
   - O qualsiasi altro provider SMTP

### **SOLUZIONE 5: Testa con Email Diversa**

Prova con un'altra email per verificare se il problema è specifico di un indirizzo.

### **SOLUZIONE 6: Verifica i Log di Supabase**

1. Vai su **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Cerca errori relativi all'invio email
3. Verifica che l'email sia stata inviata correttamente

## 🔧 Configurazione RAPIDA (Sviluppo/Test)

Per testare rapidamente senza configurare SMTP:

1. **Disabilita temporaneamente la verifica email** (SOLO per sviluppo):
   - Vai su **Authentication** > **Providers** > **Email**
   - Disabilita **"Enable email confirmations"**
   - ⚠️ **NON farlo in produzione!**

2. **O usa il pannello di debug di Supabase**:
   - Vai su **Authentication** > **Users**
   - Cerca il tuo utente
   - Puoi vedere il codice OTP nei log (per sviluppo)

## 📋 Checklist

- [ ] Template email contiene `{{ .Token }}`
- [ ] Email confirmations è abilitato
- [ ] Controllata cartella spam
- [ ] Email valida (formato corretto)
- [ ] Non hai superato il rate limit (aspetta 60 secondi tra tentativi)
- [ ] Verificati i log di Supabase per errori

## 🚨 Se Nulla Funziona

1. **Controlla i log di Supabase** per vedere se l'email viene inviata
2. **Contatta il supporto Supabase** se il problema persiste
3. **Configura un provider SMTP personalizzato** per produzione

---

**Prova prima a verificare il template email e la cartella spam!** 📧

