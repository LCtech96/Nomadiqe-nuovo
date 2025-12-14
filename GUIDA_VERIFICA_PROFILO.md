# 📋 Guida: Come Verificare se un Profilo Esiste nel Database

## 🔍 Risultato della Verifica

**Stato attuale:**
- ✅ **Utente esiste** in `auth.users` 
  - Email: `lucacorrao1996@gmail.com`
  - User ID: `503217f5-274a-4a32-b3d9-873276e5e316`
  - Creato: 22 novembre 2025

- ❌ **Profilo NON esiste** in `public.profiles`
  - Devi completare l'onboarding!

---

## 🛠️ Come Verificare Manualmente

### Metodo 1: Query Semplice (Consigliato)

1. Vai su **Supabase Dashboard** → **SQL Editor**
2. Copia e incolla questa query:

```sql
-- MODIFICA QUI l'email da cercare
WITH user_check AS (
  SELECT 
    id,
    email,
    created_at as user_created_at
  FROM auth.users
  WHERE email = 'lucacorrao1996@gmail.com'  -- MODIFICA QUI
)
SELECT 
  uc.id as user_id,
  uc.email,
  uc.user_created_at,
  p.id as profile_id,
  p.username,
  p.full_name,
  p.role,
  p.avatar_url,
  p.bio,
  p.created_at as profile_created_at,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ PROFILO ESISTE'
    ELSE '❌ PROFILO NON ESISTE - Completa l''onboarding!'
  END as stato
FROM user_check uc
LEFT JOIN public.profiles p ON uc.id = p.id;
```

3. Modifica l'email alla riga 6
4. Clicca su **Run**

### Metodo 2: Verificare Tutti gli Utenti

Per vedere tutti gli utenti e i loro profili:

```sql
SELECT 
  u.id as user_id,
  u.email,
  p.username,
  p.full_name,
  p.role,
  p.created_at,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ ESISTE'
    ELSE '❌ NON ESISTE'
  END as stato
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
```

### Metodo 3: Verificare per User ID

Se hai l'User ID (UUID) che vedi negli errori:

```sql
SELECT 
  u.id as user_id,
  u.email,
  p.username,
  p.full_name,
  p.role,
  CASE 
    WHEN p.id IS NOT NULL THEN '✅ PROFILO ESISTE'
    ELSE '❌ PROFILO NON ESISTE'
  END as stato
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.id = '503217f5-274a-4a32-b3d9-873276e5e316';  -- MODIFICA QUI
```

---

## 📁 File Creati per Te

Ho creato due file SQL nella cartella `supabase/`:

1. **`VERIFICA_PROFILO_SEMPLICE.sql`** - Query semplice e veloce
2. **`VERIFICA_PROFILO_UTENTE.sql`** - Query completa con tutti i dettagli

Puoi aprire questi file e modificarli con la tua email, poi eseguirli su Supabase.

---

## ✅ Cosa Fare Se il Profilo Non Esiste

Se il profilo non esiste, significa che:

1. ✅ L'utente è registrato (esiste in `auth.users`)
2. ❌ Ma non ha completato l'onboarding (manca in `public.profiles`)

**Soluzione:**
- Quando accedi all'applicazione, verrai automaticamente reindirizzato a `/onboarding`
- Completa il processo di onboarding per creare il profilo
- Dopo l'onboarding, il profilo verrà creato automaticamente

---

## 🔄 Cosa Succede Ora

1. **Quando accedi** con `lucacorrao1996@gmail.com`:
   - Il sistema rileva che non hai un profilo
   - Ti reindirizza automaticamente a `/onboarding`
   - Completi la registrazione del profilo
   - Il profilo viene creato nel database

2. **Dopo l'onboarding**:
   - Potrai accedere normalmente
   - Il profilo esisterà nel database
   - Non vedrai più gli errori 406 o PGRST116

---

## 🚀 Test dell'Applicazione

Ora puoi testare:

1. **Accedi** all'applicazione con `lucacorrao1996@gmail.com`
2. **Verrai reindirizzato** a `/onboarding` automaticamente
3. **Completa l'onboarding** scegliendo il tuo ruolo (Host, Creator, Traveler, o Manager)
4. **Dopo l'onboarding**, il profilo verrà creato e potrai usare l'app

---

## 💡 Note Importanti

- Le **RLS policies** sono state corrette ✅
- Il **constraint del ruolo** include tutti e 4 i ruoli ✅
- Il sistema gestisce correttamente i profili mancanti ✅
- Gli errori 406 e PGRST116 sono stati risolti ✅

Se hai problemi, esegui di nuovo la query di verifica per controllare lo stato del profilo!




