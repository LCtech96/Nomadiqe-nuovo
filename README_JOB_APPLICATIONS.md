# Job Applications - Come leggere le candidature

## Database

Le candidature vengono salvate nella tabella `job_applications` su Supabase.

## Come visualizzare le candidature

### Opzione 1: Tramite Supabase Dashboard (Raccomandato)

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto
3. Vai su **Table Editor** nel menu laterale
4. Seleziona la tabella `job_applications`
5. Vedrai tutte le candidature con:
   - Position (posizione per cui si è candidato)
   - first_name, last_name (nome e cognome)
   - email (email del candidato)
   - phone_country_code, phone_number (numero di telefono con prefisso)
   - description (motivazione della candidatura)
   - cv_url (URL del PDF del curriculum caricato su Vercel Blob)
   - created_at (data di invio)
   - status (pending, reviewed, contacted, rejected)

### Opzione 2: Tramite SQL Query

Puoi eseguire query SQL direttamente nel Supabase SQL Editor:

```sql
-- Vedi tutte le candidature
SELECT * FROM job_applications ORDER BY created_at DESC;

-- Candidature per posizione specifica
SELECT * FROM job_applications WHERE position = 'cto' ORDER BY created_at DESC;

-- Candidature recenti (ultime 30 giorni)
SELECT * FROM job_applications 
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Candidature in attesa di revisione
SELECT * FROM job_applications WHERE status = 'pending' ORDER BY created_at DESC;
```

### Opzione 3: Esporta in CSV

1. Vai su Supabase Dashboard → Table Editor → job_applications
2. Clicca sul pulsante **Export** (in alto a destra)
3. Scegli il formato CSV
4. Scarica il file con tutte le candidature

## Struttura della Tabella

```sql
- id: UUID (chiave primaria)
- position: TEXT (posizione: 'client-success-manager', 'sales', 'marketing', 'cto', 'vp-business-development', 'spontaneous')
- first_name: TEXT
- last_name: TEXT
- email: TEXT
- phone_country_code: TEXT (es: '+39', '+1')
- phone_number: TEXT
- description: TEXT (motivazione)
- cv_url: TEXT (URL del PDF su Vercel Blob, nullable)
- created_at: TIMESTAMPTZ
- status: TEXT ('pending', 'reviewed', 'contacted', 'rejected')
```

## Note Importanti

- ⚠️ **Sicurezza**: La tabella ha RLS abilitato. Solo il service role può inserire e leggere le candidature tramite l'API route.
- 📁 **CV**: I CV vengono salvati su Vercel Blob nello storage `job-applications/` con nome file `{timestamp}-{nome-file-originale}`
- 📧 **Email**: Controlla periodicamente le candidature e aggiorna lo status per tener traccia del processo di selezione

