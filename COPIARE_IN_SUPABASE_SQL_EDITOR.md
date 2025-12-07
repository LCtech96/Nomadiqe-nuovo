# 📋 Query SQL da Copiare in Supabase

## 🎯 Problema

Errore quando crei una proprietà:
```
Could not find the 'owner_id' column of 'properties' in the schema cache
POST /rest/v1/properties?select=* 400 (Bad Request)
```

## ✅ Soluzione

La colonna `owner_id` **esiste già** nel database, ma PostgREST (API di Supabase) non la vede nella cache.

### **PASSO 1: Copia questa query SQL**

Apri il file: **`supabase/FIX_OWNER_ID_SCHEMA_CACHE.sql`**

Oppure copia direttamente questa query:

```sql
-- ============================================
-- FIX CACHE POSTGREST - owner_id IN properties
-- ============================================

-- Verifica che owner_id esista
SELECT 
    '✅ VERIFICA: owner_id in properties' as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'owner_id'
        ) THEN 'ESISTE ✅'
        ELSE 'NON ESISTE ❌'
    END as risultato;

-- Mostra dettagli colonna
SELECT 
    'owner_id' as column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties' 
  AND column_name = 'owner_id';

-- FORZA REFRESH CACHE POSTGREST
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_sleep(1);
SELECT pg_notify('pgrst', 'reload schema');
```

### **PASSO 2: Esegui la Query**

1. Vai su: https://supabase.com/dashboard
2. Seleziona il progetto: **nomadiqenuovo**
3. Vai su: **SQL Editor** (menu laterale)
4. Clicca: **New Query**
5. **Incolla** la query sopra
6. Clicca: **Run** (o premi F5)

### **PASSO 3: Attendi e Ricarica**

1. **Attendi 10-30 secondi** dopo l'esecuzione
2. Vai su `localhost:3000/onboarding`
3. **Hard refresh** del browser: **Ctrl+Shift+R** (Windows) / **Cmd+Shift+R** (Mac)
4. Riprova a creare la proprietà

### **PASSO 4: Se Non Funziona**

Se dopo 30 secondi il problema persiste:

1. Vai su: **Supabase Dashboard** → **Settings** → **API**
2. Cerca: **"Restart API"** o **"Restart Project"**
3. Clicca per riavviare l'API
4. Attendi 1-2 minuti
5. Riprova

---

## 📝 Note

- ✅ La colonna `owner_id` **esiste già** nel database
- ❌ PostgREST non la vede nella cache
- ✅ Questa query forza il refresh della cache
- ⏱️ Può richiedere 10-30 secondi per aggiornare

---

**Copia la query da `supabase/FIX_OWNER_ID_SCHEMA_CACHE.sql` e incollala su Supabase SQL Editor!** 🚀

