-- ============================================
-- ELIMINA PROFILO UTENTE COMPLETO - VERSIONE FINALE
-- ============================================
-- Questa versione verifica automaticamente quale colonna esiste
-- ============================================
-- IMPORTANTE: Modifica l'email alla riga 13 con l'email dell'utente da eliminare
-- ============================================

DO $$
DECLARE
  user_id_to_delete UUID;
  user_email TEXT := 'lucacorrao1996@gmail.com'; -- MODIFICA QUI con l'email dell'utente
  
  -- Variabili per verificare quali colonne esistono
  posts_has_author_id BOOLEAN;
  posts_has_creator_id BOOLEAN;
  properties_has_owner_id BOOLEAN;
  properties_has_host_id BOOLEAN;
BEGIN
  -- Trova l'ID utente dall'email
  SELECT id INTO user_id_to_delete
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'Utente con email % non trovato', user_email;
  END IF;
  
  RAISE NOTICE 'Trovato utente con ID: %', user_id_to_delete;
  
  -- Verifica quali colonne esistono nelle tabelle
  
  -- Verifica colonna per posts
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'author_id'
  ) INTO posts_has_author_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'posts' 
    AND column_name = 'creator_id'
  ) INTO posts_has_creator_id;
  
  -- Verifica colonna per properties
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'owner_id'
  ) INTO properties_has_owner_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'properties' 
    AND column_name = 'host_id'
  ) INTO properties_has_host_id;
  
  RAISE NOTICE 'Colonne trovate - Posts author_id: %, creator_id: %', posts_has_author_id, posts_has_creator_id;
  RAISE NOTICE 'Colonne trovate - Properties owner_id: %, host_id: %', properties_has_owner_id, properties_has_host_id;
  
  -- Elimina i dati in ordine (dalle tabelle dipendenti alle principali)
  
  -- 1. Elimina collaborazioni
  EXECUTE format('DELETE FROM public.collaborations WHERE host_id = %L OR creator_id = %L', user_id_to_delete, user_id_to_delete);
  RAISE NOTICE 'Collaborazioni eliminate';
  
  -- 2. Elimina post (usa la colonna che esiste)
  IF posts_has_author_id THEN
    EXECUTE format('DELETE FROM public.posts WHERE author_id = %L', user_id_to_delete);
    RAISE NOTICE 'Post eliminati usando author_id';
  ELSIF posts_has_creator_id THEN
    EXECUTE format('DELETE FROM public.posts WHERE creator_id = %L', user_id_to_delete);
    RAISE NOTICE 'Post eliminati usando creator_id';
  ELSE
    RAISE NOTICE 'ATTENZIONE: Nessuna colonna trovata per posts, salto eliminazione';
  END IF;
  
  -- 3. Elimina proprietà (usa la colonna che esiste)
  IF properties_has_owner_id THEN
    EXECUTE format('DELETE FROM public.properties WHERE owner_id = %L', user_id_to_delete);
    RAISE NOTICE 'Proprietà eliminate usando owner_id';
  ELSIF properties_has_host_id THEN
    EXECUTE format('DELETE FROM public.properties WHERE host_id = %L', user_id_to_delete);
    RAISE NOTICE 'Proprietà eliminate usando host_id';
  ELSE
    RAISE NOTICE 'ATTENZIONE: Nessuna colonna trovata per properties, salto eliminazione';
  END IF;
  
  -- 4. Elimina messaggi (se la tabella esiste)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    EXECUTE format('DELETE FROM public.messages WHERE sender_id = %L OR receiver_id = %L', user_id_to_delete, user_id_to_delete);
    RAISE NOTICE 'Messaggi eliminati';
  ELSE
    RAISE NOTICE 'Tabella messages non esiste, salto eliminazione';
  END IF;
  
  -- 5. Elimina profilo
  EXECUTE format('DELETE FROM public.profiles WHERE id = %L', user_id_to_delete);
  RAISE NOTICE 'Profilo eliminato';
  
  -- 6. Elimina utente da auth.users
  EXECUTE format('DELETE FROM auth.users WHERE id = %L', user_id_to_delete);
  RAISE NOTICE 'Utente eliminato da auth.users';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Utente % eliminato con successo!', user_email;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- FINE
-- ============================================

