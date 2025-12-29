# ✅ FIX: Aggiungi Colonne Mancanti per Creazione Proprietà

## 🔴 **Problema**

Quando provi a creare una proprietà, vedi l'errore:
```
Could not find the 'location_data' column of 'properties' in the schema cache
```

Il frontend usa colonne che non esistono nel database:
- ❌ `title` (il frontend usa questo, il database ha `name`)
- ❌ `location_data` (JSONB che contiene tutti i dati di localizzazione)

---

## ✅ **Soluzione**

Ho creato una query SQL che:
1. ✅ Aggiunge la colonna `title`
2. ✅ Aggiunge la colonna `location_data` (JSONB)
3. ✅ Copia i dati esistenti da `name` a `title`
4. ✅ Popola `location_data` con i dati esistenti dalle colonne separate

---

## 📋 **Cosa Fare**

### **PASSO 1: Esegui la Query SQL**

1. **Vai su**: [Supabase SQL Editor](https://supabase.com/dashboard/project/umodgqcplvwmhfagihhu/sql)

2. **Apri il file**: `AGGIUNGI_COLONNE_MANCANTI_PROPERTIES.sql`

3. **Copia e incolla** tutta la query nel SQL Editor

4. **Clicca "Run"**

### **PASSO 2: Verifica Risultato**

Dopo aver eseguito la query, dovresti vedere:
- ✅ `title ESISTE`
- ✅ `location_data ESISTE`

### **PASSO 3: Attendi e Testa**

1. **Attendi 10-30 secondi** dopo l'esecuzione della query
2. **Hard refresh del browser** (Ctrl+Shift+R)
3. **Prova a creare una proprietà** di nuovo

**✅ Dovrebbe funzionare!**

---

## 🔍 **Cosa Fa la Query**

La query SQL:

1. **Aggiunge `title`**:
   - Crea la colonna `title` (TEXT)
   - Copia i dati da `name` se esistono

2. **Aggiunge `location_data`**:
   - Crea la colonna `location_data` (JSONB)
   - Popola con i dati esistenti da: `property_type`, `address`, `city`, `country`, `latitude`, `longitude`, `price_per_night`, `max_guests`, `bedrooms`, `bathrooms`

3. **Aggiorna cache PostgREST**:
   - Notifica PostgREST di ricaricare lo schema

---

## 📊 **Struttura `location_data`**

La colonna `location_data` sarà un JSONB con questa struttura:

```json
{
  "property_type": "apartment",
  "address": "Via...",
  "city": "Roma",
  "country": "Italy",
  "latitude": 41.9028,
  "longitude": 12.4964,
  "price_per_night": 79.99,
  "max_guests": 3,
  "bedrooms": 1,
  "bathrooms": 1
}
```

---

## 🚨 **Se Vedi Errori**

### **Errore: "column already exists"**

**Soluzione**: Significa che la colonna esiste già. La query gestisce questo caso automaticamente, quindi va bene!

### **Errore: "could not find column" ancora**

**Soluzione**: 
1. Attendi 30-60 secondi dopo la query
2. Hard refresh del browser (Ctrl+Shift+R)
3. Controlla che la query sia stata eseguita con successo

---

**Esegui la query e dimmi se funziona!** 🚀





