# 🔑 Configurazione Groq AI Assistant

## File da creare/modificare

### 1. File `.env` (Locale - Root del progetto)

Aggiungi questa riga al file `.env` nella root del progetto:

```env
GROQ_API_KEY=your_groq_api_key_here
```

**Percorso**: `C:\Users\luca\Desktop\repo\Nomadiqe nuovo\.env`

### 2. File `.env.local` (Locale - Root del progetto)

Aggiungi questa riga al file `.env.local` nella root del progetto:

```env
GROQ_API_KEY=your_groq_api_key_here
```

**Percorso**: `C:\Users\luca\Desktop\repo\Nomadiqe nuovo\.env.local`

### 3. Variabili d'ambiente su Vercel

1. Vai su https://vercel.com/dashboard
2. Seleziona il progetto **nomadiqe-nuovo**
3. Vai su **Settings** → **Environment Variables**
4. Aggiungi una nuova variabile:
   - **Name**: `GROQ_API_KEY`
   - **Value**: `[la tua chiave API Groq]` (sostituisci con la chiave reale, non committare mai la chiave nel repository!)
   - **Environments**: Seleziona tutti (Production, Preview, Development)
5. Clicca **Save**
6. Vai su **Deployments** → Seleziona l'ultimo deployment → **...** → **Redeploy**

## ✅ Verifica

Dopo aver configurato, riavvia il server di sviluppo locale:

```bash
# Ferma il server (Ctrl+C)
# Poi riavvia
pnpm dev
```

Il sistema AI Assistant invierà automaticamente:
- Messaggi di benvenuto quando un utente completa l'onboarding
- Messaggi di congratulazioni quando compiono azioni
- Suggerimenti su cosa fare dopo

