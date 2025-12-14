-- ============================================
-- ELIMINA PROFILO UTENTE COMPLETO (VERSIONE CORRETTA)
-- ============================================
-- IMPORTANTE: Sostituisci 'EMAIL_UTENTE' con l'email dell'utente da eliminare
-- ============================================

-- Trova l'ID utente dall'email
DO $$
DECLARE
  user_id_to_delete UUID;
  user_email TEXT := 'lucacorrao1996@gmail.com'; -- MODIFICA QUI con l'email dell'utente
  posts_has_author_id BOOLEAN;
  posts_has_creator_id BOOLEAN;
BEGIN
  -- Trova l'ID utente dall'email in auth.users
  SELECT id INTO user_id_to_delete
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'Utente con email % non trovato', user_email;
  END IF;
  
  RAISE NOTICE 'Trovato utente con ID: %', user_id_to_delete;
  
  -- Verifica quale colonna esiste nella tabella posts
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
  
  -- Elimina i dati in ordine (dalle tabelle dipendenti alle principali)
  
  -- 1. Elimina collaborazioni
  EXECUTE format('DELETE FROM public.collaborations WHERE host_id = %L OR creator_id = %L', user_id_to_delete, user_id_to_delete);
  
  -- 2. Elimina post (usa la colonna che esiste)
  IF posts_has_author_id THEN
    EXECUTE format('DELETE FROM public.posts WHERE author_id = %L', user_id_to_delete);
    RAISE NOTICE 'Post eliminati usando author_id';
  ELSIF posts_has_creator_id THEN
    EXECUTE format('DELETE FROM public.posts WHERE creator_id = %L', user_id_to_delete);
    RAISE NOTICE 'Post eliminati usando creator_id';
  ELSE
    RAISE NOTICE 'Nessuna colonna author_id o creator_id trovata nella tabella posts, salto l''eliminazione dei post';
  END IF;
  
  -- 3. Elimina proprietà
  EXECUTE format('DELETE FROM public.properties WHERE owner_id = %L', user_id_to_delete);
  
  -- 4. Elimina messaggi
  EXECUTE format('DELETE FROM public.messages WHERE sender_id = %L OR receiver_id = %L', user_id_to_delete, user_id_to_delete);
  
  -- 5. Elimina profilo
  EXECUTE format('DELETE FROM public.profiles WHERE id = %L', user_id_to_delete);
  
  -- 6. Elimina utente da auth.users
  EXECUTE format('DELETE FROM auth.users WHERE id = %L', user_id_to_delete);
  
  RAISE NOTICE 'Utente % eliminato con successo!', user_email;
END $$;

-- ============================================
-- FINE
-- ============================================




