import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export const createSupabaseClient = () => {
  // createClientComponentClient() dovrebbe automaticamente leggere i cookie
  // e sincronizzare il token JWT di Supabase dalla sessione NextAuth
  const client = createClientComponentClient()
  
  // Verifica che il client abbia accesso all'autenticazione
  // Se no, potrebbe essere un problema con i cookie
  return client
}

export const createSupabaseServerClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}






