# ✅ ISTRUZIONI FINALI - Tutto Pronto!

## 🎉 Cosa Ho Fatto Per Te

1. ✅ **Aggiornato** `app/dashboard/host/properties/[id]/page.tsx` (riga 61: `host_id` → `owner_id`)
2. ✅ **Aggiornato** `app/profile/[id]/page.tsx` (riga 86: `host_id` → `owner_id`)
3. ✅ **Creato** query SQL per eliminare `host_id`
4. ✅ **Creato** query SQL per aggiornare RLS policies

---

## 📋 COSA DEVI FARE TU (In Ordine)

### **PASSO 1: Riavvia il Server** ⚡ (Risolve Errori 404)

1. **Ferma il server**:
   - Vai nel terminale dove sta girando `npm run dev`
   - Premi **Ctrl+C**

2. **Riavvia il server**:
   ```bash
   npm run dev
   ```

3. **Hard refresh del browser**:
   - Vai su `localhost:3000`
   - Premi **Ctrl+Shift+R**

**✅ Gli errori 404 dovrebbero essere risolti!**

---

### **PASSO 2: Esegui Query SQL nel Supabase** 🗄️

**Vai su: [Supabase SQL Editor](https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/sql)**

#### **Query 1: Elimina `host_id`**

Copia e incolla questa query (si trova anche in `FIX_ERRORI_404_E_ELIMINA_HOST_ID.sql`):

```sql
-- Elimina host_id se owner_id esiste già
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'properties' 
          AND column_name = 'owner_id'
    ) THEN
        RAISE NOTICE '✅ owner_id esiste. Eliminazione host_id...';
        
        ALTER TABLE public.properties 
        DROP CONSTRAINT IF EXISTS properties_host_id_fkey;
        
        DROP INDEX IF EXISTS idx_properties_host;
        
        ALTER TABLE public.properties 
        DROP COLUMN IF EXISTS host_id;
        
        RAISE NOTICE '✅ host_id eliminata con successo!';
    ELSE
        RAISE EXCEPTION '❌ ERRORE: owner_id non esiste!';
    END IF;
END $$;

SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'properties' 
  AND column_name IN ('owner_id', 'host_id')
ORDER BY column_name;

NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
```

**Clicca "Run"!**

#### **Query 2: Aggiorna RLS Policies**

Copia e incolla questa query (si trova anche in `AGGIORNA_RLS_POLICIES_OWNER_ID.sql`):

```sql
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.properties;
DROP POLICY IF EXISTS "Properties are viewable by everyone" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;

CREATE POLICY "Properties are viewable by everyone" ON public.properties
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own properties" ON public.properties
  FOR DELETE USING (auth.uid() = owner_id);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
```

**Clicca "Run"!**

---

### **PASSO 3: Attendi e Testa** ⏰

1. **Attendi 10-30 secondi** dopo aver eseguito le query SQL
2. **Hard refresh del browser** (Ctrl+Shift+R)
3. **Vai su**: `localhost:3000/onboarding`
4. **Prova a creare una proprietà**

**✅ Se funziona, tutto è risolto!**

---

## 📁 File Che Ho Aggiornato

1. ✅ `app/dashboard/host/properties/[id]/page.tsx` - Riga 61: `host_id` → `owner_id`
2. ✅ `app/profile/[id]/page.tsx` - Riga 86: `host_id` → `owner_id`

---

## 🚨 Se Qualcosa Non Funziona

- **Errori 404 persistono?** → Riavvia il server di nuovo e fai hard refresh
- **"column host_id does not exist" in SQL?** → Significa che è già stato eliminato, va bene!
- **Errore creando proprietà?** → Controlla la console del browser per nuovi errori

---

**Fammi sapere se funziona tutto!** 🚀
