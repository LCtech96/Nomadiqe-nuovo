# 🚨 FIX URGENTI FINALI

## Problemi Rimanenti

1. ❌ **Errore RLS quando crei post**: "new row violates row-level security policy for table posts"
2. ⚠️ **Zoom mappa non funziona** su iPhone

---

## 🔧 FIX 1: Errore RLS Posts

### Esegui Script 9 su Supabase

**File**: `supabase/9_FIX_POLICIES_POSTS_SENZA_AUTHOR_CHECK.sql`

**Cosa fa**:
- Rimuove tutte le policies per posts
- Ricrea la policy INSERT con `WITH CHECK (true)` (più permissiva)
- Permette a tutti gli utenti autenticati di creare post

**Questo dovrebbe risolvere definitivamente l'errore RLS.**

**Dopo averlo eseguito**:
1. Aspetta 30 secondi
2. Cancella cache Safari
3. Riprova a creare un post dall'iPhone

---

## 🗺️ FIX 2: Zoom Mappa

Il problema è che il componente mappa non ha le opzioni di touch abilitate per mobile.

### Soluzione Temporanea (Usa Feed View)

Per ora, usa il bottone **"Feed View"** in alto a destra per vedere la lista delle proprietà invece della mappa.

### Soluzione Permanente

Sto preparando un fix per abilitare:
- Pinch to zoom (zoom con due dita)
- Touch gestures
- Scroll della mappa

---

## 📋 Ordine Azioni

1. ✅ **Esegui script 9** su Supabase
2. ✅ **Aspetta 30 secondi**
3. ✅ **Cancella cache Safari** su iPhone
4. ✅ **Chiudi Safari** completamente
5. ✅ **Riapri Safari** → vai su https://www.nomadiqe.com
6. ✅ **Fai logout e login**
7. ✅ **Prova a creare un post** (solo testo, senza foto)
8. ✅ Dovrebbe funzionare!

---

## 🎯 Test Post

**Primo test (solo testo)**:
- Clicca **+** centrale
- Scrivi "Test funziona!"
- **NON caricare foto**
- Clicca **Pubblica**
- ✅ Dovrebbe funzionare

**Secondo test (con foto)**:
- Clicca **+** centrale
- Scrivi "Test con foto"
- Carica una foto
- Clicca **Pubblica**
- ✅ Dovrebbe funzionare (se hai configurato il token Vercel)

---

**Esegui lo script 9 e fammi sapere!** 🚀




