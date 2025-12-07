# 🔧 FIX IMMEDIATO: Email di Verifica Non Arrivano

## ❌ Problema
Non ricevi il codice di verifica quando ti registri con `lucacorrao96@outlook.it`.

## 🎯 Soluzioni (in ordine di priorità)

---

## ✅ SOLUZIONE 1: Configura Resend come SMTP (CONSIGLIATA)

Questa è la soluzione definitiva che permetterà di inviare email a QUALSIASI indirizzo.

### Passo 1: Verifica che Resend sia configurato su Supabase

1. Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/settings/auth
2. Scorri fino alla sezione **"SMTP Settings"**
3. Verifica che:
   - ✅ **"Enable Custom SMTP"** sia **ON** (toggle attivo)
   - ✅ **Host**: `smtp.resend.com`
   - ✅ **Port**: `465` (o `587`)
   - ✅ **Username**: `resend`
   - ✅ **Password**: (deve contenere la tua API key di Resend)
   - ✅ **Sender email**: `noreply@nomadiqe.com` (o un dominio verificato)
   - ✅ **Sender name**: `Nomadiqe`

### Passo 2: Verifica il Dominio su Resend

⚠️ **CRITICO**: Il dominio nell'email sender DEVE essere verificato su Resend!

1. Vai su: https://resend.com/domains
2. Controlla se c'è il dominio `nomadiqe.com`
3. Se **NON è presente** o **non è verificato**:
   - Clicca "Add Domain"
   - Inserisci `nomadiqe.com`
   - Aggiungi i record DNS richiesti (DKIM, SPF, DMARC)
   - Aspetta la verifica (può richiedere alcune ore)

### Passo 3: Se il Dominio Non è Verificato (Soluzione Temporanea)

Se `nomadiqe.com` non è ancora verificato, usa un dominio di test di Resend:

1. Vai su: https://resend.com/domains
2. Usa il dominio di test di Resend: `resend.dev` o un dominio temporaneo
3. Nelle SMTP Settings di Supabase:
   - **Sender email**: `onboarding@resend.dev` (dominio di test di Resend)
   - **Sender name**: `Nomadiqe`

Questo permetterà di testare immediatamente, anche se l'email arriverà da `@resend.dev`.

---

## ✅ SOLUZIONE 2: Aggiungi Email al Team Supabase (Solo per Test)

Questa soluzione funziona SOLO per testare, non per produzione.

1. Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/settings/team
2. Clicca "Invite team member"
3. Inserisci: `lucacorrao96@outlook.it`
4. Assegna ruolo: "Developer" o "Viewer"
5. L'utente riceverà un invito email
6. Dopo aver accettato l'invito, potrà ricevere email di verifica

⚠️ **Limitazione**: Questa soluzione funziona SOLO per email aggiunte al team.

---

## ✅ SOLUZIONE 3: Disabilita Temporaneamente la Verifica Email

**Solo per test/sviluppo! NON usare in produzione!**

1. Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/auth/providers
2. Clicca su **"Email"**
3. **DISABILITA**: "Enable email confirmations"
4. Salva

Ora puoi registrarti senza bisogno di verificare l'email.

⚠️ **ATTENZIONE**: Riabilita la verifica email prima di andare in produzione!

---

## 🔍 Come Verificare se Resend Funziona

### Metodo 1: Dashboard Resend

1. Vai su: https://resend.com/emails
2. Dovresti vedere tutte le email inviate
3. Controlla lo status:
   - ✅ **"Delivered"** = Email inviata con successo
   - ⚠️ **"Bounced"** = Email non consegnata (indirizzo errato)
   - ❌ **"Failed"** = Errore nell'invio

### Metodo 2: Logs Supabase

1. Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/logs/edge-logs
2. Filtra per "auth"
3. Cerca errori relativi all'invio email

### Metodo 3: Console Browser

1. Apri la console del browser (F12)
2. Cerca errori quando clicchi "Registrati"
3. Controlla se ci sono errori tipo:
   - "Failed to send email"
   - "SMTP error"
   - "Domain not verified"

---

## 🚨 Problemi Comuni

### Problema: "Domain not verified"

**Causa**: Il dominio nell'email sender non è verificato su Resend.

**Soluzione**:
1. Usa un dominio di test di Resend (`@resend.dev`) temporaneamente
2. Oppure verifica `nomadiqe.com` su Resend aggiungendo i record DNS

### Problema: "Invalid credentials"

**Causa**: API key di Resend errata o non inserita.

**Soluzione**:
1. Vai su: https://resend.com/api-keys
2. Copia la API key completa
3. Incollala nel campo "Password" delle SMTP Settings di Supabase

### Problema: Email nella cartella spam

**Causa**: Email non autenticata o dominio non verificato.

**Soluzione**:
1. Verifica il dominio su Resend
2. Aggiungi i record DNS (SPF, DKIM, DMARC)
3. Controlla la cartella spam della casella email

---

## 📋 Checklist Finale

Prima di testare di nuovo:

- [ ] "Enable Custom SMTP" è ON su Supabase
- [ ] Credenziali Resend inserite correttamente
- [ ] Dominio sender verificato su Resend (o uso dominio di test)
- [ ] Template email contiene `{{ .Token }}` per il codice OTP
- [ ] Eliminato utente esistente (se necessario)
- [ ] Registrazione con nuova email

---

## 🎯 Test Immediato

Dopo aver configurato tutto:

1. **Elimina utente esistente** (se presente):
   - Vai su: https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/auth/users
   - Cerca `lucacorrao96@outlook.it`
   - Elimina se presente

2. **Registrati di nuovo**:
   - Vai su: https://www.nomadiqe.com/auth/signup
   - Inserisci: `lucacorrao96@outlook.it`
   - Clicca "Registrati"

3. **Controlla email**:
   - Inbox principale
   - Cartella spam
   - Dashboard Resend (https://resend.com/emails)

---

**Se ancora non funziona, prova SOLUZIONE 3 (disabilita verifica) per testare l'app, poi configura Resend correttamente.**

