# 🔑 Come Trovare e Aggiungere SUPABASE_SERVICE_ROLE_KEY

## 📍 PASSO 1: Trova la Service Role Key su Supabase (2 minuti)

### 1.1 Apri Supabase Dashboard

1. **Apri il browser** e vai su: https://supabase.com/dashboard
2. **Accedi** al tuo account (se non sei già loggato)
3. **Seleziona** il progetto **"umodgqcplvwmhfagihhu"** (o il nome del tuo progetto)

### 1.2 Vai alle Impostazioni API

1. **Nel menu laterale sinistro**, clicca su **"Settings"** (icona ingranaggio)
2. **Clicca** su **"API"** (sotto "Project Settings")

### 1.3 Trova la Service Role Key

1. **Scorri** la pagina fino alla sezione **"Project API keys"**
2. **Cerca** la sezione **"service_role"** (⚠️ **secret**)
3. **Vedrai** due chiavi:
   - **anon** `public` - Questa è `NEXT_PUBLIC_SUPABASE_ANON_KEY` (già presente)
   - **service_role** `secret` - Questa è `SUPABASE_SERVICE_ROLE_KEY` (quella che ti serve!)

4. **Clicca** sull'icona **👁️ (occhio)** accanto a "service_role" per rivelare la chiave
5. **Clicca** sull'icona **📋 (copia)** per copiare la chiave

⚠️ **ATTENZIONE**: La Service Role Key è **SEGRETA** e ha privilegi elevati. Non condividerla pubblicamente!

---

## 📍 PASSO 2: Aggiungi la Chiave su Vercel (2 minuti)

### 2.1 Apri Vercel Dashboard

1. **Apri una nuova scheda** del browser
2. Vai su: https://vercel.com/dashboard
3. **Seleziona** il progetto **"nomadiqe-nuovo"**

### 2.2 Vai alle Environment Variables

1. **Clicca** su **"Settings"** (menu in alto)
2. **Nel menu laterale sinistro**, clicca su **"Environment Variables"**

### 2.3 Aggiungi la Variabile

1. **Clicca** sul pulsante **"Add New"** (in alto a destra)

2. **Compila il form:**
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Incolla la chiave che hai copiato da Supabase
   - **Environments:** Seleziona tutte e tre:
     - ✅ Production
     - ✅ Preview  
     - ✅ Development

3. **Clicca** su **"Save"**

### 2.4 Verifica

1. **Cerca** nella lista la variabile `SUPABASE_SERVICE_ROLE_KEY`
2. **Verifica** che sia presente e abbia un valore (mostrato come `••••••••`)

---

## 📍 PASSO 3: (OPZIONALE) Aggiorna il Codice per Usare Service Role Key

**Nota**: Attualmente il codice usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` che dovrebbe funzionare perché le tabelle `pending_notifications` e `push_subscriptions` hanno RLS disabilitato.

Se vuoi usare la SERVICE_ROLE_KEY per maggiore sicurezza, possiamo aggiornare `lib/supabase/server.ts` per usarla nelle API routes.

**Per ora, aggiungi la variabile su Vercel e procediamo con il test!**

---

## ✅ Checklist

- [ ] Ho trovato la Service Role Key su Supabase Dashboard
- [ ] Ho copiato la chiave
- [ ] Ho aggiunto `SUPABASE_SERVICE_ROLE_KEY` su Vercel
- [ ] Ho selezionato tutti gli ambienti (Production, Preview, Development)
- [ ] Ho salvato la variabile

---

## 🆘 Problemi Comuni

### Non vedo la chiave "service_role"
- **Soluzione**: Assicurati di essere nella sezione "Project API keys" e non "JWT Settings"
- La chiave è nella sezione "service_role" con etichetta "secret"

### La chiave non si copia
- **Soluzione**: Clicca sull'icona di copia (📋) accanto alla chiave rivelata

### La variabile non viene salvata su Vercel
- **Soluzione**: Verifica di aver inserito il nome esatto: `SUPABASE_SERVICE_ROLE_KEY` (tutto maiuscolo)

---

**Dopo aver aggiunto la variabile, torna qui e dimmi quando hai finito!** 🚀



