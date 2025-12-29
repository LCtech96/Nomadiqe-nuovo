# Feature: Farmacista Manager

## Riepilogo modifiche

Questa feature permette ai manager di creare servizi di tipo "Farmacista in zona" con:
- Inserimento di luogo/indirizzo con orari operativi
- Catalogo prodotti con prezzi
- Pubblicazione prodotti sul feed principale
- Possibilità per gli utenti di contattare direttamente il manager

## File modificati

1. **supabase/43_ADD_PHARMACIST_SERVICE_TYPE.sql**
   - Aggiunge "pharmacist" all'enum service_type
   - Aggiunge campi per luogo e orari a manager_services
   - Aggiunge campo publish_to_feed a supplier_products

2. **app/dashboard/manager/services/new/page.tsx**
   - Aggiunge "pharmacist" ai SERVICE_TYPES
   - Aggiunge campi per luogo e orari nel form
   - Gestisce il redirect al catalogo per farmacista

3. **app/dashboard/manager/services/[id]/catalog/page.tsx**
   - Aggiunge checkbox per pubblicare prodotti sul feed
   - Gestisce il campo publish_to_feed nel form

## SQL da eseguire

Eseguire lo script `supabase/43_ADD_PHARMACIST_SERVICE_TYPE.sql` in Supabase SQL Editor.

## TODO rimanenti

1. **Modificare il feed per mostrare prodotti pubblicati**
   - Caricare prodotti con publish_to_feed = true
   - Mostrarli come post speciali nel feed
   - Includere informazioni del manager (nome, luogo, orari)

2. **Aggiungere bottone "Contatta" nei prodotti del feed**
   - Permettere agli utenti di inviare un messaggio diretto al manager
   - Usare il componente SendMessageDialog esistente

3. **Visualizzazione prodotti nel feed**
   - Mostrare immagine, nome, prezzo
   - Mostrare informazioni del manager (nome, luogo)
   - Mostrare orari operativi se disponibili

