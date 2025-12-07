# Troubleshooting - Problemi di Autenticazione

## Errore: "Invalid login credentials" (401 Unauthorized)

### Possibili cause e soluzioni:

#### 1. L'utente non esiste ancora
**Soluzione:** 
- Vai su `/auth/signup` e crea un nuovo account
- Verifica l'email (controlla la casella di posta)
- Dopo la verifica, prova a fare login

#### 2. Email non verificata
**Problema:** Supabase potrebbe richiedere la verifica email prima di permettere il login.

**Soluzione:**
- Controlla la tua email per il link di verifica
- Oppure vai su `/auth/verify-email` e inserisci il codice a 6 cifre
- Se non ricevi l'email, controlla la cartella spam

#### 3. Password errata
**Soluzione:**
- Assicurati di usare la password corretta
- Se hai dimenticato la password, usa la funzione "Password dimenticata" (se implementata)
- Oppure crea un nuovo account

#### 4. Configurazione Supabase
**Verifica:**
1. Vai sul dashboard Supabase
2. Authentication > Settings
3. Verifica che "Enable email confirmations" sia configurato correttamente
4. Per sviluppo, puoi disabilitare temporaneamente la verifica email

#### 5. Variabili d'ambiente
**Verifica:**
- Il file `.env` contiene le variabili corrette:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Riavvia il server dopo aver modificato `.env`

### Test rapido

1. **Crea un nuovo account:**
   - Vai su `http://localhost:3000/auth/signup`
   - Inserisci email e password
   - Verifica l'email

2. **Verifica che l'utente esista in Supabase:**
   - Vai su Supabase Dashboard > Authentication > Users
   - Cerca l'utente per email
   - Verifica che sia "Confirmed"

3. **Prova il login:**
   - Vai su `http://localhost:3000/auth/signin`
   - Usa le credenziali appena create

### Log del server

Controlla i log del server per vedere errori specifici:
- `Supabase auth error: ...` - indica il problema specifico
- `Auth Config Check` - verifica che le variabili d'ambiente siano caricate

### Trigger automatico profilo

Dopo aver eseguito lo script SQL aggiornato, ogni nuovo utente avrà automaticamente:
- Un profilo creato nella tabella `profiles`
- 100 punti bonus per la registrazione
- Una voce nello storico punti

**Importante:** Esegui lo script SQL aggiornato in Supabase SQL Editor se non l'hai già fatto!



