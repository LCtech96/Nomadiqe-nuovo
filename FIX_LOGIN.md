# 🔧 Come Risolvere l'Errore 401 (Invalid login credentials)

## ⚠️ Problema
Stai ricevendo un errore `401 Unauthorized` quando provi a fare login con email e password.

## ✅ Soluzione Passo-Passo

### Passo 1: Verifica che l'utente esista

1. **Vai su Supabase Dashboard:**
   - Apri https://supabase.com/dashboard
   - Seleziona il tuo progetto
   - Vai su **Authentication > Users**

2. **Cerca il tuo utente:**
   - Cerca per email (es. `lucacorrao1996@gmail.com`)
   - Verifica se l'utente esiste

3. **Se l'utente NON esiste:**
   - Vai su `http://localhost:3000/auth/signup`
   - Crea un nuovo account
   - **IMPORTANTE:** Verifica l'email prima di fare login

### Passo 2: Disabilita la verifica email (SOLO per sviluppo)

**IMPORTANTE:** Questo è solo per sviluppo locale. In produzione mantieni la verifica email abilitata.

1. Vai su **Supabase Dashboard > Authentication > Settings**
2. Trova la sezione **"Email Auth"**
3. **Disabilita** "Enable email confirmations"
4. Salva le modifiche

Ora puoi fare login senza verificare l'email.

### Passo 3: Crea un nuovo account di test

1. Vai su `http://localhost:3000/auth/signup`
2. Inserisci:
   - Email: `test@example.com` (o qualsiasi email)
   - Password: `password123` (minimo 6 caratteri)
3. Clicca su "Registrati"
4. **Se la verifica email è disabilitata**, puoi fare login immediatamente
5. Vai su `http://localhost:3000/auth/signin`
6. Usa le credenziali appena create

### Passo 4: Verifica tramite API di test

Puoi testare se un utente esiste chiamando:

```
http://localhost:3000/api/test-auth?email=la_tua_email@example.com
```

Questo ti dirà se il profilo esiste nel database.

## 🔍 Debug Avanzato

### Controlla i log del server

Quando provi a fare login, controlla i log del terminale dove gira `npm run dev`. Dovresti vedere:

```
Attempting login for: lucacorrao1996@gmail.com
Supabase auth error: Invalid login credentials
```

### Possibili cause:

1. **Utente non esiste**
   - Soluzione: Crea un nuovo account tramite signup

2. **Email non verificata**
   - Soluzione: Disabilita la verifica email in Supabase (sviluppo) o verifica l'email

3. **Password errata**
   - Soluzione: Usa la password corretta o crea un nuovo account

4. **Profilo non creato**
   - Soluzione: Esegui lo script SQL aggiornato in Supabase (il trigger crea automaticamente il profilo)

## 📝 Checklist

- [ ] Ho verificato che l'utente esista in Supabase Dashboard > Authentication > Users
- [ ] Ho disabilitato la verifica email in Supabase (solo per sviluppo)
- [ ] Ho creato un nuovo account di test
- [ ] Ho verificato che il profilo esista in Supabase Dashboard > Table Editor > profiles
- [ ] Ho riavviato il server Next.js dopo aver modificato `.env`
- [ ] Ho controllato i log del server per errori specifici

## 🚀 Se ancora non funziona

1. **Pulisci tutto e ricomincia:**
   - Elimina l'utente da Supabase Dashboard
   - Crea un nuovo account
   - Prova a fare login

2. **Verifica le variabili d'ambiente:**
   - Controlla che `.env` contenga le chiavi corrette
   - Riavvia il server

3. **Controlla la console del browser:**
   - Apri DevTools (F12)
   - Vai su Console
   - Cerca errori specifici

4. **Controlla i log del server:**
   - Guarda il terminale dove gira `npm run dev`
   - Cerca messaggi di errore specifici






