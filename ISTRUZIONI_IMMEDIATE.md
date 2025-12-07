# 🚨 ISTRUZIONI IMMEDIATE - Cosa Fare Adesso

## ⚡ Problema Attuale

Non ricevi il codice di verifica email → non puoi completare la registrazione.

## ✅ Soluzione Veloce (5 minuti)

### **Opzione 1: Disabilita Verifica Email (Più Veloce)** ⚡

Questa soluzione ti fa procedere IMMEDIATAMENTE:

1. **Vai su Supabase**: https://supabase.com/dashboard
2. **Seleziona progetto**: nomadiqenuovo
3. **Vai su**: Authentication → Providers → Email
4. **DISABILITA**: "Enable email confirmations" (toggle OFF)
5. **Salva**
6. **Elimina utente esistente**:
   - Vai su Authentication → Users
   - Cerca `lucacorrao1996@gmail.com`
   - Elimina l'utente
7. **Riavvia il server**:
   ```bash
   # Nel terminale
   Ctrl+C
   npm run dev
   ```
8. **Registrati di nuovo**: http://localhost:3000/auth/signup
9. **Procedi senza codice**: Sarai reindirizzato direttamente a `/onboarding`

### **Opzione 2: Controlla Spam e Configura Template** 📧

Se vuoi mantenere la verifica email:

1. **Controlla cartella SPAM** nella tua email
2. **Vai su Supabase**: https://supabase.com/dashboard
3. **Vai su**: Authentication → Email Templates → "Confirm signup"
4. **Verifica che contenga**:
   ```html
   {{ .Token }}
   ```
5. Se non c'è, sostituisci con il template completo (vedi sotto)
6. **Salva** il template
7. **Clicca su** "Rinvia il codice" nella pagina di verifica

---

## 📧 Template Email Completo

Se scegli l'Opzione 2, usa questo template:

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

<hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

<p style="color: #6b7280; font-size: 12px;">
  © 2025 Nomadiqe. Tutti i diritti riservati.
</p>
```

---

## 🎯 Consiglio

**Usa l'Opzione 1 per ora** (disabilita verifica email):
- ✅ Soluzione IMMEDIATA (5 minuti)
- ✅ Puoi testare l'app subito
- ✅ Puoi riabilitare la verifica email dopo

**Usa l'Opzione 2 dopo** (quando tutto funziona):
- Quando l'app funziona
- Prima di andare in produzione
- Configura SMTP personalizzato per produzione

---

## 📋 Checklist Rapida

**Cosa devi fare SUBITO**:

1. [ ] Vai su Supabase Dashboard
2. [ ] Disabilita "Enable email confirmations"
3. [ ] Elimina utente `lucacorrao1996@gmail.com`
4. [ ] Riavvia server (`Ctrl+C` e `npm run dev`)
5. [ ] Registrati di nuovo
6. [ ] Procedi con l'onboarding

**Cosa fare DOPO** (quando tutto funziona):

1. [ ] Configura template email con `{{ .Token }}`
2. [ ] Riabilita "Enable email confirmations"
3. [ ] Testa con una nuova email
4. [ ] Configura SMTP personalizzato per produzione

---

## 🔧 Altri File Creati per Te

- ✅ `SOLUZIONE_EMAIL_VERIFICATION.md` - Guida completa
- ✅ `FIX_EMAIL_VERIFICATION_IMMEDIATO.md` - Soluzione passo-passo
- ✅ `DISABILITA_VERIFICA_EMAIL_TEMPORANEA.md` - Questo file
- ✅ `CONFIGURA_OTP.md` - Come configurare il template email

---

**Procedi con l'Opzione 1 (disabilita verifica email) e dimmi se funziona!** 🚀

