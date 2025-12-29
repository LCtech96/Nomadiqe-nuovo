# 🚨 FIX IMMEDIATI - Profilo e Token Vercel Blob

## Problema 1: Richiesta ripetuta di scegliere il ruolo
**Causa**: Il profilo nel database non ha il campo `role` o `onboarding_completed` impostato correttamente.

### Soluzione

1. **Vai su Supabase SQL Editor**
2. **Esegui questa query** (apri il file `supabase/FIX_PROFILO_LUCA_COMPLETO.sql` e copia/incolla):

```sql
-- Query già preparata nel file supabase/FIX_PROFILO_LUCA_COMPLETO.sql
```

Questo assicurerà che il tuo profilo abbia:
- `role = 'host'`
- `onboarding_completed = true`
- `email = 'lucacorrao1996@gmail.com'`

---

## Problema 2: Token Vercel Blob non configurato

**Causa**: La variabile d'ambiente deve avere il prefisso `NEXT_PUBLIC_` per funzionare nel browser.

### Soluzione su Vercel

1. **Vai su Vercel Dashboard**: https://vercel.com/dashboard
2. **Seleziona il progetto** "nomadiqe-nuovo"
3. **Settings** → **Environment Variables**
4. **Aggiungi NUOVA variabile**:
   - **Nome**: `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN`
   - **Valore**: `vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr`
   - **Environments**: Seleziona tutti (Production, Preview, Development)
5. **Save**

⚠️ **IMPORTANTE**: Deve essere `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN` (con il prefisso `NEXT_PUBLIC_`)

### Dopo aver aggiunto la variabile

**DEVI FARE UN NUOVO DEPLOY** perché le variabili d'ambiente vengono lette solo durante il build.

#### Opzione 1: Redeploy automatico
1. Vai su **Deployments**
2. Trova l'ultimo deployment
3. Clicca sui tre puntini `...`
4. Seleziona **Redeploy**

#### Opzione 2: Redeploy con commit vuoto
```bash
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

---

## Verifica

Dopo aver:
1. ✅ Eseguito la query SQL su Supabase
2. ✅ Aggiunto la variabile `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN` su Vercel
3. ✅ Fatto un nuovo deploy

Prova:
- 🔄 Fai logout
- 🔑 Fai login con `lucacorrao1996@gmail.com`
- ✅ NON dovresti più vedere la scelta del ruolo
- ✅ Dovresti vedere direttamente la Home
- 📸 Prova a caricare un post con foto

---

## Se il problema persiste

### Cancella la cache del browser su iPhone
1. **Safari** → Impostazioni
2. **Safari** → Avanzate
3. **Dati dei siti web**
4. **Rimuovi tutti i dati dei siti web**

### Verifica variabili d'ambiente
Su Vercel, assicurati di avere ENTRAMBE:
- `NEW_BLOB_READ_WRITE_TOKEN` (per server-side)
- `NEXT_PUBLIC_NEW_BLOB_READ_WRITE_TOKEN` (per client-side)

Con lo stesso valore: `vercel_blob_rw_47zgK9jcaZwcFsnp_hF2gz9YV4w3HMxQ9Rn6HDq5jurZPkr`




