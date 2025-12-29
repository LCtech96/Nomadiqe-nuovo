# ⚠️ Configurazione Token Vercel Blob

## Problema
`Vercel Blob: No token found`

## Soluzione Rapida

### 1. Nel file `.env.local` (NON `.env`)

Aggiungi questa variabile con il prefisso `NEXT_PUBLIC_`:

```bash
NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN=vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr
```

**IMPORTANTE**: 
- ✅ Usa `NEXT_PUBLIC_` all'inizio (necessario per il browser)
- ✅ Usa file `.env.local` (non `.env`)
- ✅ Riavvia il server dopo aver aggiunto la variabile

### 2. Su Vercel (Produzione)

Vai su Vercel Dashboard → Settings → Environment Variables:
- **Nome**: `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN`
- **Valore**: `vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr`

### 3. Riavvia il server

```bash
# Ferma il server (Ctrl+C)
# Riavvia
npm run dev
```

---

## Perché `NEXT_PUBLIC_`?

Le variabili d'ambiente senza `NEXT_PUBLIC_` sono disponibili solo lato server. Il caricamento delle immagini avviene lato client (browser), quindi serve `NEXT_PUBLIC_`.

---

**Dopo questa configurazione, ricarica la pagina e riprova!**






