# 📋 Istruzioni: Tracciamento Stato Onboarding

## 🎯 Obiettivo

Salvare lo stato dell'onboarding ad ogni step e permettere all'utente di continuare dall'ultimo step completato quando riaccede.

---

## 📝 Step 1: Esegui lo Script SQL

Vai su **Supabase Dashboard** → **SQL Editor** e esegui il file:
**`supabase/ADD_ONBOARDING_TRACKING.sql`**

Questo aggiunge:
- ✅ `onboarding_status` (JSONB) - per tracciare lo step corrente e i dati salvati
- ✅ `onboarding_completed` (BOOLEAN) - per indicare se l'onboarding è completato

---

## 🔧 Step 2: Modifiche Frontend (da fare)

Dopo aver eseguito lo script SQL, modificherò il frontend per:

1. **Salvare lo stato** ad ogni step dell'onboarding
2. **Riprendere** dall'ultimo step quando l'utente riaccede
3. **Salvare i dati** parziali inseriti

---

## 📊 Struttura dello Stato

Lo stato viene salvato in `onboarding_status` (JSONB):

```json
{
  "current_step": "property",
  "completed_steps": ["role", "profile"],
  "profile": {
    "full_name": "...",
    "username": "...",
    "avatar_url": "..."
  },
  "property": {
    "name": "...",
    "address": "...",
    ...
  }
}
```

---

**Vuoi che proceda con le modifiche al frontend dopo che hai eseguito lo script SQL?**




