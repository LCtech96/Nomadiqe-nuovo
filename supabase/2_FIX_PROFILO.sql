-- ============================================
-- PASSO 2: FIX PROFILO
-- ============================================

DO $$
DECLARE
    user_id_var UUID;
BEGIN
    -- Trova l'ID utente
    SELECT id INTO user_id_var
    FROM auth.users
    WHERE email = 'lucacorrao1996@gmail.com';

    IF user_id_var IS NULL THEN
        RAISE EXCEPTION 'Utente non trovato';
    END IF;

    -- Aggiorna o inserisci profilo
    INSERT INTO public.profiles (
        id,
        email,
        username,
        full_name,
        role,
        onboarding_completed,
        created_at,
        updated_at
    ) VALUES (
        user_id_var,
        'lucacorrao1996@gmail.com',
        'lucacorrao1996',
        'Luca Corrao',
        'host',
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'host',
        email = 'lucacorrao1996@gmail.com',
        onboarding_completed = true,
        updated_at = NOW();
END $$;

-- Verifica il risultato
SELECT 
    id,
    email,
    username,
    full_name,
    role,
    onboarding_completed
FROM public.profiles 
WHERE email = 'lucacorrao1996@gmail.com';




