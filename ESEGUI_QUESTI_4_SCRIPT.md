# 📋 ESEGUI QUESTI 4 SCRIPT IN ORDINE

## 🎯 Istruzioni

Esegui questi script **UNO ALLA VOLTA** su Supabase SQL Editor:

---

### 1️⃣ VERIFICA PROFILO

**File**: `supabase/1_VERIFICA_PROFILO.sql`

**Cosa fa**: Controlla se il tuo profilo esiste

**Risultato atteso**:
- Dovresti vedere 1 riga con il tuo profilo
- `email`: lucacorrao1996@gmail.com
- `role`: dovrebbe esserci già "host" (se hai eseguito lo script precedente)

**Se NON vedi il profilo o `role` è NULL**: Passa al punto 2

**Se vedi il profilo con `role = 'host'`**: Passa direttamente al punto 3

---

### 2️⃣ FIX PROFILO (solo se necessario)

**File**: `supabase/2_FIX_PROFILO.sql`

**Cosa fa**: Crea o aggiorna il tuo profilo con:
- role = 'host'
- onboarding_completed = true
- username = 'lucacorrao1996'
- full_name = 'Luca Corrao'

**Risultato atteso**:
- Dovresti vedere il profilo aggiornato con tutti i campi compilati

---

### 3️⃣ VERIFICA POLICIES POSTS

**File**: `supabase/3_VERIFICA_POLICIES_POSTS.sql`

**Cosa fa**: Controlla se esistono le policies per creare post

**Risultato atteso**:
Dovresti vedere 4 policies:
- Anyone can view posts (SELECT)
- Authenticated users can create posts (INSERT)
- Users can update own posts (UPDATE)
- Users can delete own posts (DELETE)

**Se NON vedi queste policies** o ne vedi altre: Passa al punto 4

**Se vedi tutte e 4 le policies corrette**: Vai direttamente al test!

---

### 4️⃣ FIX POLICIES POSTS

**File**: `supabase/4_FIX_POLICIES_POSTS.sql`

**Cosa fa**: 
- Rimuove tutte le vecchie policies per posts
- Crea nuove policies corrette
- Aggiorna la cache PostgREST

**Risultato atteso**:
Alla fine dovresti vedere le 4 policies corrette elencate.

---

## ✅ Dopo aver eseguito gli script necessari

### Test dall'iPhone

1. **Logout completo**:
   - Logout dall'app
   - Chiudi Safari completamente
   - **Impostazioni** → **Safari** → **Avanzate** → **Rimuovi tutti i dati dei siti web**

2. **Nuovo login**:
   - Riapri Safari
   - Vai su https://www.nomadiqe.com
   - Login con `lucacorrao1996@gmail.com`
   - ✅ Dovresti andare direttamente a Home/Esplora
   - ✅ NON dovrebbe più chiederti di scegliere il ruolo

3. **Test post**:
   - Clicca bottone centrale **+**
   - Scrivi "Test1"
   - NON caricare foto (primo test solo testo)
   - Clicca **Pubblica**
   - ✅ Dovrebbe funzionare

4. **Test profilo**:
   - Clicca **Profilo** nella bottom nav
   - ✅ Dovresti vedere il tuo profilo
   - ✅ NON dovrebbe dire "profilo non trovato"

---

## 📝 Riepilogo Veloce

1. ✅ Esegui `1_VERIFICA_PROFILO.sql` → vedi risultato → se serve esegui `2_FIX_PROFILO.sql`
2. ✅ Esegui `3_VERIFICA_POLICIES_POSTS.sql` → vedi risultato → se serve esegui `4_FIX_POLICIES_POSTS.sql`
3. ✅ Logout + cancella cache Safari
4. ✅ Login e test

---

**Inizia dal punto 1 e fammi sapere cosa vedi!** 🎯




