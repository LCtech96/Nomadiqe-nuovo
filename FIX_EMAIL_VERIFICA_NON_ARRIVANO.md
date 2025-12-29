# 🔧 FIX: Email di Verifica Non Arrivano

## ❌ Problema
Non ricevi più le email con i codici di verifica dopo la registrazione.

## ✅ Soluzioni (in ordine di priorità)

---

## 🔍 DIAGNOSI RAPIDA

### 1. Controlla la Console del Browser
1. Apri gli **Strumenti per sviluppatori** (F12)
2. Vai alla tab **Console**
3. Cerca errori che contengono:
   - `Resend error`
   - `OTP error`
   - `SignUp error`
4. **Copia** gli errori e condividili per il debug

### 2. Controlla la Cartella Spam
- ✅ Controlla **spam/junk** nella tua email
- ✅ Controlla anche le **email bloccate** o **filtri**
- ✅ Cerca email da `noreply@nomadiqe.com` o `onboarding@resend.dev`

---

## ✅ SOLUZIONE 1: Verifica Configurazione SMTP su Supabase

### Passo 1: Vai alle Impostazioni SMTP
1. Apri: https://supabase.com/dashboard
2. Seleziona il progetto: **nomadiqenuovo**
3. Vai su: **Project Settings** (⚙️ in basso a sinistra)
4. Clicca su: **Authentication**
5. Scorri fino a: **SMTP Settings**

### Passo 2: Verifica la Configurazione
Assicurati che:
- ✅ **"Enable Custom SMTP"** sia **ON** (toggle attivo)
- ✅ **Host**: `smtp.resend.com`
- ✅ **Port**: `465` (con SSL) o `587` (con TLS)
- ✅ **Username**: `resend`
- ✅ **Password**: (deve contenere la tua API key di Resend - inizia con `re_`)
- ✅ **Sender email**: `noreply@nomadiqe.com` (o un dominio verificato)
- ✅ **Sender name**: `Nomadiqe`

### Passo 3: Se SMTP Non è Configurato
1. **Abilita** "Enable Custom SMTP"
2. **Inserisci** le credenziali Resend:
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: [LA TUA API KEY DI RESEND]
   Sender email: onboarding@resend.dev (per test)
   Sender name: Nomadiqe
   ```
3. **Salva** le impostazioni

---

## ✅ SOLUZIONE 2: Verifica Dominio su Resend

### Passo 1: Controlla i Domini Verificati
1. Vai su: https://resend.com/domains
2. Verifica se `nomadiqe.com` è presente e **verificato** ✅

### Passo 2: Se il Dominio Non è Verificato
**Opzione A - Usa Dominio di Test (IMMEDIATO)**
1. Nelle SMTP Settings di Supabase:
   - **Sender email**: `onboarding@resend.dev`
   - Questo dominio è già verificato da Resend
   - Funziona immediatamente per test

**Opzione B - Verifica il Tuo Dominio (PRODUZIONE)**
1. Su Resend, clicca "Add Domain"
2. Inserisci `nomadiqe.com`
3. Aggiungi i record DNS richiesti (DKIM, SPF, DMARC)
4. Aspetta la verifica (può richiedere alcune ore)

---

## ✅ SOLUZIONE 3: Verifica Template Email su Supabase

### Passo 1: Controlla il Template
1. Vai su: **Authentication** > **Email Templates**
2. Seleziona: **"Confirm signup"** o **"Confirmation"**
3. Verifica che il template contenga: `{{ .Token }}`

### Passo 2: Se il Template Non Mostra il Codice
Sostituisci il contenuto con:
```html
<h2>Conferma la tua registrazione</h2>

<p>Il tuo codice di verifica a 6 cifre è:</p>

<h1 style="font-size: 32px; letter-spacing: 8px; text-align: center; margin: 20px 0;">
  {{ .Token }}
</h1>

<p>Inserisci questo codice nella pagina di verifica per completare la registrazione.</p>

<p>Il codice scade tra 1 ora.</p>

<p>Se non hai richiesto questo codice, ignora questa email.</p>
```

---

## ✅ SOLUZIONE 4: Test Immediato

### Usa il Pulsante "Rinvia il Codice"
1. Vai alla pagina: `/auth/verify-email?email=TUO_EMAIL`
2. Clicca su **"Rinvia il codice"**
3. Controlla la console per errori
4. Controlla la tua email (anche spam)

### Se "Rinvia il Codice" Funziona
- ✅ Il problema era solo nel primo invio
- ✅ Il sistema funziona correttamente
- ✅ Puoi continuare a usare "Rinvia il codice" se necessario

---

## 🔍 DEBUG AVANZATO

### Controlla i Log di Supabase
1. Vai su: **Logs** > **Auth Logs**
2. Cerca errori relativi a:
   - `email_send_failed`
   - `smtp_error`
   - `resend_error`

### Controlla i Log di Resend
1. Vai su: https://resend.com/emails
2. Controlla se le email vengono inviate
3. Verifica lo stato (delivered, bounced, failed)

---

## ⚠️ PROBLEMI COMUNI

### Problema: "Email not sent"
**Causa**: SMTP non configurato o credenziali errate
**Soluzione**: Verifica SOLUZIONE 1

### Problema: Email va in spam
**Causa**: Dominio non verificato o mancanza di record DNS
**Soluzione**: Verifica SOLUZIONE 2

### Problema: Ricevo magic link invece di codice
**Causa**: Template email non configurato correttamente
**Soluzione**: Verifica SOLUZIONE 3

### Problema: Nessun errore ma email non arriva
**Causa**: Provider email blocca le email
**Soluzione**: 
- Controlla spam
- Prova con un'altra email (Gmail, Outlook)
- Verifica i filtri email

---

## 📞 SUPPORTO

Se nessuna soluzione funziona:
1. **Copia** gli errori dalla console del browser
2. **Copia** i log da Supabase (Auth Logs)
3. **Verifica** lo stato delle email su Resend
4. Condividi queste informazioni per il debug

---

## ✅ CHECKLIST RAPIDA

- [ ] SMTP abilitato su Supabase
- [ ] Credenziali Resend corrette
- [ ] Dominio verificato su Resend (o uso dominio di test)
- [ ] Template email contiene `{{ .Token }}`
- [ ] Controllato spam/junk
- [ ] Testato "Rinvia il codice"
- [ ] Verificato console browser per errori
- [ ] Controllato Auth Logs su Supabase



