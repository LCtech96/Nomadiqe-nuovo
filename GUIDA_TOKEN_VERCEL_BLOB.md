# 🔑 Guida: Ottenere e Configurare il Token Vercel Blob

## Problema
L'errore che vedi:
```
Vercel Blob: No token found. Either configure the `BLOB_READ_WRITE_TOKEN` environment variable, or pass a `token` option to your calls.
```
indica che il token Vercel Blob non è configurato.

---

## ✅ SOLUZIONE: Ottenere il Token Vercel Blob

### Metodo 1: Da Vercel Dashboard (Consigliato)

1. **Accedi a Vercel Dashboard**
   - Vai su [vercel.com](https://vercel.com)
   - Accedi al tuo account

2. **Vai al tuo Progetto**
   - Seleziona il progetto `nomadiqe` (o il nome del tuo progetto)

3. **Accedi alle Impostazioni**
   - Clicca su **Settings** (Impostazioni) nel menu laterale

4. **Vai a Storage**
   - Nel menu a sinistra, clicca su **Storage** o **Blob**
   - Se non vedi questa opzione, potrebbe essere necessario abilitare Vercel Blob per il tuo progetto

5. **Crea un nuovo Store (se non esiste)**
   - Clicca su **Create Store** o **New Store**
   - Dai un nome al tuo store (es. `nomadiqe-blob`)
   - Seleziona la regione (es. `iad1` per Stati Uniti)

6. **Ottieni il Token**
   - Una volta creato lo store, vedrai le **Environment Variables**
   - Cerca `BLOB_READ_WRITE_TOKEN`
   - **Copia il valore del token** (inizia con `vercel_blob_rw_...`)

---

### Metodo 2: Creare il Token Manualmente

1. **Installa Vercel CLI** (se non l'hai già fatto):
   ```bash
   npm i -g vercel
   ```

2. **Accedi a Vercel**:
   ```bash
   vercel login
   ```

3. **Crea un nuovo Blob Store**:
   ```bash
   vercel blob store create nomadiqe-blob
   ```

4. **Ottieni il Token**:
   ```bash
   vercel env pull .env.local
   ```
   Questo comando scaricherà tutte le variabili d'ambiente, inclusa `BLOB_READ_WRITE_TOKEN`

---

## 🔧 Configurazione

### 1. In Locale (`.env.local`)

Crea o modifica il file `.env.local` nella root del progetto:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE**: 
- Questo file è già nel `.gitignore`, quindi non verrà committato
- NON condividere mai questo token pubblicamente

### 2. Su Vercel (Produzione)

1. Vai su **Vercel Dashboard** → Il tuo progetto → **Settings** → **Environment Variables**

2. Aggiungi una nuova variabile:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Il token che hai copiato (inizia con `vercel_blob_rw_...`)
   - **Environment**: Seleziona tutti gli ambienti (Production, Preview, Development)

3. Clicca **Save**

4. **IMPORTANTE**: Dopo aver aggiunto la variabile d'ambiente, devi fare un **nuovo deploy**:
   - Vai su **Deployments**
   - Clicca sui tre puntini (`...`) dell'ultimo deployment
   - Seleziona **Redeploy**
   - Oppure fai un nuovo commit e push

---

## 🧪 Verifica

Dopo aver configurato il token:

1. **Riavvia il server di sviluppo** (se stai testando in locale):
   ```bash
   npm run dev
   ```

2. **Prova a caricare un'immagine**:
   - Vai alla pagina di onboarding Host
   - Prova a caricare una foto profilo o una foto di struttura
   - Non dovresti più vedere l'errore

---

## 🚨 Alternative: Usare Supabase Storage

Se non vuoi usare Vercel Blob, puoi usare **Supabase Storage** (già incluso nel tuo setup):

1. Vai su **Supabase Dashboard** → Il tuo progetto → **Storage**
2. Crea un bucket chiamato `avatars` o `properties`
3. Modifica il codice per usare Supabase Storage invece di Vercel Blob

---

## ❓ Problemi Comuni

### "Token non valido"
- Assicurati di aver copiato l'intero token (di solito inizia con `vercel_blob_rw_`)
- Controlla che non ci siano spazi prima o dopo il token

### "Token non trovato dopo il deploy"
- Verifica che la variabile d'ambiente sia configurata su Vercel
- Assicurati di aver fatto un nuovo deploy dopo aver aggiunto la variabile
- Controlla che la variabile sia disponibile per tutti gli ambienti (Production, Preview, Development)

### "Errore 403 Forbidden"
- Verifica che il token abbia i permessi corretti (`read_write`)
- Controlla che lo store Blob esista e sia attivo

---

## 📚 Risorse

- [Documentazione Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- [Guida Vercel CLI](https://vercel.com/docs/cli)

---

**Hai bisogno di aiuto?** Controlla i log su Vercel Dashboard → Deployments → Logs per vedere eventuali errori dettagliati.




