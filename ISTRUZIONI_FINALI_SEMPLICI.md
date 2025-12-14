# 🎯 ISTRUZIONI FINALI - 2 Script da Eseguire

## Stato Attuale

✅ **Profilo**: Corretto (role = host, onboarding_completed = true)  
⚠️ **Policies posts**: 6 policies duplicate invece di 4 corrette

---

## 🚀 ESEGUI QUESTI 2 SCRIPT IN ORDINE

### Script 1: Rimuovi tutte le policies duplicate

**File**: `supabase/5_RIMUOVI_TUTTE_POLICIES_POSTS.sql`

**Cosa fa**:
- Rimuove TUTTE le policies per posts (anche quelle con nomi strani)
- Usa un loop dinamico per trovarle tutte

**Risultato atteso**:
- Alla fine dovresti vedere: `numero_policies_rimaste = 0`

---

### Script 2: Ricrea le 4 policies corrette

**File**: `supabase/6_RICREA_POLICIES_POSTS.sql`

**Cosa fa**:
- Crea esattamente 4 policies per posts:
  1. Anyone can view posts (SELECT)
  2. Authenticated users can create posts (INSERT)
  3. Users can update own posts (UPDATE)
  4. Users can delete own posts (DELETE)

**Risultato atteso**:
- Dovresti vedere esattamente 4 policies nella tabella finale

---

## ✅ Dopo gli script

### Test dall'iPhone

1. **Cancella cache Safari**:
   - **Impostazioni** → **Safari** → **Avanzate**
   - **Dati dei siti web** → **Rimuovi tutti**

2. **Chiudi Safari completamente**:
   - Doppio tap Home (o swipe up)
   - Swipe up su Safari per chiuderla

3. **Riapri Safari e vai su** https://www.nomadiqe.com

4. **Fai logout e login** con `lucacorrao1996@gmail.com`

5. **Test**:
   - ✅ NON dovrebbe più chiederti di scegliere il ruolo
   - ✅ Vai su **Profilo** → dovresti vedere il tuo profilo
   - ✅ Clicca **+** centrale → scrivi "Test1" → **Pubblica**
   - ✅ Il post dovrebbe essere creato senza errori RLS

---

## 🔍 Se ancora non funziona

**Mostrami**:
1. Screenshot del risultato dello script 5 (numero_policies_rimaste)
2. Screenshot del risultato dello script 6 (le 4 policies finali)
3. Screenshot dell'errore dall'iPhone (se persiste)

---

**Esegui prima lo script 5, poi lo script 6, e fammi sapere!** 🎯


