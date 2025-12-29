# 🧪 Guida Completa al Test dell'Applicazione

## ✅ Modifiche Completate

### 1. **RLS Policies Corrette**
- ✅ Policy SELECT: tutti possono vedere tutti i profili
- ✅ Policy INSERT: gli utenti possono inserire solo il proprio profilo  
- ✅ Policy UPDATE: gli utenti possono aggiornare solo il proprio profilo
- ✅ Policy DELETE: gli utenti possono eliminare solo il proprio profilo

### 2. **Constraint del Ruolo Aggiornato**
- ✅ Supporta tutti e 4 i ruoli: `host`, `creator`, `traveler`, `manager`

### 3. **Gestione Errori Migliorata**
- ✅ Uso di `.maybeSingle()` per evitare errori quando il profilo non esiste
- ✅ Flag per evitare richieste ripetute
- ✅ Redirect automatico a `/onboarding` se il profilo non esiste

### 4. **Onboarding Corretto**
- ✅ Ora crea il profilo se non esiste (UPSERT)
- ✅ Gestisce correttamente il caso in cui il profilo non esiste

### 5. **Navbar e Landing Page**
- ✅ I pulsanti "Accedi" e "Registrati" vengono nascosti quando l'utente è autenticato

---

## 📋 Piano di Test

### Fase 1: Test del Flusso di Accesso

#### Test 1.1: Accesso con Utente Senza Profilo

**Obiettivo**: Verificare che l'utente venga reindirizzato all'onboarding

**Passi**:
1. Vai su `http://localhost:3000/auth/signin`
2. Accedi con:
   - Email: `lucacorrao1996@gmail.com`
   - Password: (la tua password)
3. **Risultato atteso**:
   - ✅ Vieni reindirizzato a `/onboarding`
   - ✅ Non vedi più i pulsanti "Accedi"/"Registrati" nella navbar
   - ✅ Vedi la schermata di selezione ruolo

#### Test 1.2: Selezione Ruolo

**Passi**:
1. Seleziona un ruolo (es. "Host")
2. Clicca su "Continua"
3. **Risultato atteso**:
   - ✅ Il profilo viene creato nel database
   - ✅ Il ruolo viene salvato
   - ✅ Se scegli "Host", vai all'onboarding specifico per Host
   - ✅ Se scegli altro ruolo, vai alla home page

#### Test 1.3: Accesso Dopo Onboarding

**Passi**:
1. Completa l'onboarding
2. Esci dall'applicazione
3. Accedi nuovamente
4. **Risultato atteso**:
   - ✅ Vieni reindirizzato direttamente a `/home`
   - ✅ Non vedi più l'onboarding
   - ✅ Non vedi i pulsanti "Accedi"/"Registrati"

---

### Fase 2: Test delle Funzionalità per Ruolo

#### Test 2.1: Ruolo Host

**Passi**:
1. Accedi come Host
2. Vai alla pagina `/home`
3. **Risultato atteso**:
   - ✅ Vedi le card dei Creator disponibili
   - ✅ Puoi cliccare su una card per vedere il profilo
4. Vai alla pagina `/explore`
5. **Risultato atteso**:
   - ✅ Vedi la mappa con tutte le proprietà
   - ✅ Vedi la barra di ricerca in alto
   - ✅ Vedi la bottom navigation bar
   - ✅ Puoi passare da "Map View" a "Feed View"

#### Test 2.2: Ruolo Creator

**Passi**:
1. Accedi come Creator
2. Vai alla pagina `/home`
3. **Risultato atteso**:
   - ✅ Vedi le card degli Host disponibili
   - ✅ Puoi cliccare per vedere il profilo e inviare messaggi

#### Test 2.3: Ruolo Manager

**Passi**:
1. Accedi come Manager
2. Vai alla pagina `/home`
3. **Risultato atteso**:
   - ✅ Vedi sia le card dei Creator che degli Host
   - ✅ Puoi offrire servizi a entrambi

#### Test 2.4: Ruolo Traveler

**Passi**:
1. Accedi come Traveler
2. Vai alla pagina `/home`
3. **Risultato atteso**:
   - ✅ Vedi i post pubblicati da Host e Creator
   - ✅ Puoi interagire con i post

---

### Fase 3: Test della Pagina Profilo

**Passi**:
1. Clicca su "Profilo" nella bottom navigation bar (mobile) o nel menu (desktop)
2. **Risultato atteso**:
   - ✅ Vedi il tuo profilo in stile Instagram
   - ✅ Puoi vedere le sezioni: Post, Vetrina, Collab
   - ✅ Vedi i contatori: follower, following, post, proprietà
   - ✅ Puoi modificare il profilo

---

### Fase 4: Test Mobile

**Passi**:
1. Apri l'applicazione su un dispositivo mobile
2. **Risultato atteso**:
   - ✅ La landing page mostra "Accedi" o "Registrati"
   - ✅ La bottom navigation bar è sempre visibile quando sei autenticato
   - ✅ La top search bar è sempre visibile su `/explore`
   - ✅ Il layout è ottimizzato per mobile

---

## 🔍 Come Verificare il Profilo nel Database

### Metodo 1: Query SQL Diretta

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Esegui questa query (modifica l'email):

```sql
SELECT 
  u.id as user_id,
  u.email,
  p.username,
  p.full_name,
  p.role,
  p.onboarding_completed,
  p.created_at,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ PROFILO ESISTE'
    ELSE '❌ PROFILO NON ESISTE'
  END as stato
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'lucacorrao1996@gmail.com';
```

### Metodo 2: File SQL Creati

Ho creato questi file per te:
- `supabase/VERIFICA_PROFILO_SEMPLICE.sql` - Query semplice
- `supabase/VERIFICA_PROFILO_UTENTE.sql` - Query completa con dettagli

---

## ✅ Checklist di Verifica

Prima di iniziare il test, verifica:

- [ ] Le RLS policies sono state applicate correttamente
- [ ] Il constraint del ruolo include tutti e 4 i ruoli
- [ ] Le modifiche all'onboarding sono state salvate
- [ ] L'applicazione è in esecuzione (localhost:3000)

---

## 🚀 Inizia il Test!

1. **Apri l'applicazione** su `http://localhost:3000`
2. **Accedi** con `lucacorrao1996@gmail.com`
3. **Completa l'onboarding** scegliendo un ruolo
4. **Verifica** che tutto funzioni come previsto

---

## 📝 Note Importanti

- Se il profilo non esiste, verrai **automaticamente reindirizzato all'onboarding**
- Dopo l'onboarding, il profilo verrà creato automaticamente
- Gli errori 406 e PGRST116 non dovrebbero più apparire
- Il sistema gestisce correttamente i profili mancanti

**Buon test! 🎉**





