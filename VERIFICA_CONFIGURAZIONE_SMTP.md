# 🔍 Verifica Configurazione SMTP Resend

## ✅ Checklist Configurazione

Controlla questi punti in ordine:

### 1. Verifica Dominio su Resend (CRITICO)

1. Vai su: https://resend.com/domains
2. Cerca `nomadiqe.com`
3. **VERIFICA LO STATO**:
   - ✅ **"Verified"** (verde) = Dominio verificato correttamente
   - ⚠️ **"Pending"** = Dominio in attesa di verifica (aggiungi record DNS)
   - ❌ **"Failed"** = Verifica fallita (controlla record DNS)

**Se NON è "Verified"**:
- Clicca sul dominio
- Aggiungi i record DNS richiesti (DKIM, SPF, DMARC)
- Aspetta che lo status diventi "Verified" (può richiedere fino a 24 ore)

---

### 2. Verifica Configurazione SMTP su Supabase

Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/settings/auth

Controlla che:
- ✅ **Enable Custom SMTP**: ON
- ✅ **Sender name**: `Nomadiqe`
- ✅ **Sender email**: `noreply@nomadiqe.com` (DEVE essere dal dominio verificato!)
- ✅ **SMTP Host**: `smtp.resend.com`
- ✅ **SMTP Port**: `587`
- ✅ **SMTP User**: `resend`
- ✅ **SMTP Password**: (la tua API key di Resend - inizia con `re_...`)
- ✅ **Enable SSL**: NO (per porta 587 usa TLS, non SSL)
- ✅ **Enable TLS**: YES (se c'è questa opzione)

**⚠️ IMPORTANTE**: 
- Per porta 587: **SSL = NO, TLS = YES**
- Per porta 465: **SSL = YES, TLS = NO**

---

### 3. Verifica Template Email

1. Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/auth/templates
2. Clicca su **"Confirm signup"** (o "Confirmation")
3. Verifica che contenga `{{ .Token }}` (non `{{ .ConfirmationURL }}`)

Template corretto:
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

---

### 4. Verifica Logs Resend

1. Vai su: https://resend.com/emails
2. Controlla se ci sono email inviate per `lucacorrao96@outlook.it`
3. Controlla lo **status**:
   - ✅ **"Delivered"** = Email inviata (controlla spam se non la vedi)
   - ⚠️ **"Bounced"** = Email non consegnata (indirizzo errato o dominio bloccato)
   - ❌ **"Failed"** = Errore nell'invio (controlla configurazione SMTP)

---

### 5. Test Invio Email

Dopo aver verificato tutto:

1. **Elimina utente esistente** (se presente):
   - Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/auth/users
   - Cerca `lucacorrao96@outlook.it`
   - Elimina se presente

2. **Prova registrazione**:
   - Vai su: https://www.nomadiqe.com/auth/signup
   - Registrati con `lucacorrao96@outlook.it`

3. **Controlla immediatamente**:
   - Dashboard Resend: https://resend.com/emails
   - Dovresti vedere una nuova email con status "Delivered"
   - Controlla inbox e spam

---

## 🚨 Problemi Comuni e Soluzioni

### Problema: Email non appare su Resend Dashboard

**Causa**: SMTP non configurato correttamente o non abilitato.

**Soluzione**:
1. Verifica che "Enable Custom SMTP" sia ON
2. Verifica che le credenziali siano corrette
3. Salva le impostazioni
4. Aspetta 1-2 minuti
5. Riprova registrazione

---

### Problema: Status "Failed" su Resend

**Causa**: Credenziali SMTP errate o dominio non verificato.

**Soluzione**:
1. Verifica che la API key di Resend sia corretta
2. Verifica che il dominio sia "Verified" su Resend
3. Verifica che l'email sender sia da dominio verificato (`noreply@nomadiqe.com`)

---

### Problema: Status "Delivered" ma email non arriva

**Causa**: Email nella spam o bloccata dal provider email.

**Soluzione**:
1. Controlla la cartella spam
2. Controlla la cartella "Promozioni" (Gmail)
3. Cerca email da: `noreply@nomadiqe.com`
4. Se non la trovi, il dominio potrebbe non essere verificato correttamente

---

### Problema: Dominio "Pending" su Resend

**Causa**: Record DNS non aggiunti correttamente.

**Soluzione**:
1. Vai su: https://resend.com/domains
2. Clicca su `nomadiqe.com`
3. Copia i record DNS richiesti
4. Aggiungili al tuo DNS provider (Vercel, Cloudflare, etc.)
5. Aspetta la verifica (può richiedere fino a 24 ore)

---

## 📋 Configurazione Finale Verificata

Se tutto è configurato correttamente:

```
Supabase SMTP Settings:
- Enable Custom SMTP: ✅ ON
- Sender email: noreply@nomadiqe.com
- Sender name: Nomadiqe
- Host: smtp.resend.com
- Port: 587
- User: resend
- Password: re_... (API key)
- SSL: NO
- TLS: YES (se disponibile)

Resend:
- Dominio nomadiqe.com: ✅ Verified (verde)
- API Key: ✅ Presente e attiva

Email Template:
- Contiene: {{ .Token }}
- Tipo: Confirm signup
```

---

## 🎯 Test Finale

Dopo aver verificato tutto:

1. Elimina utente: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/auth/users
2. Registrati: https://www.nomadiqe.com/auth/signup
3. Controlla Resend: https://resend.com/emails
4. Controlla email (inbox + spam)

Se vedi "Delivered" su Resend ma non ricevi l'email, è un problema di deliverability (spam, filtri, ecc.).

---

**Verifica questi punti e dimmi cosa trovi!** 🔍

