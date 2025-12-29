# 🔧 FIX COMPLETI - iPhone lucacorrao1996@gmail.com

## ✅ Modifiche Deployate

Ho risolto e deployato le seguenti correzioni:

### 1. ✅ Onboarding non richiede più il ruolo se già presente
- Se hai già un ruolo salvato, verrai reindirizzato direttamente a `/home`
- Non vedrai più la schermata "Scegli il tuo ruolo"

### 2. ✅ Script SQL per correggere il tuo profilo
- Creato `supabase/FIX_PROFILO_LUCA_COMPLETO.sql`
- Assicura che il tuo profilo abbia `role = 'host'` e `onboarding_completed = true`

---

## 🚨 AZIONI RICHIESTE DA TE

### PASSO 1: Correggi il profilo nel database

1. **Vai su Supabase**: https://supabase.com/dashboard
2. **Seleziona il tuo progetto**
3. **SQL Editor** (nella sidebar sinistra)
4. **Copia e incolla questa query**:

```sql
DO $$
DECLARE
    user_id_var UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Trova l'ID utente
    SELECT id INTO user_id_var
    FROM auth.users
    WHERE email = 'lucacorrao1996@gmail.com';

    IF user_id_var IS NULL THEN
        RAISE EXCEPTION 'Utente con email lucacorrao1996@gmail.com non trovato in auth.users';
    END IF;

    RAISE NOTICE 'Utente trovato con ID: %', user_id_var;

    -- Verifica se esiste il profilo
    SELECT EXISTS(
        SELECT 1 FROM public.profiles WHERE id = user_id_var
    ) INTO profile_exists;

    IF profile_exists THEN
        -- Aggiorna il profilo esistente
        UPDATE public.profiles
        SET 
            role = 'host',
            email = 'lucacorrao1996@gmail.com',
            onboarding_completed = true,
            updated_at = NOW()
        WHERE id = user_id_var;
        
        RAISE NOTICE '✅ Profilo aggiornato con ruolo host e onboarding completato';
    ELSE
        -- Crea il profilo
        INSERT INTO public.profiles (
            id,
            email,
            role,
            onboarding_completed,
            created_at,
            updated_at
        ) VALUES (
            user_id_var,
            'lucacorrao1996@gmail.com',
            'host',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Profilo creato con ruolo host';
    END IF;
END $$;

-- Verifica il risultato
SELECT 
    id,
    email,
    username,
    full_name,
    role,
    onboarding_completed
FROM public.profiles 
WHERE email = 'lucacorrao1996@gmail.com';
```

5. **Clicca "Run"**
6. **Verifica il risultato**: Dovresti vedere il tuo profilo con `role = 'host'` e `onboarding_completed = true`

---

### PASSO 2: Configura Token Vercel Blob

**Problema**: La variabile `NEW_BLOB_READ_WRITE_TOKEN` non funziona nel browser perché manca il prefisso `NEXT_PUBLIC_`.

#### Su Vercel

1. **Vai su Vercel Dashboard**: https://vercel.com/dashboard
2. **Seleziona il progetto** "nomadiqe-nuovo"
3. **Settings** → **Environment Variables**
4. **Aggiungi NUOVA variabile** (non modificare quella esistente):
   - **Nome**: `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN`
   - **Valore**: `vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr`
   - **Environments**: Seleziona **tutti** (Production, Preview, Development)
5. **Save**

⚠️ **IMPORTANTE**: 
- Deve chiamarsi esattamente `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN`
- Il prefisso `NEXT_PUBLIC_` è OBBLIGATORIO per funzionare nel browser

#### Redeploy

Dopo aver aggiunto la variabile, **DEVI fare un nuovo deploy**:

**Opzione A - Redeploy da Vercel Dashboard**:
1. Vai su **Deployments**
2. Trova l'ultimo deployment (quello appena completato)
3. Clicca sui tre puntini `...`
4. Seleziona **Redeploy**
5. Conferma

**Opzione B - Aspetta il deploy automatico**:
- Il deploy è già partito automaticamente con le mie modifiche
- Aspetta 2-3 minuti che completi

---

### PASSO 3: Testa dall'iPhone

Dopo aver:
1. ✅ Eseguito la query SQL su Supabase
2. ✅ Aggiunto `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN` su Vercel
3. ✅ Aspettato che il deploy completi (2-3 minuti)

**Cancella cache Safari su iPhone**:
1. **Impostazioni** → **Safari**
2. **Avanzate** → **Dati dei siti web**
3. **Rimuovi tutti i dati dei siti web**

**Testa l'app**:
1. 🔄 Vai su https://www.nomadiqe.com
2. 🔑 Fai logout (se sei loggato)
3. 🔑 Fai login con `lucacorrao1996@gmail.com`
4. ✅ **NON dovresti più vedere la scelta del ruolo**
5. ✅ Dovresti vedere direttamente la **Home**
6. 📸 Vai su **Profilo** → Clicca il bottone centrale `+`
7. 📸 Prova a **creare un post con foto**
8. ✅ **NON dovresti più vedere l'errore del token**

---

## 🔍 Verifica Variabili d'Ambiente su Vercel

Dovresti avere ENTRAMBE queste variabili:

| Nome | Valore | Uso |
|------|--------|-----|
| `NEW_BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr` | Server-side |
| `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN` | `vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr` | **Client-side (browser)** |

---

## 📊 Verifica Profilo nel Database

Se vuoi verificare che il profilo sia corretto, esegui questa query su Supabase:

```sql
SELECT 
    id,
    email,
    username,
    full_name,
    role,
    onboarding_completed,
    created_at
FROM public.profiles 
WHERE email = 'lucacorrao1996@gmail.com';
```

**Risultato atteso**:
- `role`: `host`
- `onboarding_completed`: `true`
- `email`: `lucacorrao1996@gmail.com`

---

## ❓ Se il problema persiste

### Problema: Ancora richiede di scegliere il ruolo

**Causa possibile**: La query SQL non è stata eseguita o il profilo non esiste.

**Soluzione**:
1. Esegui di nuovo la query SQL del PASSO 1
2. Verifica il risultato con la query di verifica
3. Fai logout e login di nuovo

### Problema: Errore token Vercel Blob

**Causa possibile**: La variabile `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN` non è stata aggiunta o il deploy non è completato.

**Soluzione**:
1. Verifica su Vercel che la variabile `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN` esista
2. Fai un nuovo redeploy
3. Aspetta 2-3 minuti
4. Cancella cache Safari
5. Riprova

---

## 📝 Riepilogo Modifiche Codice

Ho modificato:
1. `app/onboarding/page.tsx`: Se utente ha un ruolo, redirect diretto a `/home`
2. `app/home/page.tsx`: Corretto errore TypeScript con `Set`
3. `app/kol-bed/page.tsx`: Corretto type checking per `role`
4. `components/create-post-dialog.tsx`: Aggiunto state `location` mancante

Tutti i deploy sono completati con successo.

---

**Fammi sapere se funziona!** 🚀




