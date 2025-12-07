# 🚨 FIX URGENTI - Problemi Persistenti

## Problemi Rilevati

1. ❌ Ancora chiede di scegliere il ruolo dopo login
2. ❌ Pagina profilo dice "profilo non trovato"
3. ❌ Errore RLS quando provi a creare un post
4. ⚠️ Zoom mappa non funziona

---

## 🔧 SOLUZIONE IMMEDIATA

### PASSO 1: Esegui questa query su Supabase

**Vai su Supabase SQL Editor** e esegui il file `supabase/FIX_COMPLETO_TUTTI_PROBLEMI.sql`

Questa query:
- ✅ Assicura che il profilo sia corretto con `role = 'host'`
- ✅ Corregge le RLS policies per `posts` (permette creazione)
- ✅ Corregge le RLS policies per `profiles` (permette visualizzazione)
- ✅ Aggiorna la cache di PostgREST

**IMPORTANTE**: Dopo aver eseguito la query, aspetta 30 secondi prima di testare.

---

### PASSO 2: Logout Completo

Sul tuo iPhone:

1. **Safari** → Vai su https://www.nomadiqe.com
2. **Fai logout** dall'app
3. **Chiudi completamente Safari**:
   - Doppio tap sul tasto Home (o swipe up)
   - Swipe up sulla finestra di Safari per chiuderla
4. **Cancella cache Safari**:
   - **Impostazioni** → **Safari**
   - **Avanzate** → **Dati dei siti web**
   - **Rimuovi tutti i dati dei siti web**

---

### PASSO 3: Nuovo Login

1. **Riapri Safari** e vai su https://www.nomadiqe.com
2. **Fai login** con `lucacorrao1996@gmail.com`
3. ✅ Ora dovresti andare direttamente alla **Home** o **Esplora**
4. ✅ NON dovrebbe più chiederti di scegliere il ruolo

---

### PASSO 4: Test Post

1. Clicca sul bottone **+ centrale** nella bottom nav
2. Scrivi qualcosa nel post
3. **NON caricare foto per ora** (primo test solo testo)
4. Clicca **Pubblica**
5. ✅ Dovrebbe funzionare senza errori RLS

Se funziona, prova poi con una foto.

---

## 🔍 Causa dei Problemi

1. **RLS Policies**: Le policy per `posts` non permettevano l'inserimento con `author_id`
2. **Sessione**: La sessione non si aggiornava correttamente senza un logout completo
3. **Cache**: Il browser aveva in cache la vecchia versione dell'app

---

## ⚠️ Se Ancora Non Funziona

### Problema: Ancora chiede il ruolo

**Verifica sul database**:
Esegui su Supabase SQL Editor:

```sql
SELECT id, email, role, onboarding_completed
FROM public.profiles 
WHERE email = 'lucacorrao1996@gmail.com';
```

**Risultato atteso**:
- `role`: `host`
- `onboarding_completed`: `true`

Se è diverso, esegui di nuovo `FIX_COMPLETO_TUTTI_PROBLEMI.sql`.

---

### Problema: Errore RLS su posts

**Verifica policies**:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'posts';
```

**Dovresti vedere**:
- `Authenticated users can create posts` con `cmd = INSERT`

---

### Problema: Mappa non fa zoom

Questo è un problema diverso del componente Leaflet. Per ora:
- Usa il bottone **Feed View** per vedere la lista
- Il problema della mappa lo risolveremo dopo

---

## 📝 Riepilogo Azioni

1. ✅ Esegui `FIX_COMPLETO_TUTTI_PROBLEMI.sql` su Supabase
2. ✅ Logout completo dall'app
3. ✅ Cancella cache Safari
4. ✅ Chiudi completamente Safari
5. ✅ Riapri Safari e fai login
6. ✅ Testa creazione post (prima solo testo)

---

**Fammi sapere dopo aver eseguito questi passi!** 🚀

