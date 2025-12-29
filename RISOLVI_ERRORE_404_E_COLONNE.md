# 🔧 Risolvi Errori 404 e Problema Colonne

## 🔴 Problema 1: Errori 404 (File Statici Next.js)

Gli errori 404 indicano che la cache di build è corrotta. Il server deve essere riavviato.

## 🔴 Problema 2: Colonne Duplicate (host_id e owner_id)

Dall'errore "column owner_id already exists" vedo che **ENTRAMBE** le colonne esistono:
- `host_id` (la vecchia)
- `owner_id` (la nuova)

## ✅ SOLUZIONE

### **PASSO 1: Riavvia il Server di Sviluppo**

1. **Ferma il server corrente**:
   - Vai nel terminale dove sta girando `npm run dev`
   - Premi **Ctrl+C** per fermarlo

2. **Riavvia il server**:
   ```bash
   npm run dev
   ```

3. **Hard refresh del browser**:
   - Vai su `localhost:3000`
   - Premi **Ctrl+Shift+R** (Windows) / **Cmd+Shift+R** (Mac)

---

### **PASSO 2: Elimina host_id (Se Non Serve)**

Se la colonna `owner_id` esiste già e funziona, puoi eliminare `host_id` con questa query SQL:

```sql
-- ============================================
-- ELIMINA COLONNA host_id (se owner_id esiste già)
-- ============================================

-- Verifica che owner_id esista
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'owner_id'
    ) THEN
        -- Se owner_id esiste, elimina host_id
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'properties' 
              AND column_name = 'host_id'
        ) THEN
            RAISE NOTICE 'Eliminazione colonna host_id...';
            
            -- Elimina foreign key constraint su host_id se esiste
            ALTER TABLE public.properties 
            DROP CONSTRAINT IF EXISTS properties_host_id_fkey;
            
            -- Elimina la colonna host_id
            ALTER TABLE public.properties 
            DROP COLUMN IF EXISTS host_id;
            
            RAISE NOTICE 'Colonna host_id eliminata con successo!';
        ELSE
            RAISE NOTICE 'Colonna host_id non esiste.';
        END IF;
    ELSE
        RAISE EXCEPTION 'ERRORE: owner_id non esiste! Non eliminare host_id.';
    END IF;
END $$;

-- Verifica il risultato
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties' 
  AND column_name IN ('owner_id', 'host_id')
ORDER BY column_name;

-- Aggiorna cache PostgREST
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
```

**⚠️ IMPORTANTE**: Esegui questa query SOLO se sei sicuro che `owner_id` funziona correttamente!

---

### **PASSO 3: Aggiorna RLS Policies**

Dopo aver eliminato `host_id`, aggiorna le RLS policies per usare solo `owner_id`:

```sql
-- Disabilita RLS temporaneamente
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- Elimina tutte le policy esistenti
DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

-- Crea policy per SELECT
CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT USING (true);

-- Crea policy per INSERT usando owner_id
CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Crea policy per UPDATE usando owner_id
CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Crea policy per DELETE usando owner_id
CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE USING (auth.uid() = owner_id);

-- Riabilita RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Aggiorna cache
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
```

---

## 📋 Checklist

- [ ] Fermato il server di sviluppo
- [ ] Riavviato il server (`npm run dev`)
- [ ] Hard refresh del browser (Ctrl+Shift+R)
- [ ] Verificato che gli errori 404 siano spariti
- [ ] Eseguito query per eliminare `host_id` (se necessario)
- [ ] Eseguito query per aggiornare RLS policies
- [ ] Atteso 10-30 secondi dopo le query SQL
- [ ] Riprovato a creare la proprietà

---

**Prima risolvi gli errori 404 riavviando il server, poi gestiamo le colonne!** 🚀






