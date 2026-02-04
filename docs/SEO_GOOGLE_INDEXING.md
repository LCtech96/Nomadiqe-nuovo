# Guida SEO e Indicizzazione Google - Nomadiqe

Questa guida ti accompagna passo passo per far apparire **Nomadiqe** su Google quando qualcuno cerca "nomadiqe" o termini correlati.

---

## ✅ Cosa è già configurato nel progetto

1. **Sitemap XML** – `/sitemap.xml` – elenca tutte le pagine pubbliche
2. **Robots.txt** – `/robots.txt` – dice a Google cosa indicizzare e cosa no
3. **Meta tag** – title, description, Open Graph, Twitter Card
4. **Schema.org JSON-LD** – dati strutturati per Google (WebSite + SearchAction)
5. **Manifest** – `/manifest.json` – per PWA e ricerche
6. **Canonical URL** – `https://www.nomadiqe.com`

---

## 1. Google Search Console

### 1.1 Aggiungi la proprietà

1. Vai su: **https://search.google.com/search-console**
2. Clicca **"Aggiungi proprietà"**
3. Seleziona **"Prefisso URL"** e inserisci: `https://www.nomadiqe.com`
4. Verifica la proprietà scegliendo uno di questi metodi:
   - **Tag HTML** – aggiungi il meta tag nella pagina (se non c’è già)
   - **File HTML** – carica un file in `/public`
   - **Google Analytics** – se hai GA4 collegato
   - **DNS** – record TXT sul dominio (se hai accesso DNS)

### 1.2 Invia la sitemap

1. In Search Console → **Sitemap** (menu laterale)
2. In "Aggiungi una nuova sitemap" inserisci: `sitemap.xml`
3. Clicca **Invia**
4. Dopo qualche ora/d giorno vedrai lo stato di indicizzazione

---

## 2. Google Business Profile (account già creato)

### 2.1 Collega il sito web

1. Vai su **https://business.google.com**
2. Seleziona il profilo Nomadiqe
3. **Info** → **Sito web** → inserisci `https://www.nomadiqe.com`
4. Assicurati che l’indirizzo e i dati di contatto siano corretti

### 2.2 Post e aggiornamenti

- Pubblica regolarmente post su Business Profile per migliorare visibilità
- Usa parole chiave come "Nomadiqe", "viaggio", "KOL&BED", "host", "creator"

---

## 3. Richiesta di indicizzazione manuale

### 3.1 URL Inspection

1. In Search Console → **Controllo URL**
2. Inserisci: `https://www.nomadiqe.com`
3. Clicca **Richiedi indicizzazione**
4. Ripeti per le pagine più importanti, ad esempio:
   - `https://www.nomadiqe.com/explore`
   - `https://www.nomadiqe.com/kol-bed`
   - `https://www.nomadiqe.com/kol-bed/hosts`
   - `https://www.nomadiqe.com/kol-bed/creators`

---

## 4. Controlli tecnici

### 4.1 Verifica che funzionino

Dopo il deploy, controlla:

- **Sitemap**: https://www.nomadiqe.com/sitemap.xml
- **Robots**: https://www.nomadiqe.com/robots.txt
- **Manifest**: https://www.nomadiqe.com/manifest.json

### 4.2 Redirect e HTTPS

- Tutti gli URL devono essere in **HTTPS**
- Se usi sia `nomadiqe.com` che `www.nomadiqe.com`, configura un redirect 301 da uno all’altro (es. da `nomadiqe.com` → `www.nomadiqe.com`)

---

## 5. Variabili d’ambiente (opzionale)

Se il sito non è su `www.nomadiqe.com`, imposta in Vercel:

```env
NEXT_PUBLIC_APP_URL=https://www.nomadiqe.com
```

 così `lib/seo.ts` userà l’URL corretto.

---

## 6. Tempi di indicizzazione

- **Prime pagine**: da qualche ora a 1–2 giorni
- **Tutta la sitemap**: circa 1–2 settimane
- La ricerca **"nomadiqe"** può comparire in 1–7 giorni se la brand è usata in modo coerente sul sito

---

## 7. Checklist finale

- [ ] Proprietà aggiunta e verificata su Google Search Console
- [ ] Sitemap inviata e processata senza errori
- [ ] Richiesta di indicizzazione per la homepage
- [ ] Google Business Profile con sito web collegato
- [ ] HTTPS attivo su tutto il sito
- [ ] Redirect corretto tra dominio con/senza www

---

## Riferimenti

- [Google Search Console](https://search.google.com/search-console)
- [Google Business Profile](https://business.google.com)
- [Documentazione SEO di Google](https://developers.google.com/search/docs)
