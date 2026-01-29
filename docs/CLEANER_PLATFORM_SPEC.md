# Cleaner Platform – Specifica completa

Specifica per la piattaforma Cleaner su Nomadiqe: onboarding, approvazione admin, ordini, dispatch, commissioni, rating e funzioni admin.

---

## 1. Cleaner onboarding e permessi

- I **Cleaner** possono creare il proprio profilo (nome, cognome, indirizzo, telefono, email, anni di esperienza, stato assicurazione, patente se lavorano lontano, Codice Fiscale / documento, accordo firmato).
- **Nessun lavoro accettabile** fino all’approvazione Admin.
- L’**Admin** riceve la richiesta di attivazione Cleaner e può **approvare** o **rifiutare**.
- Dopo l’approvazione, il Cleaner può accettare/rifiutare ordini.

**Flusso:** Cleaner completa profilo → richiesta approvazione → Admin approva/rifiuta → se approvato, Cleaner può lavorare.

---

## 2. Profilo Cleaner (visibile su profilo)

- **Anni di esperienza**
- **Stato assicurazione** (es. “Assicurato” / “Non assicurato” o stato per tipo)
- **Cleaner ID**: formato `XX##### D` (es. `BS00001 C`), iniziali + 5 cifre + dipartimento (es. C = Cleaning).
- **Altri campi:** nome, cognome, indirizzo, telefono, email, patente (se serve), CF/documento, accordo firmato (file caricato).

---

## 3. Notifiche

- **Cleaner:** notifica per **ogni nuovo ordine di pulizia** creato dagli host sulla piattaforma (ordini “available”).
- **Customer (Host):** notifiche quando il Cleaner è in viaggio, inizio lavoro, fine lavoro; eventuale “serve più tempo”.
- **Dispatch/Admin:** notifica quando un Cleaner **accetta** un ordine e quando **rifiuta** (prioritaria per chiamare il prossimo Cleaner).

---

## 4. Ordini (cleaning jobs)

- Gli **Host** creano **ordini di pulizia** (servizio, indirizzo, fascia oraria, ecc.).
- **Restrizioni orarie:** nessuna prenotazione **dopo le 17:00** né **prima delle 08:00**.
- **Tariffa minima:** 2 ore = **€35**. Poi **€20/ora** per ore aggiuntive.
- **Durata:** se il Cleaner lavora più ore del prenotato (es. prenotate 2h, effettive 5h), il **sistema ricalcola** il costo (es. 5h → €20×5 = €100).
- **Cancellazione:** se l’ordine è cancellato **meno di 6 ore** prima dell’inizio → **penale €35**.

---

## 5. Cleaner: accetta / rifiuta

- Il Cleaner può **accettare** o **rifiutare** un ordine.
- **Se accetta:**
  - L’ordine **esce** dagli “available jobs” e **entra** nel profilo del Cleaner (lavori assegnati).
  - Al **customer** vengono inviati **dati Cleaner** + **ETA**.
- **Se rifiuta:** l’ordine **resta** tra gli “available jobs”; Dispatch riceve notifica per assegnare un altro Cleaner.

---

## 6. Stato del lavoro e notifiche al customer

- **On the way:** Cleaner “in viaggio” → notifica al customer.
- **Started:** Cleaner “ha iniziato il lavoro” → notifica.
- **Finished:** Cleaner “ha finito” → notifica.
- **Extra time:** Cleaner può segnalare che **serve più tempo** → notifica al customer.

---

## 7. Posizione e indirizzo di servizio

- Il Cleaner **vede l’indirizzo esatto** del servizio (customer/property).
- Il sistema deve supportare il **tracking della posizione** del Cleaner per raggiungere l’indirizzo di servizio (integrazione mappe/GPS in app).

---

## 8. Checklist per tipo di servizio

- Per ogni **tipo di servizio** (es. pulizia standard, deep cleaning, post-checkout) esiste una **checklist**.
- Il Cleaner **segna** le voci della checklist per quel servizio durante l’esecuzione.

---

## 9. Foto prima / dopo

- Il Cleaner può scattare **foto prima e dopo** per **ogni sezione/area** della casa (es. cucina, bagno, soggiorno).

---

## 10. Comunicazione

- **Testo** (messaggi in-app) tra Cleaner e Customer.
- **Telefono** (numero di contatto disponibile per entrambi, es. su scheda ordine/profilo).

---

## 11. Rating

- **Sistema di rating** per i Cleaner fin dal primo utilizzo.
- Dopo il servizio, il **customer** può **valutare il Cleaner** (es. 1–5 stelle + commento opzionale).
- I rating sono **visibili** sul profilo Cleaner e **monitorabili** dall’Admin.

---

## 12. Customer (Host che ordina) – Profilo

- **Nome, Cognome**
- **Email**
- **Indirizzo** (di fatturazione / servizio)
- **Telefono**
- **Carta di credito** (per pagamenti)
- **Termini e condizioni** accettati e firmati

---

## 13. Dashboard Cleaner

- **Commission report:** il Cleaner vede il **report delle proprie commissioni**.
- **Niente KOL&BED:** al posto di “collab con creator/host”, i Cleaner vedono **tutte le richieste degli host** (ordini disponibili).
- **Filtro per regione:** i Cleaner possono filtrare gli ordini per **regione/area** in cui operano.

---

## 14. Admin – Funzioni (solo Admin)

- **Money:**
  - Quanto è stato ordinato per **giorno / settimana / mese**.
  - Quanto **ogni Cleaner** ha prodotto (fatturato).
- **Quantity of jobs:**
  - Quanti ordini sono stati **pianificati** per **regione**, per **Cleaner** e per **giorno / settimana / mese**.
- **Grafici:**
  - **Crescita / calo** delle vendite **per regione**.
- **Amount:**
  - **Vendite totali** per giorno / settimana / mese.
- **Commissioni:**
  - **Commissioni Cleaner**
  - **Commissioni Salesman**
- **Monitoring:** numeri chiari su **denaro in entrata/uscita** e **quantità ordini per giorno e per regione**.

---

## 15. Profilo Cleaner (vista Admin)

- Nome, Cognome, Indirizzo, Telefono, Email.
- **Patente** (se usata per spostamenti).
- **Codice Fiscale / documento** (es. carta d’identità).
- **Accordo Cleaner:** ogni Cleaner firma un accordo con l’azienda; **file caricato** e collegato al profilo.
- **Cleaner ID** (es. `BS00001 C`), mostrato anche nel **commission report**.
- **Rating:** monitoraggio **rating** di ogni Cleaner attraverso il sistema.

---

## 16. Full Schedule / Dispatch board

- **Vista “Full Schedule”** = **Dispatch board**.
- **Filtri:** per **data**, per **regione**.
- **Contenuto:** tutti gli **ordini** del giorno (e opzionalmente altri periodi).
- **Calendario:** spostamento **avanti/indietro** nel tempo.
- **Ordinamento:** per **ora** e per **Cleaner**.
- **Esempio:** “Cosa fa il Cleaner #BS00001 alle 11:00 di domani?” → vista per Cleaner + orario.
- **Notifiche Dispatch:**
  - Quando un Cleaner **accetta** un ordine.
  - Quando un Cleaner **rifiuta** (prioritaria, per contattare il prossimo Cleaner disponibile).

---

## 17. Riepilogo regole di business

| Regola | Dettaglio |
|--------|-----------|
| Orario prenotazioni | Solo 08:00–17:00 |
| Tariffa minima | 2 h = €35 |
| Tariffa oraria | €20/h (ore aggiuntive) |
| Adeguamento ore | Se ore effettive > prenotate, costo = €20 × ore effettive |
| Cancellazione | < 6 h prima dell’inizio → penale €35 |
| Accettazione | Ordine → tolto da “available”, associato al Cleaner |
| Rifiuto | Ordine resta “available”; notifica a Dispatch |

---

## 18. Funzionalità aggiuntive consigliate

- **Promemoria ordine:** notifica (email/push) al customer X ore prima dell’arrivo del Cleaner (es. 24h e 1h).
- **Storico ordini:** vista “Ordini passati” per Customer e Cleaner (con stato, importo, rating).
- **Blocco slot:** impedire che lo stesso Cleaner abbia due ordini overlapping (stesso orario).
- **Tipi di servizio standard:** catalogare “Pulizia standard”, “Deep cleaning”, “Post checkout”, ecc. e collegarli alle checklist.
- **Report esportabili:** Admin può esportare (CSV/Excel) report money, jobs, commissioni per analisi esterne.
- **Audit log:** chi (Admin) ha approvato quale Cleaner e quando; modifiche importanti su ordini e commissioni.

---

## 19. Fasi di implementazione (suggerite)

### Fase 1 – Base (Schema + Approvazione + Profilo)
- Ruolo `cleaner` e tabella `cleaner_profiles` (esperienza, assicurazione, Cleaner ID, accordo, ecc.).
- Richieste **approvazione Cleaner** → Admin approva/rifiuta.
- Estensione `service_requests` (o analoga “cleaning jobs”): slot orari, indirizzo, min 2h, €35/€20.
- UI minima: profilo Cleaner (anni, assicurazione), richiesta approvazione, pagina Admin “Richieste Cleaner”.

### Fase 2 – Ordini e flusso Cleaner
- Creazione ordini Host (8–17, min 2h, €35).
- “Available jobs” e assegnazione a Cleaner (accetta/rifiuta).
- Notifiche: nuovo ordine → Cleaner; accetta/rifiuta → Dispatch.
- Invio dati Cleaner + ETA al customer all’accettazione.

### Fase 3 – Stato lavoro, posizione, checklist, foto
- Stati: on the way, started, finished; notifiche al customer.
- “Serve più tempo” → notifica.
- Tracking posizione (integrazione mappe).
- Checklist per tipo servizio; foto prima/dopo per sezione.

### Fase 4 – Comunicazione, rating, pagamenti
- Messaggi Cleaner ↔ Customer; telefono su scheda ordine.
- Rating post-servizio; visibilità su profilo e in Admin.
- Integrazione pagamenti (carta, ecc.) e applicazione penale €35 su cancellazione.

### Fase 5 – Dashboard Cleaner, Commission report
- Dashboard Cleaner: available jobs con filtro regione, “i miei ordini”, link a commission report.
- Commission report per Cleaner (e dati in Admin).

### Fase 6 – Admin avanzato e Dispatch
- Dashboard Admin: money, jobs per regione/Cleaner, grafici, commissioni.
- Full Schedule / Dispatch board: calendario, filtri, notifiche accept/reject.
- Monitoring numerico (cash in/out, ordini per giorno/regione).

---

## 20. Note tecniche

- **Cleaner** come ruolo dedicato (`user_role = 'cleaner'`) o sottotipo di Jolly solo “cleaning”: da definire in base a come gestire KOL&BED vs Cleaning.
- **service_requests** può essere estesa per i cleaning job (slot, ore, tariffa, penale) oppure creare una tabella `cleaning_orders` dedicata.
- **Admin:** già presente (email-based); estendere le pagine Admin per Cleaner approval, dispatch, report.
- **Notifiche:** riuso del sistema esistente (es. `notifications` + eventuale push); tipi dedicati per cleaner/customer/dispatch.

---

---

## 21. Implementazione

- **Phase 1 migration:** `supabase/71_CLEANER_PLATFORM_PHASE1.sql`
  - Ruolo `cleaner`, tabelle `cleaner_profiles` e `cleaner_approval_requests`, funzione `generate_cleaner_id`, RLS e trigger.
  - Eseguire nello SQL Editor di Supabase prima di usare le API.
- **Phase 1 app:**
  - **Admin:** API `GET/POST /api/admin/cleaner-approvals` (list pending, approve, reject). Sezione “Richieste Cleaner” nell’Admin Panel (`/admin-panel`).
  - **Cleaner:** API `POST /api/cleaner/request-approval` (crea/aggiorna `cleaner_profiles`, invia richiesta di approvazione). Form onboarding Cleaner (anni esperienza, assicurazione, accordo, ecc.) e pagina dashboard Cleaner da implementare in seguito.
