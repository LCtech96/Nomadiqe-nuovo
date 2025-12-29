# 📝 Guida: Creare il File .env.local

## ⚠️ Problema Attuale

L'errore "Token Vercel Blob non configurato" appare perché il file `.env.local` non esiste o non contiene le variabili corrette.

## ✅ Soluzione: Creare .env.local

### Passo 1: Crea il File

1. Nella **root del progetto** (stessa cartella di `package.json`)
2. Crea un nuovo file chiamato esattamente: **`.env.local`**
   - In Windows: Puoi crearlo con Notepad o qualsiasi editor di testo
   - In VS Code: Click destro → New File → nome `.env.local`

### Passo 2: Copia e Incolla questo Contenuto

Apri il file `.env.local` e incolla questo contenuto completo:

```env
# ============================================
# Supabase Configuration
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://umodgqcplvwmhfagihhu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtb2RncWNwbHZ3bWhmYWdpaGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTc2MjEsImV4cCI6MjA0ODk5MzYyMX0.SOSTITUISCI_CON_LA_TUA_CHIAVE_REALE

# ============================================
# NextAuth Configuration
# ============================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=genera-una-chiave-segreta-random-qui

# ============================================
# Google OAuth (Opzionale)
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id-if-needed
GOOGLE_CLIENT_SECRET=your-google-client-secret-if-needed

# ============================================
# Vercel Blob Storage
# ============================================
NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN=vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr

# ============================================
# NOTA IMPORTANTE
# ============================================
# - Le variabili con NEXT_PUBLIC_ sono accessibili nel browser
# - Dopo aver modificato questo file, RIAVVIA il server (Ctrl+C e npm run dev)
# ============================================
```

### Passo 3: Completa i Valori Mancanti

Devi sostituire questi valori segnaposto:

1. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - Vai su [Supabase Dashboard](https://supabase.com/dashboard)
   - Seleziona il tuo progetto
   - Settings → API
   - Copia la **anon/public key**
   - Sostituisci `SOSTITUISCI_CON_LA_TUA_CHIAVE_REALE` con la chiave reale

2. **`NEXTAUTH_SECRET`**
   - Genera una chiave segreta random (puoi usare: `openssl rand -base64 32`)
   - Oppure usa questo generatore online: https://generate-secret.vercel.app/32
   - Sostituisci `genera-una-chiave-segreta-random-qui`

3. **`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`** (Opzionale)
   - Solo se usi Google OAuth per il login
   - Se non li usi, puoi lasciarli così o rimuoverli

### Passo 4: ✅ Token Vercel Blob

Il token Vercel Blob è **già configurato correttamente**:
```
NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN=vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr
```

**NON modificare questa riga!** È già corretta.

### Passo 5: Riavvia il Server

1. **Ferma il server** (se è in esecuzione):
   - Premi `Ctrl+C` nel terminale

2. **Riavvia il server**:
   ```bash
   npm run dev
   ```

3. **Ricarica la pagina** nel browser (F5 o Ctrl+R)

## 🔍 Verifica che Funzioni

Dopo aver riavviato il server:

1. Apri il browser su `http://localhost:3000/profile`
2. Prova a caricare un'immagine del profilo
3. L'errore "Token Vercel Blob non configurato" **non dovrebbe più apparire**

## 📍 Posizione del File

Il file `.env.local` deve essere esattamente qui:

```
Nomadiqe nuovo/
├── .env.local          ← QUI!
├── package.json
├── next.config.js
├── app/
├── components/
└── ...
```

## ⚠️ Importante

- **Non committare** `.env.local` su Git (dovrebbe essere già in `.gitignore`)
- Il file `.env.local` funziona solo in **locale** (sul tuo computer)
- Per la **produzione su Vercel**, le variabili vanno configurate nel dashboard Vercel

## 🚀 Per Produzione (Vercel)

Su Vercel, devi configurare queste variabili:

1. Vai su Vercel Dashboard → Il tuo progetto → Settings → Environment Variables
2. Assicurati che esistano queste variabili:
   - `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN` (o `NEW_BLOB_READ_WRITE_TOKEN` - il codice supporta entrambi)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (per produzione: `https://www.nomadiqe.com`)

---

**Dopo aver completato questi passaggi, riavvia il server e riprova!** 🎉





