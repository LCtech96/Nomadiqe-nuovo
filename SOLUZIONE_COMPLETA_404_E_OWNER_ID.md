# ✅ Soluzione Completa - Errori 404 e owner_id

## 🔴 Problemi Attuali

1. **Errori 404**: File statici Next.js non trovati (cache corrotta)
2. **Colonne duplicate**: Sia `host_id` che `owner_id` esistono nella tabella `properties`

## ✅ SOLUZIONE STEP-BY-STEP

---

### **PASSO 1: Riavvia il Server (Risolve Errori 404)**

1. **Ferma il server corrente**:
   - Vai nel terminale dove sta girando `npm run dev`
   - Premi **Ctrl+C** per fermarlo

2. **Riavvia il server**:
   ```bash
   npm run dev
   ```

3. **Attendi** che il server si avvii completamente (vedrai "Ready" nella console)

4. **Hard refresh del browser**:
   - Vai su `localhost:3000`
   - Premi **Ctrl+Shift+R** (Windows) / **Cmd+Shift+R** (Mac)

**✅ Gli errori 404 dovrebbero essere risolti!**

---

### **PASSO 2: Elimina host_id (Se owner_id Esiste)**

Dall'errore "column owner_id already exists", vedo che entrambe le colonne esistono. Elimina `host_id`:

1. Vai su: **Supabase SQL Editor**
2. Copia e incolla la query da: **`supabase/FIX_ERRORI_404_E_ELIMINA_HOST_ID.sql`**

Oppure esegui questa query:

```sql
-- Elimina host_id se owner_id esiste
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'owner_id'
    ) THEN
        -- Elimina foreign key constraint su host_id
        ALTER TABLE public.properties 
        DROP CONSTRAINT IF EXISTS properties_host_id_fkey;
        
        -- Elimina index su host_id
        DROP INDEX IF EXISTS idx_properties_host;
        
        -- Elimina la colonna host_id
        ALTER TABLE public.properties 
        DROP COLUMN IF EXISTS host_id;
        
        RAISE NOTICE '✅ host_id eliminata con successo!';
    END IF;
END $$;

-- Verifica
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties' 
  AND column_name IN ('owner_id', 'host_id')
ORDER BY column_name;

-- Aggiorna cache
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
```

---

### **PASSO 3: Aggiorna RLS Policies**

Dopo aver eliminato `host_id`, aggiorna le RLS policies per usare solo `owner_id`:

1. Vai su: **Supabase SQL Editor**
2. Copia e incolla la query da: **`supabase/AGGIORNA_RLS_POLICIES_OWNER_ID.sql`**

Oppure esegui questa query:

```sql
-- Disabilita RLS
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

### **PASSO 4: Verifica e Testa**

1. **Attendi 10-30 secondi** dopo l'esecuzione delle query SQL

2. **Vai su**: `localhost:3000/onboarding`

3. **Prova a creare una proprietà**:
   - Completa tutti i campi
   - Carica le immagini
   - Clicca "Continua"

4. **Se funziona**: ✅ Problema risolto!

5. **Se non funziona**: Controlla la console per nuovi errori

---

## 📋 Checklist Completa

- [ ] Server di sviluppo riavviato (`npm run dev`)
- [ ] Hard refresh del browser fatto (Ctrl+Shift+R)
- [ ] Errori 404 risolti
- [ ] Query SQL eseguita per eliminare `host_id`
- [ ] Query SQL eseguita per aggiornare RLS policies
- [ ] Atteso 10-30 secondi dopo le query SQL
- [ ] Testato creazione proprietà
- [ ] Proprietà creata con successo

---

## 🚨 Se Qualcosa Non Funziona

### **Problema: Errori 404 persistono**

**Soluzione**:
1. Ferma completamente il server (Ctrl+C)
2. Elimina `.next` manualmente: `rm -rf .next` (Mac/Linux) o `rmdir /s /q .next` (Windows)
3. Riavvia: `npm run dev`

### **Problema: "column host_id does not exist"**

**Soluzione**: Questo significa che `host_id` è già stato eliminato. Vai direttamente al PASSO 3 (aggiorna RLS policies).

### **Problema: RLS policy errori**

**Soluzione**: Esegui la query del PASSO 3 di nuovo. Le policy vecchie potrebbero interferire.

---

**Segui i passi 1-4 in ordine e dimmi se funziona!** 🚀



