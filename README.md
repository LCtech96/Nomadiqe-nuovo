# Nomadiqe

**Slogan: "Soggiorni Più Equi, Connessioni Più Profonde"**

Una piattaforma di viaggio che connette Traveler, Host, Creator/Influencer e Manager.

## Caratteristiche

- 🏠 Marketplace di Alloggi
- 🤝 Sistema di Collaborazione Host-Influencer
- 📱 Social Travel Network
- 🛠️ Sistema di Servizi Manager
- 🎁 Sistema Punti/Rewards
- 🗺️ Mappe interattive con Leaflet

## Tecnologie

- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- NextAuth.js
- Leaflet/React Leaflet
- Vercel Blob

## Setup

1. Installa le dipendenze:
```bash
npm install
```

2. Configura le variabili d'ambiente (crea `.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@nomadiqe.com
```

3. Avvia il server di sviluppo:
```bash
npm run dev
```

## Deploy su Vercel

1. Collega il repository GitHub a Vercel
2. Configura le variabili d'ambiente in Vercel:
   - Vai su **Settings** > **Environment Variables**
   - Aggiungi tutte le variabili d'ambiente elencate sopra
   - **IMPORTANTE**: Assicurati di configurare `EMAIL_FROM=noreply@nomadiqe.com`

3. Configura il dominio Resend:
   - Vai su [Resend Dashboard](https://resend.com/domains)
   - Rimuovi il dominio `nomadiqe.com` dal vecchio progetto
   - Aggiungi il dominio `nomadiqe.com` al nuovo progetto
   - Verifica il dominio seguendo le istruzioni di Resend

4. Configura il dominio in Vercel:
   - Vai su **Settings** > **Domains**
   - Aggiungi il tuo dominio personalizzato (es. `nomadiqe.com`)
   - Configura i DNS records come indicato da Vercel

## Note Importanti

- Il file `.env` è escluso dal repository per sicurezza
- Le variabili d'ambiente devono essere configurate sia in locale che su Vercel
- Il dominio Resend deve essere verificato prima di poter inviare email

## Ruoli Utente

- **Traveler**: Cercano e prenotano alloggi
- **Host**: Pubblicano e gestiscono strutture
- **Creator/Influencer**: Creano contenuti e collaborano con host
- **Manager**: Offrono servizi (pulizie, gestione, etc.)

