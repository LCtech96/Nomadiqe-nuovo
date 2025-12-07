# 🔍 Dove Trovare SSL/TLS nelle SMTP Settings di Supabase

## 📍 Ubicazione Opzioni SSL/TLS

Nelle nuove versioni di Supabase, le opzioni SSL/TLS **potrebbero non essere visibili** perché:

1. **Configurazione Automatica**: Supabase rileva automaticamente SSL/TLS basandosi sulla porta:
   - Porta **587** = Usa automaticamente **TLS** (STARTTLS)
   - Porta **465** = Usa automaticamente **SSL** (SSL/TLS implicito)

2. **Opzioni Nascoste**: Potrebbero essere in un menu avanzato o sotto altri campi.

---

## 🔍 Come Verificare/Configurare

### Metodo 1: Controlla se ci sono opzioni avanzate

1. Nella pagina **SMTP Settings** di Supabase
2. Scorri fino in fondo alla sezione "SMTP provider settings"
3. Cerca:
   - "Advanced settings" (Impostazioni avanzate)
   - "Security" (Sicurezza)
   - Un pulsante "Show more" o "Advanced"
   - Checkbox per "Use SSL" o "Use TLS"

### Metodo 2: Usa la porta corretta (più semplice)

Se non trovi le opzioni SSL/TLS, **usa questa configurazione**:

**Per Resend con porta 587** (TLS automatico):
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: [tua API key]
```

**Oppure usa porta 465** (SSL automatico):
```
Host: smtp.resend.com
Port: 465
Username: resend
Password: [tua API key]
```

Supabase configurerà automaticamente SSL/TLS in base alla porta.

---

## ✅ Configurazione Consigliata per Resend

### Opzione A: Porta 587 (TLS - STARTTLS)
```
Host: smtp.resend.com
Port: 587
Username: resend
Password: [tua API key di Resend]
```
**SSL/TLS**: Configurato automaticamente come TLS (STARTTLS)

### Opzione B: Porta 465 (SSL - Implicito)
```
Host: smtp.resend.com
Port: 465
Username: resend
Password: [tua API key di Resend]
```
**SSL/TLS**: Configurato automaticamente come SSL

---

## 🎯 Cosa Fare Ora

Dato che hai già:
- ✅ Host: `smtp.resend.com`
- ✅ Port: `587`
- ✅ Username: `resend`
- ✅ Password: (API key)
- ✅ Sender email: `noreply@nomadiqe.com`
- ✅ Sender name: `Nomadiqe`

**NON ti preoccupare delle opzioni SSL/TLS** se non le vedi! 

Con porta **587**, Supabase usa automaticamente **TLS (STARTTLS)**, che è esattamente ciò che serve per Resend.

---

## 🧪 Test della Configurazione

1. **Salva le impostazioni** su Supabase
2. **Aspetta 1-2 minuti** per la propagazione
3. **Elimina utente esistente**:
   - https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/auth/users
   - Cerca `lucacorrao96@outlook.it` e elimina
4. **Registrati di nuovo**:
   - https://www.nomadiqe.com/auth/signup
   - Usa `lucacorrao96@outlook.it`
5. **Controlla Resend Dashboard**:
   - https://resend.com/emails
   - Dovresti vedere l'email con status "Delivered"

---

## ⚠️ Se Ancora Non Funziona

Se dopo aver salvato ancora non ricevi email:

1. **Verifica dominio su Resend**:
   - https://resend.com/domains
   - `nomadiqe.com` deve essere **"Verified"** (verde)

2. **Controlla email sender**:
   - Deve essere dal dominio verificato: `noreply@nomadiqe.com`
   - Non usare altri domini

3. **Controlla logs Resend**:
   - https://resend.com/emails
   - Cerca errori o status "Failed"

4. **Prova con porta 465**:
   - Cambia Port da `587` a `465`
   - Salva e riprova

---

**In sintesi: Se non vedi le opzioni SSL/TLS, non è un problema. Con porta 587, Supabase usa automaticamente TLS. Salva le impostazioni e testa!** ✅

