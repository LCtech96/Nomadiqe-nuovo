# 🔧 Fix: Utenti Esistenti in Profiles ma Non in auth.users

## ⚠️ Problema Identificato

Gli utenti esistono in `public.profiles` ma **NON esistono in `auth.users`**. Questo causa:
- ❌ Impossibilità di fare login (credenziali non riconosciute)
- ❌ Impossibilità di resettare la password (utente non trovato in auth.users)

## ✅ Soluzione Passo-Passo

### PASSO 1: Verifica Quali Utenti Mancano

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Esegui lo script: `supabase/31_VERIFICA_UTENTI_MANCANTI_AUTH.sql`
3. Controlla i risultati - vedrai quali utenti hanno "❌ MANCA IN auth.users"

### PASSO 2: Crea gli Utenti Mancanti

**Opzione A - Usando l'API (Consigliato):**

1. **Configura la Service Role Key:**
   - Vai su Supabase Dashboard → Settings → API
   - Copia la **Service Role Key** (NON la Anon Key!)
   - Aggiungila alle variabili d'ambiente su Vercel:
     - Nome: `SUPABASE_SERVICE_ROLE_KEY`
     - Valore: [la tua Service Role Key]
     - Ambiente: Production, Preview, Development

2. **Configura il token segreto (opzionale ma consigliato):**
   - Aggiungi una variabile d'ambiente su Vercel:
     - Nome: `ADMIN_API_SECRET_TOKEN`
     - Valore: [genera un token segreto random, es: `openssl rand -hex 32`]
     - Ambiente: Production, Preview, Development

3. **Chiama l'endpoint API:**
   ```bash
   curl -X POST https://[IL_TUO_DOMINIO].vercel.app/api/admin/create-missing-users \
     -H "Authorization: Bearer [IL_TUO_ADMIN_API_SECRET_TOKEN]"
   ```
   
   Oppure usa un tool come Postman con l'header Authorization

**Opzione B - Manualmente tramite Supabase Dashboard:**

1. Vai su **Supabase Dashboard** → **Authentication** → **Users**
2. Per ogni utente mancante:
   - Clicca "Add user" → "Create new user"
   - Inserisci l'email (deve corrispondere a quella in profiles)
   - Imposta una password temporanea
   - **IMPORTANTE:** L'ID deve corrispondere a quello in profiles (UUID)
   - Conferma l'email automaticamente

### PASSO 3: Gli Utenti Devono Reimpostare la Password

Dopo aver creato gli utenti in auth.users:

1. Gli utenti devono andare su `/auth/reset-password`
2. Inserire la loro email
3. Riceveranno un codice OTP via email
4. Potranno reimpostare la password

## 🔒 Sicurezza

⚠️ **IMPORTANTE:** 
- La Service Role Key ha accesso completo al database
- NON esporla mai nel frontend
- NON committarla nel repository
- Usala solo in endpoint API server-side

## 📋 Checklist

- [ ] Eseguito script SQL per verificare utenti mancanti
- [ ] Configurata Service Role Key su Vercel
- [ ] Chiamato endpoint API per creare utenti mancanti
- [ ] Verificato che gli utenti possano fare reset password
- [ ] Testato login con credenziali aggiornate

## 🐛 Troubleshooting

**Errore: "Service Role Key non configurata"**
- Verifica che `SUPABASE_SERVICE_ROLE_KEY` sia configurata su Vercel
- Riavvia il deploy dopo aver aggiunto la variabile

**Errore: "User already exists"**
- L'utente esiste già in auth.users, non serve crearlo
- Verifica che l'email corrisponda esattamente

**Gli utenti ancora non riescono a fare login**
- Verifica che l'ID in auth.users corrisponda a quello in profiles
- Controlla che l'email sia confermata (email_confirm: true)
- Assicurati che abbiano reimpostato la password tramite reset password
