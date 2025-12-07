-- ============================================
-- FIX COMPLETO PROFILO lucacorrao1996@gmail.com
-- ============================================
-- Assicura che il profilo sia completo e corretto
-- ============================================

DO $$
DECLARE
    user_id_var UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Trova l'ID utente
    SELECT id INTO user_id_var
    FROM auth.users
    WHERE email = 'lucacorrao1996@gmail.com';

    IF user_id_var IS NULL THEN
        RAISE EXCEPTION 'Utente con email lucacorrao1996@gmail.com non trovato in auth.users';
    END IF;

    RAISE NOTICE 'Utente trovato con ID: %', user_id_var;

    -- Verifica se esiste il profilo
    SELECT EXISTS(
        SELECT 1 FROM public.profiles WHERE id = user_id_var
    ) INTO profile_exists;

    IF profile_exists THEN
        -- Aggiorna il profilo esistente assicurandosi che abbia tutti i campi necessari
        UPDATE public.profiles
        SET 
            role = COALESCE(role, 'host'),
            email = 'lucacorrao1996@gmail.com',
            onboarding_completed = true,
            updated_at = NOW()
        WHERE id = user_id_var;
        
        RAISE NOTICE '✅ Profilo aggiornato con ruolo host e onboarding completato';
    ELSE
        -- Crea il profilo
        INSERT INTO public.profiles (
            id,
            email,
            role,
            onboarding_completed,
            created_at,
            updated_at
        ) VALUES (
            user_id_var,
            'lucacorrao1996@gmail.com',
            'host',
            true,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE '✅ Profilo creato con ruolo host';
    END IF;

    -- Mostra il risultato
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Profilo aggiornato con successo!';
    RAISE NOTICE '========================================';

END $$;

-- Verifica il risultato
SELECT 
    id,
    email,
    username,
    full_name,
    role,
    onboarding_completed,
    created_at,
    updated_at
FROM public.profiles 
WHERE email = 'lucacorrao1996@gmail.com';

