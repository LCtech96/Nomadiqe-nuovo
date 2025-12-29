# 🚀 Deploy Immediato - Istruzioni Rapide

## ✅ Pronto per il Deploy!

Il progetto è configurato e pronto per il deploy su Vercel.

---

## 🎯 Deploy Rapido (3 Passi)

### **PASSO 1: Commit e Push**

```bash
cd "c:\Users\luca\Desktop\repo\Nomadiqe nuovo"
git add .
git commit -m "Deploy: Profilo per tutti, sistema referral, fix guida interattiva"
git push origin main
```

### **PASSO 2: Deploy su Vercel**

**Opzione A - Dashboard Vercel (Consigliata)**:
1. Vai su: https://vercel.com/new
2. Importa il repository GitHub `Nomadiqe nuovo`
3. Vercel rileverà automaticamente:
   - ✅ Framework: Next.js
   - ✅ Package Manager: pnpm (da `pnpm-lock.yaml`)
   - ✅ Build Command: `pnpm run build` (da `vercel.json`)

**Opzione B - CLI Vercel**:
```bash
pnpm add -g vercel
vercel login
vercel --prod
```

### **PASSO 3: Configura Environment Variables**

Dopo il primo deploy, vai su **Settings** → **Environment Variables** e aggiungi:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://umodgqcplvwmhfagihhu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[LA_TUA_ANON_KEY]

# NextAuth (aggiorna dopo il primo deploy con l'URL Vercel)
NEXTAUTH_URL=https://[IL_TUO_DOMINIO].vercel.app
NEXTAUTH_SECRET=[GENERA_UNA_CHIAVE_SECRETA_RANDOM]

# Vercel Blob
NEW_BLOB_READ_WRITE_TOKEN=[IL_TUO_TOKEN]
NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN=[IL_TUO_TOKEN]
BLOB_READ_WRITE_TOKEN=[IL_TUO_TOKEN]

# Resend (opzionale)
RESEND_API_KEY=[LA_TUA_RESEND_API_KEY]
EMAIL_FROM=noreply@nomadiqe.com
```

**IMPORTANTE**: 
- Seleziona **Production, Preview, Development** per tutte le variabili
- Dopo il primo deploy, copia l'URL Vercel e aggiorna `NEXTAUTH_URL`
- Riavvia il deploy dopo aver aggiornato `NEXTAUTH_URL`

---

## 📋 File di Configurazione Creati

✅ **`vercel.json`** - Configurazione per usare pnpm
✅ **`ISTRUZIONI_DEPLOY_VERCEL.md`** - Guida completa dettagliata

---

## ⚡ Quick Deploy (Se Vercel è già collegato)

Se hai già collegato il repository a Vercel, basta fare:

```bash
git add .
git commit -m "Deploy ready"
git push origin main
```

Vercel deployerà automaticamente! 🚀

---

## 🔍 Verifica Post-Deploy

1. **Test Registrazione**: `/auth/signup`
2. **Test Verifica Email**: Controlla che arrivi l'email
3. **Test Guida**: `/guide` deve caricare correttamente
4. **Test Profilo**: `/profile` deve funzionare per tutti i ruoli
5. **Test Follow**: Prova a seguire un utente

---

**Tutto pronto! Buon deploy! 🎉**



