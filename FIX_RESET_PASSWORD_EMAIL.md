# 🔧 Fix: Email Reset Password con Codice OTP

## ❌ Problemi Attuali

1. **Email contiene un LINK invece di un codice OTP**
2. **Gmail segnala l'email come "pericolosa" (phishing)**

## ✅ SOLUZIONE 1: Configura Template "Magic Link" per Mostrare Codice OTP

Il template "Magic Link" viene usato quando chiami `signInWithOtp`. Dobbiamo modificarlo per mostrare il codice OTP invece del link.

### Passo 1: Vai su Email Templates in Supabase

1. Vai su: https://supabase.com/dashboard
2. Seleziona il progetto **nomadiqenuovo**
3. Vai su **Authentication** → **Email Templates**
4. Cerca e seleziona il template **"Magic Link"** (o "OTP")

### Passo 2: Modifica il Template

**Sostituisci tutto il contenuto** del template con questo:

```html
<h2>Reimposta la tua password - Nomadiqe</h2>

<p>Ciao!</p>

<p>Hai richiesto di reimpostare la password. Il tuo codice di verifica a 6 cifre è:</p>

<div style="text-align: center; margin: 30px 0;">
  <h1 style="font-size: 36px; letter-spacing: 12px; font-weight: bold; color: #2563eb; margin: 20px 0;">
    {{ .Token }}
  </h1>
</div>

<p>Inserisci questo codice nella pagina di reset password per continuare.</p>

<p><strong>Il codice scade tra 1 ora.</strong></p>

<p>Se non hai richiesto questo codice, ignora questa email. La tua password rimarrà invariata.</p>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

<p style="color: #6b7280; font-size: 12px;">
  © 2025 Nomadiqe. Tutti i diritti riservati.
</p>
```

### Passo 3: Salva il Template

1. Clicca su **Save** o **Update**
2. Il template viene applicato immediatamente

---

## ✅ SOLUZIONE 2: Risolvere l'Avviso Phishing di Gmail

Gmail segnala l'email come sospetta perché mancano i record DNS di sicurezza. Devi configurare:

### 1. Verifica Dominio su Resend

1. Vai su: https://resend.com/domains
2. Controlla se `nomadiqe.com` è **verificato** ✅
3. Se NON è verificato:
   - Clicca sul dominio
   - Aggiungi i record DNS richiesti (SPF, DKIM, DMARC)
   - Aspetta la verifica (può richiedere fino a 24 ore)

### 2. Verifica Configurazione SMTP su Supabase

1. Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/settings/auth
2. Scorri fino a **SMTP Settings**
3. Verifica che:
   - ✅ **Enable Custom SMTP**: ON
   - ✅ **Sender email**: `noreply@nomadiqe.com` (DEVE essere dal dominio verificato)
   - ✅ **SMTP Host**: `smtp.resend.com`
   - ✅ **SMTP Port**: `587`
   - ✅ **SMTP User**: `resend`
   - ✅ **SMTP Password**: (la tua API key di Resend)

### 3. Record DNS Richiesti

Se usi Resend, aggiungi questi record DNS per il tuo dominio:

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Record:**
(Resend ti fornisce questo quando aggiungi il dominio)

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@nomadiqe.com
```

---

## ✅ SOLUZIONE 3: Test Immediato (Temporaneo)

Se il dominio non è ancora verificato, puoi usare il dominio di test di Resend:

1. Su Supabase SMTP Settings:
   - **Sender email**: `onboarding@resend.dev` (dominio di test verificato)
   - **Sender name**: `Nomadiqe`

2. L'email arriverà da `@resend.dev` invece di `@nomadiqe.com`, ma funzionerà immediatamente senza avvisi di phishing.

---

## 📋 Dopo le Modifiche

1. **Testa il reset password**:
   - Vai su `/auth/reset-password`
   - Inserisci la tua email
   - Dovresti ricevere un email con il **codice OTP a 6 cifre** (non più un link)

2. **Verifica che non ci siano più avvisi di phishing**:
   - Controlla la cartella inbox (non spam)
   - Non dovrebbe esserci il banner rosso "This message seems dangerous"

---

## 🔍 Se Continui ad Avere Problemi

### Problema: Ricevi ancora un link invece del codice
- **Causa**: Template non salvato correttamente o cache
- **Soluzione**: 
  1. Verifica che il template contenga `{{ .Token }}` (non `{{ .ConfirmationURL }}`)
  2. Attendi 1-2 minuti dopo il salvataggio
  3. Prova di nuovo

### Problema: Gmail continua a segnalare come phishing
- **Causa**: Dominio non verificato o record DNS mancanti
- **Soluzione**:
  1. Verifica che il dominio sia "Verified" su Resend
  2. Verifica che tutti i record DNS siano configurati correttamente
  3. Aspetta fino a 24 ore per la propagazione DNS
  4. Usa temporaneamente `onboarding@resend.dev` per test

---

## ✅ Checklist Finale

- [ ] Template "Magic Link" modificato con `{{ .Token }}`
- [ ] Template salvato correttamente
- [ ] Dominio verificato su Resend (o uso dominio di test)
- [ ] SMTP configurato su Supabase
- [ ] Record DNS aggiunti (SPF, DKIM, DMARC)
- [ ] Testato invio email reset password
- [ ] Email ricevuta con codice OTP (non link)
- [ ] Nessun avviso phishing da Gmail



