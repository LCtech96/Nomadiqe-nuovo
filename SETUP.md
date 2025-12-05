# Guida Setup Nomadiqe

## Prerequisiti

- Node.js 18+ e npm/yarn
- Account Supabase
- Account Google (per OAuth)
- Account Vercel (opzionale, per Blob storage)

## Setup Passo-Passo

### 1. Clona e installa dipendenze

```bash
npm install
```

### 2. Configura Supabase

1. Crea un nuovo progetto su [Supabase](https://supabase.com)
2. Vai su SQL Editor e esegui lo script in `supabase/schema.sql`
3. Copia l'URL del progetto e la chiave anon
4. Vai su Authentication > Providers e abilita Email provider

### 3. Configura variabili d'ambiente

Crea un file `.env.local` nella root del progetto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera_un_secret_casuale_qui

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Vercel Blob Storage (opzionale)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Resend API Configuration
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@nomadiqe.com
```

### 4. Configura Google OAuth

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuovo progetto o seleziona uno esistente
3. Vai su "Credentials" > "Create Credentials" > "OAuth client ID"
4. Seleziona "Web application"
5. Aggiungi `http://localhost:3000/api/auth/callback/google` come authorized redirect URI
6. Copia Client ID e Client Secret

### 5. Genera NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### 6. Avvia il server di sviluppo

```bash
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000) nel browser.

## Funzionalità Implementate

### ✅ Autenticazione
- Registrazione con email/password
- Login con Google OAuth
- Verifica email con codice a 6 cifre

### ✅ Onboarding Multi-Step
- Profilo base (nome, username)
- Selezione ruolo (Traveler, Host, Creator, Manager)
- Onboarding specifico per ruolo

### ✅ Marketplace Alloggi
- Ricerca alloggi con mappe interattive (Leaflet)
- Filtri avanzati
- Dettagli proprietà
- Sistema di prenotazione

### ✅ Social Network
- Feed con post di viaggio
- Like e commenti
- Condivisione contenuti
- Profili utente

### ✅ Dashboard per Ruolo
- **Traveler**: Gestione prenotazioni, punti
- **Host**: Gestione strutture, collaborazioni
- **Creator**: Gestione account social, collaborazioni
- **Manager**: Gestione servizi offerti

### ✅ Sistema Punti/Rewards
- Punti per azioni (sign up, onboarding, booking, post, check-in, review)
- Limiti giornalieri
- Storico punti

### ✅ Sistema Collaborazioni
- Host possono creare offerte per creator
- Creator possono vedere e accettare collaborazioni
- Tipi: Free Stay, Discounted Stay, Paid Collaboration

### ✅ Sistema Servizi Manager
- Manager possono offrire servizi
- Host possono richiedere servizi
- Gestione richieste e completamento

## Prossimi Passi

1. Implementare upload immagini con Vercel Blob
2. Aggiungere notifiche in tempo reale
3. Implementare sistema di recensioni completo
4. Aggiungere filtri avanzati nel marketplace
5. Implementare geocoding automatico per indirizzi
6. Aggiungere sistema di messaggistica
7. Implementare sistema di pagamenti

## Note

- Il sistema di punti ha limiti giornalieri per prevenire abusi
- Le mappe usano OpenStreetMap (gratuito, no API key necessaria)
- Il geocoding usa Nominatim API (gratuito, ma con rate limits)
- Per produzione, considera di usare un servizio di geocoding a pagamento

