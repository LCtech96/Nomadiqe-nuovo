# 🚀 Istruzioni Deploy su Vercel

## ✅ Pre-Deploy Checklist

### 1. Verifica Build Locale
```bash
pnpm run build
```
Assicurati che il build completi senza errori.

### 2. Commit e Push su Git
```bash
git add .
git commit -m "Pre-deploy: Fix profilo Instagram-style per tutti, aggiunto sistema referral, fix guida interattiva"
git push origin main
```

---

## 📋 Deploy su Vercel

### Opzione A: Deploy tramite Dashboard Vercel (Consigliata)

1. **Vai su**: https://vercel.com/dashboard
2. **Clicca su**: "Add New Project"
3. **Importa** il repository GitHub:
   - Seleziona il repository `Nomadiqe nuovo`
   - Clicca "Import"

4. **Configura il progetto**:
   - **Framework Preset**: Next.js (dovrebbe essere rilevato automaticamente)
   - **Root Directory**: `./` (root)
   - **Build Command**: `pnpm run build` (o lascia default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `pnpm install` (o lascia default)

5. **Configura le Environment Variables**:
   Clicca su "Environment Variables" e aggiungi:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://umodgqcplvwmhfagihhu.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[LA_TUA_ANON_KEY_DI_SUPABASE]
   
   # NextAuth
   NEXTAUTH_URL=https://[IL_TUO_DOMINIO_VERCEL].vercel.app
   NEXTAUTH_SECRET=[GENERA_UNA_CHIAVE_SECRETA_RANDOM]
   
   # Vercel Blob Storage
   NEW_BLOB_READ_WRITE_TOKEN=[IL_TUO_TOKEN_VERCEL_BLOB]
   NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN=[IL_TUO_TOKEN_VERCEL_BLOB]
   BLOB_READ_WRITE_TOKEN=[IL_TUO_TOKEN_VERCEL_BLOB]
   
   # Resend (opzionale, se configurato)
   RESEND_API_KEY=[LA_TUA_RESEND_API_KEY]
   EMAIL_FROM=noreply@nomadiqe.com
   
   # Google OAuth (opzionale)
   GOOGLE_CLIENT_ID=[IL_TUO_GOOGLE_CLIENT_ID]
   GOOGLE_CLIENT_SECRET=[IL_TUO_GOOGLE_CLIENT_SECRET]
   ```

   **IMPORTANTE**: 
   - Seleziona **tutte e tre** le environment: Production, Preview, Development
   - Per `NEXTAUTH_URL`, usa l'URL che Vercel ti assegnerà dopo il primo deploy (es: `https://nomadiqe.vercel.app`)

6. **Deploy**:
   - Clicca "Deploy"
   - Aspetta che il deploy completi (circa 2-5 minuti)

7. **Dopo il primo deploy**:
   - Copia l'URL del progetto (es: `https://nomadiqe-xyz.vercel.app`)
   - Aggiorna `NEXTAUTH_URL` nelle Environment Variables con questo URL
   - Riavvia il deploy (Settings → Redeploy)

---

### Opzione B: Deploy tramite CLI Vercel

1. **Installa Vercel CLI** (se non l'hai già):
   ```bash
   pnpm add -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Segui le istruzioni:
   - Link to existing project? → No (prima volta) o Yes (se già esiste)
   - Project name: `nomadiqe` (o il nome che preferisci)
   - Directory: `./`
   - Override settings? → No

4. **Configura Environment Variables**:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add NEXTAUTH_URL
   vercel env add NEXTAUTH_SECRET
   vercel env add NEW_BLOB_READ_WRITE_TOKEN
   # ... aggiungi tutte le altre variabili
   ```

5. **Deploy in produzione**:
   ```bash
   vercel --prod
   ```

---

## 🔧 Configurazioni Post-Deploy

### 1. Aggiorna NEXTAUTH_URL su Supabase

1. Vai su: https://supabase.com/dashboard
2. Seleziona il progetto: **nomadiqenuovo**
3. Vai su: **Authentication** → **URL Configuration**
4. Aggiungi l'URL di produzione nelle **Redirect URLs**:
   ```
   https://[IL_TUO_DOMINIO].vercel.app/**
   https://[IL_TUO_DOMINIO].vercel.app/auth/callback
   ```

### 2. Configura SMTP su Supabase (se non già fatto)

1. Vai su: **Project Settings** → **Authentication** → **SMTP Settings**
2. Abilita "Enable Custom SMTP"
3. Configura Resend:
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: [LA_TUA_RESEND_API_KEY]
   Sender email: noreply@nomadiqe.com (o onboarding@resend.dev per test)
   Sender name: Nomadiqe
   ```

### 3. Verifica Template Email

1. Vai su: **Authentication** → **Email Templates**
2. Verifica che il template "Confirm signup" contenga:
   ```html
   {{ .Token }}
   ```
   Per mostrare il codice OTP a 6 cifre.

---

## ✅ Verifica Post-Deploy

### Test da eseguire:

1. **Registrazione**:
   - Vai su `https://[DOMINIO]/auth/signup`
   - Registra un nuovo utente
   - Verifica che l'email arrivi (controlla anche spam)

2. **Verifica Email**:
   - Inserisci il codice OTP
   - Verifica che reindirizzi a `/guide`

3. **Guida Interattiva**:
   - Verifica che la guida si carichi correttamente
   - Verifica che le task non siano pre-selezionate

4. **Profilo**:
   - Verifica che tutti i ruoli possano vedere il profilo Instagram-style
   - Verifica che il bottone "Condividi profilo" funzioni
   - Verifica che il bottone "Segui" funzioni nel profilo pubblico

5. **Sistema Referral**:
   - Verifica che il link referral funzioni
   - Testa la registrazione con codice referral

---

## 🔍 Troubleshooting

### Build Fallisce

**Errore**: "Module not found" o errori TypeScript
- **Soluzione**: Verifica che tutte le dipendenze siano in `package.json`
- Esegui `pnpm install` localmente e verifica che funzioni

**Errore**: "Environment variable not found"
- **Soluzione**: Verifica che tutte le variabili d'ambiente siano configurate su Vercel

### Email Non Arrivano

**Problema**: Email di verifica non arrivano
- **Soluzione**: 
  1. Verifica SMTP Settings su Supabase
  2. Verifica che il dominio Resend sia verificato
  3. Usa `onboarding@resend.dev` per test immediato

### Errori 404

**Problema**: Pagine non trovate
- **Soluzione**: Verifica che `next.config.js` sia configurato correttamente
- Verifica che le route siano corrette

---

## 📝 Note Importanti

- ✅ Il progetto usa **pnpm** come package manager
- ✅ Assicurati che Vercel usi `pnpm` (dovrebbe rilevarlo automaticamente da `pnpm-lock.yaml`)
- ✅ Dopo il deploy, aggiorna `NEXTAUTH_URL` con l'URL di produzione
- ✅ Le variabili `NEXT_PUBLIC_*` sono accessibili nel browser
- ✅ Le variabili senza `NEXT_PUBLIC_` sono solo server-side

---

## 🎯 Quick Deploy (Se hai già configurato Vercel)

```bash
# Assicurati di essere nella directory del progetto
cd "c:\Users\luca\Desktop\repo\Nomadiqe nuovo"

# Commit e push
git add .
git commit -m "Deploy: Fix profilo, referral, guida interattiva"
git push origin main

# Se Vercel è collegato a GitHub, il deploy partirà automaticamente
```

---

**Buon deploy! 🚀**

