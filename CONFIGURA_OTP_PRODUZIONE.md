# 🚀 Configurazione OTP per Produzione - nomadiqe.com

## ⚠️ IMPORTANTE: Configura il Template Email in Supabase

Per ricevere **codici OTP a 6 cifre** invece di link, devi modificare il template email in Supabase.

### Passo 1: Accedi a Supabase Dashboard
1. Vai su https://supabase.com/dashboard
2. Seleziona il progetto **nomadiqenuovo** (umodgqcplvwmhfagihhu)

### Passo 2: Vai su Email Templates
1. Nel menu laterale, clicca su **Authentication**
2. Clicca su **Email Templates** (o **Templates**)
3. Seleziona il template **"Confirm signup"** (o **"Confirmation"**)

### Passo 3: Modifica il Template
**Sostituisci tutto il contenuto** del template con questo:

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

### Passo 4: Salva il Template
1. Clicca su **Save** o **Update**
2. Il template viene applicato immediatamente

### Passo 5: Verifica la Configurazione
1. Vai su **Authentication** > **URL Configuration**
2. Assicurati che **Site URL** sia: `https://nomadiqe.com`
3. Aggiungi **Redirect URLs**:
   - `https://nomadiqe.com/auth/verify-email`
   - `https://www.nomadiqe.com/auth/verify-email` (se usi www)

## ✅ Testa la Registrazione

1. Vai su https://nomadiqe.com/auth/signup
2. Registra un nuovo account
3. Controlla la tua email - dovresti ricevere un **codice a 6 cifre** invece di un link

## 🔧 Se Continui a Ricevere Link

Se dopo aver modificato il template ricevi ancora link:

1. **Verifica che il template sia salvato correttamente**
2. **Controlla che `{{ .Token }}` sia presente nel template** (non `{{ .ConfirmationURL }}`)
3. **Attendi 1-2 minuti** dopo il salvataggio per permettere a Supabase di aggiornare i template
4. **Prova a registrare un nuovo account** (non riutilizzare email già esistenti)

## 📧 Configurazione Resend (Opzionale)

Se vuoi usare Resend invece del servizio email di Supabase:

1. Vai su **Authentication** > **Settings**
2. Scorri fino a **SMTP Settings**
3. Configura:
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `465` (SSL) o `587` (TLS)
   - **SMTP User**: `resend`
   - **SMTP Password**: La tua API key di Resend
   - **Sender email**: `noreply@nomadiqe.com`

## 🎯 Note Importanti

- Il codice `{{ .Token }}` è la variabile che contiene il codice OTP a 6 cifre
- Il template viene applicato immediatamente dopo il salvataggio
- Il codice scade dopo 1 ora (configurabile in Authentication Settings)
- Assicurati che il dominio `nomadiqe.com` sia verificato in Resend se usi SMTP personalizzato

