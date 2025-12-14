# Fix Post Likes, Share e Navigazione Post

## Problemi Risolti

### 1. ✅ Errore 404 su `increment_post_likes`
**Problema**: Quando si cliccava sul cuore per mettere like, compariva l'errore:
```
POST https://umodgqcplvwmhfagihhu.supabase.co/rest/v1/rpc/increment_post_likes 404 (Not Found)
```

**Soluzione**:
- Creato script SQL `18_FIX_RPC_FUNCTIONS_AND_REPOSTS.sql` che:
  - Aggiunge `SECURITY DEFINER` alle funzioni RPC
  - Garantisce i permessi `EXECUTE` agli utenti autenticati
  - Le funzioni ora funzionano correttamente

**File**: `supabase/18_FIX_RPC_FUNCTIONS_AND_REPOSTS.sql`

### 2. ✅ Sistema Like Migliorato
**Miglioramenti**:
- Il cuore diventa **rosso** quando l'utente mette like
- Il conteggio si aggiorna in tempo reale
- Verifica se l'utente ha già messo like quando carica i post
- Il like persiste tra i reload della pagina

**File modificato**: `app/home/page.tsx`

### 3. ✅ Funzionalità Condivisione
**Nuovo componente**: `SharePostDialog`

**Opzioni disponibili**:
1. **Condividi fuori da Nomadiqe**
   - Crea un link condivisibile
   - Supporta Web Share API (mobile)
   - Fallback: copia link negli appunti
   - Incrementa il contatore `share_count`

2. **Copia link**
   - Copia il link del post negli appunti
   - Feedback visivo quando copiato

3. **Ricondividi su Nomadiqe (Repost)**
   - Aggiunge il post al profilo dell'utente
   - Per Creator: nella sezione "repost"
   - Per Host: nella sezione "post"
   - Per Traveler: nella sezione "repost"
   - Incrementa il contatore `repost_count`

**File creato**: `components/share-post-dialog.tsx`

### 4. ✅ Pagina Singolo Post
**Problema**: Cliccando su un post da un profilo pubblico, compariva:
```
GET http://localhost:3000/posts/d79b7fc6-0ed2-42fe-990d-824fe0d29ddd 404 (Not Found)
```

**Soluzione**:
- Creata pagina `/posts/[id]/page.tsx`
- Visualizza il post completo con:
  - Informazioni autore (cliccabile)
  - Immagini del post
  - Sistema like funzionante
  - Sezione commenti
  - Pulsante condivisione
  - Pulsante indietro

**File creato**: `app/posts/[id]/page.tsx`

### 5. ✅ Sistema Repost
**Nuova tabella**: `post_reposts`
- Traccia i repost degli utenti
- Un utente può fare repost una sola volta per post
- Incrementa automaticamente `repost_count` nel post originale

**Funzioni RPC create**:
- `increment_post_reposts(post_id UUID)`
- `decrement_post_reposts(post_id UUID)`

**File**: `supabase/18_FIX_RPC_FUNCTIONS_AND_REPOSTS.sql`

## File Modificati/Creati

### Nuovi File
1. ✅ `supabase/18_FIX_RPC_FUNCTIONS_AND_REPOSTS.sql` - Fix funzioni RPC e crea sistema repost
2. ✅ `components/share-post-dialog.tsx` - Componente per condivisione post
3. ✅ `app/posts/[id]/page.tsx` - Pagina per visualizzare singoli post

### File Modificati
1. ✅ `app/home/page.tsx` - Fix sistema like e aggiunta condivisione

## Come Applicare le Modifiche

### 1. Eseguire lo Script SQL
**IMPORTANTE**: Devi eseguire lo script SQL nel database Supabase:

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Copia il contenuto di `supabase/18_FIX_RPC_FUNCTIONS_AND_REPOSTS.sql`
5. Incolla ed esegui lo script
6. Verifica che non ci siano errori

### 2. Verificare le Funzionalità

#### Test Like:
1. Vai alla home page
2. Clicca sul cuore di un post
3. Verifica che:
   - Il cuore diventa rosso
   - Il numero aumenta
   - Ricaricando la pagina, il like persiste

#### Test Condivisione:
1. Clicca sull'icona "Condividi" di un post
2. Verifica che si apra il dialog con 3 opzioni:
   - Condividi fuori da Nomadiqe
   - Copia link
   - Ricondividi su Nomadiqe

#### Test Navigazione Post:
1. Clicca su un post (immagine o link)
2. Verifica che si apra la pagina del post
3. Verifica che:
   - Il post sia visualizzato correttamente
   - Il pulsante "Indietro" funzioni
   - Like e commenti funzionino

#### Test Repost:
1. Clicca "Ricondividi su Nomadiqe" su un post
2. Vai al tuo profilo
3. Verifica che il post appaia nella sezione appropriata:
   - Creator/Traveler: sezione "repost"
   - Host: sezione "post"

## Struttura Database

### Nuova Tabella: `post_reposts`
```sql
CREATE TABLE post_reposts (
  id UUID PRIMARY KEY,
  original_post_id UUID REFERENCES posts(id),
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(original_post_id, user_id)
);
```

### Nuova Colonna: `repost_count`
Aggiunta alla tabella `posts` se non esiste già.

### Funzioni RPC Aggiornate
Tutte le funzioni RPC ora hanno `SECURITY DEFINER` per funzionare correttamente:
- `increment_post_likes`
- `decrement_post_likes`
- `increment_post_comments`
- `decrement_post_comments`
- `increment_post_shares`
- `increment_post_reposts`
- `decrement_post_reposts`

## Note Tecniche

### Sistema Like
- Usa la tabella `post_likes` per tracciare i like
- Verifica i like esistenti quando carica i post
- Aggiorna l'UI in tempo reale senza reload completo

### Sistema Repost
- I repost sono collegati al post originale
- Un utente non può fare repost dello stesso post due volte
- I repost vengono mostrati nel profilo dell'utente

### Navigazione
- Tutti i post sono ora cliccabili
- Link a `/posts/[id]` per visualizzare il post completo
- Pulsante "Indietro" su tutte le pagine di dettaglio

## Troubleshooting

### Se le funzioni RPC non funzionano:
1. Verifica di aver eseguito lo script SQL
2. Controlla che le funzioni abbiano `SECURITY DEFINER`
3. Verifica i permessi `GRANT EXECUTE`

### Se i like non persistono:
1. Verifica che la tabella `post_likes` esista
2. Controlla che le funzioni RPC siano state create
3. Verifica i log della console per errori

### Se i repost non appaiono:
1. Verifica che la tabella `post_reposts` sia stata creata
2. Controlla che la colonna `repost_count` esista in `posts`
3. Verifica che le funzioni RPC per repost siano state create

