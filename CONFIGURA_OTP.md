# Guida: Configurare OTP a 6 cifre per Email Verification

## Problema
Supabase di default invia un "Magic Link" invece di un codice OTP a 6 cifre per la verifica email.

## Soluzione: Modificare il Template Email in Supabase

### Passo 1: Vai su Email Templates
1. Apri il tuo progetto Supabase: https://supabase.com/dashboard
2. Vai su **Authentication** > **Email Templates** (o **Templates**)
3. Seleziona il template **"Confirm signup"** (o **"Confirmation"**)

### Passo 2: Modifica il Template
Sostituisci il contenuto del template con questo:

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

### Passo 3: Salva il Template
Clicca su **Save** o **Update** per salvare le modifiche.

### Passo 4: Testa la Registrazione
1. Vai su `http://localhost:3000/auth/signup`
2. Registra un nuovo account
3. Controlla la tua email - dovresti ricevere un codice a 6 cifre invece di un link

## Note Importanti

- Il codice `{{ .Token }}` è la variabile che contiene il codice OTP a 6 cifre
- Il template viene applicato immediatamente dopo il salvataggio
- Se non vedi il codice, controlla la cartella spam
- Il codice scade dopo 1 ora (configurabile in Authentication Settings)

## Alternative: Disabilitare Email Verification (Solo per Sviluppo)

Se vuoi saltare la verifica email durante lo sviluppo:

1. Vai su **Authentication** > **Providers** > **Email**
2. Disabilita **"Enable email confirmations"**
3. Gli utenti potranno fare login senza verificare l'email

⚠️ **Attenzione**: Non disabilitare la verifica email in produzione!

