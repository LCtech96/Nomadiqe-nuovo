-- ============================================
-- CREA FUNZIONE RPC PER ELIMINARE ACCOUNT UTENTE
-- ============================================
-- Questa funzione elimina completamente un account utente e tutti i dati correlati
-- Può essere chiamata solo dall'utente stesso (verifica auth.uid())
-- ============================================

-- Elimina la funzione se esiste già
DROP FUNCTION IF EXISTS public.delete_user_account();

-- Crea la funzione RPC
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id_to_delete UUID;
BEGIN
  -- Ottieni l'ID dell'utente corrente dalla sessione
  user_id_to_delete := auth.uid();
  
  -- Verifica che l'utente sia autenticato
  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'Utente non autenticato';
  END IF;
  
  -- Verifica che il profilo esista
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id_to_delete) THEN
    RAISE EXCEPTION 'Profilo non trovato';
  END IF;
  
  RAISE NOTICE 'Inizio eliminazione account per utente: %', user_id_to_delete;
  
  -- Elimina i dati in ordine (dalle tabelle dipendenti alle principali)
  -- Nota: Le tabelle con ON DELETE CASCADE verranno eliminate automaticamente,
  -- ma è meglio essere espliciti per sicurezza
  
  -- 1. Elimina push subscriptions (OneSignal)
  DELETE FROM public.push_subscriptions WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Push subscriptions eliminate';
  
  -- 2. Elimina property likes
  DELETE FROM public.property_likes WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Property likes eliminate';
  
  -- 3. Elimina saved properties
  DELETE FROM public.saved_properties WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Saved properties eliminate';
  
  -- 4. Elimina host KOL&BED preferences
  DELETE FROM public.host_kol_bed_preferences WHERE host_id = user_id_to_delete;
  RAISE NOTICE 'Host preferences eliminate';
  
  -- 5. Elimina messaggi
  DELETE FROM public.messages WHERE sender_id = user_id_to_delete OR receiver_id = user_id_to_delete;
  RAISE NOTICE 'Messaggi eliminati';
  
  -- 6. Elimina post likes
  DELETE FROM public.post_likes WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Post likes eliminate';
  
  -- 7. Elimina post comments
  DELETE FROM public.post_comments WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Post comments eliminate';
  
  -- 8. Elimina follows (sia come follower che come following)
  DELETE FROM public.follows WHERE follower_id = user_id_to_delete OR following_id = user_id_to_delete;
  RAISE NOTICE 'Follows eliminate';
  
  -- 9. Elimina points history
  DELETE FROM public.points_history WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Points history eliminata';
  
  -- 10. Elimina daily checkins
  DELETE FROM public.daily_checkins WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Daily checkins eliminate';
  
  -- 11. Elimina social accounts
  DELETE FROM public.social_accounts WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Social accounts eliminate';
  
  -- 12. Elimina creator niches
  DELETE FROM public.creator_niches WHERE user_id = user_id_to_delete;
  RAISE NOTICE 'Creator niches eliminate';
  
  -- 13. Elimina post reposts (se la tabella esiste)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'post_reposts') THEN
    DELETE FROM public.post_reposts WHERE user_id = user_id_to_delete OR original_post_id IN (
      SELECT id FROM public.posts WHERE author_id = user_id_to_delete
    );
    RAISE NOTICE 'Post reposts eliminate';
  END IF;
  
  -- 14. Elimina posts (dove l'utente è autore)
  DELETE FROM public.posts WHERE author_id = user_id_to_delete;
  RAISE NOTICE 'Posts eliminate';
  
  -- 15. Elimina reviews PRIMA di eliminare properties (per evitare trigger che usano host_id)
  -- Elimina reviews associate alle properties dell'utente
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    DELETE FROM public.reviews WHERE reviewer_id = user_id_to_delete OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = user_id_to_delete
    );
    RAISE NOTICE 'Reviews eliminate';
  END IF;
  
  -- 16. Elimina bookings PRIMA di eliminare properties
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    DELETE FROM public.bookings WHERE traveler_id = user_id_to_delete OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = user_id_to_delete
    );
    RAISE NOTICE 'Bookings eliminate';
  END IF;
  
  -- 17. Elimina collaboration offers PRIMA di eliminare properties
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collaboration_offers') THEN
    DELETE FROM public.collaboration_offers WHERE host_id = user_id_to_delete OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = user_id_to_delete
    );
    RAISE NOTICE 'Collaboration offers eliminate';
  END IF;
  
  -- 18. Elimina collaborations PRIMA di eliminare properties
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'collaborations') THEN
    DELETE FROM public.collaborations WHERE host_id = user_id_to_delete OR creator_id = user_id_to_delete OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = user_id_to_delete
    );
    RAISE NOTICE 'Collaborations eliminate';
  END IF;
  
  -- 19. Elimina service requests PRIMA di eliminare properties - per Manager e Host
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_requests') THEN
    DELETE FROM public.service_requests WHERE manager_id = user_id_to_delete OR host_id = user_id_to_delete OR property_id IN (
      SELECT id FROM public.properties WHERE owner_id = user_id_to_delete
    );
    RAISE NOTICE 'Service requests eliminate';
  END IF;
  
  -- 20. Elimina manager services (se la tabella esiste) - per Manager
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'manager_services') THEN
    DELETE FROM public.manager_services WHERE manager_id = user_id_to_delete;
    RAISE NOTICE 'Manager services eliminate';
  END IF;
  
  -- 21. Elimina properties (dove l'utente è owner) - DOPO aver eliminato tutte le dipendenze
  -- IMPORTANTE: Elimina properties DOPO aver eliminato tutte le dipendenze per evitare trigger che usano host_id
  DELETE FROM public.properties WHERE owner_id = user_id_to_delete;
  RAISE NOTICE 'Properties eliminate';
  
  -- 23. Elimina notifications (se la tabella esiste)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DELETE FROM public.notifications WHERE user_id = user_id_to_delete OR related_user_id = user_id_to_delete;
    RAISE NOTICE 'Notifications eliminate';
  END IF;
  
  -- 24. Elimina profile views (se la tabella esiste)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profile_views') THEN
    DELETE FROM public.profile_views WHERE profile_id = user_id_to_delete OR viewer_id = user_id_to_delete;
    RAISE NOTICE 'Profile views eliminate';
  END IF;
  
  -- 25. Elimina referrals (se la tabella esiste)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'referrals') THEN
    DELETE FROM public.referrals WHERE referrer_id = user_id_to_delete OR referred_id = user_id_to_delete;
    RAISE NOTICE 'Referrals eliminate';
  END IF;
  
  -- 26. Elimina email verifications (se la tabella esiste)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_verifications') THEN
    DELETE FROM public.email_verifications WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'Email verifications eliminate';
  END IF;
  
  -- 27. Elimina nuove tabelle del sistema XP (se esistono)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'xp_rate_limits') THEN
    DELETE FROM public.xp_rate_limits WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'XP rate limits eliminate';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_streaks') THEN
    DELETE FROM public.user_streaks WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'User streaks eliminate';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_badges') THEN
    DELETE FROM public.user_badges WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'User badges eliminate';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'external_shares') THEN
    DELETE FROM public.external_shares WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'External shares eliminate';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'host_referral_xp_bonus') THEN
    DELETE FROM public.host_referral_xp_bonus WHERE referrer_host_id = user_id_to_delete OR referred_host_id = user_id_to_delete;
    RAISE NOTICE 'Host referral XP bonus eliminate';
  END IF;
  
  -- 27b. Elimina pending notifications (se la tabella esiste)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_notifications') THEN
    DELETE FROM public.pending_notifications WHERE user_id = user_id_to_delete;
    RAISE NOTICE 'Pending notifications eliminate';
  END IF;
  
  -- 28. Elimina il profilo (questo triggererà CASCADE su altre tabelle se configurate)
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  RAISE NOTICE 'Profilo eliminato';
  
  -- 29. Elimina l'utente da auth.users (questo è l'ultimo passo)
  -- Nota: Questo richiede privilegi elevati, quindi la funzione usa SECURITY DEFINER
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  RAISE NOTICE 'Utente eliminato da auth.users';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Account eliminato con successo!';
  RAISE NOTICE '========================================';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Errore durante l''eliminazione dell''account: %', SQLERRM;
END;
$$;

-- Concedi l'esecuzione della funzione agli utenti autenticati
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO anon;

-- Verifica che la funzione sia stata creata
SELECT 
    'FUNZIONE CREATA' as info,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'delete_user_account';
