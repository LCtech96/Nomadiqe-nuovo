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
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

3. Avvia il server di sviluppo:
```bash
npm run dev
```

## Ruoli Utente

- **Traveler**: Cercano e prenotano alloggi
- **Host**: Pubblicano e gestiscono strutture
- **Creator/Influencer**: Creano contenuti e collaborano con host
- **Manager**: Offrono servizi (pulizie, gestione, etc.)

