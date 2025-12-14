import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Questo endpoint richiede la Service Role Key per creare utenti in auth.users
// NON esporre mai la Service Role Key nel frontend!

export async function POST(request: Request) {
  try {
    // Protezione: richiedi un token segreto nell'header
    const authHeader = request.headers.get("authorization")
    const expectedToken = process.env.ADMIN_API_SECRET_TOKEN || "CHANGE_THIS_IN_PRODUCTION"
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: "Non autorizzato. Token mancante o non valido." },
        { status: 401 }
      )
    }

    // Verifica che la Service Role Key sia configurata
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Service Role Key non configurata. Configura SUPABASE_SERVICE_ROLE_KEY nelle variabili d'ambiente." },
        { status: 500 }
      )
    }

    // Crea un client Supabase con Service Role Key (ha accesso admin)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Ottieni tutti i profili che non hanno un utente corrispondente in auth.users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, username")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return NextResponse.json(
        { error: "Errore nel recupero dei profili", details: profilesError.message },
        { status: 500 }
      )
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { message: "Nessun profilo trovato", created: 0 },
        { status: 200 }
      )
    }

    const results = {
      checked: profiles.length,
      created: 0,
      alreadyExists: 0,
      errors: [] as any[],
      createdUsers: [] as any[],
    }

    // Per ogni profilo, verifica se esiste in auth.users
    for (const profile of profiles) {
      try {
        // Verifica se l'utente esiste già in auth.users
        const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.getUserById(profile.id)
        
        if (existingUser && !checkError) {
          // L'utente esiste già
          results.alreadyExists++
          continue
        }

        // L'utente non esiste, crealo
        // Genera una password temporanea random (l'utente dovrà resettarla)
        const tempPassword = `Temp${Math.random().toString(36).slice(-12)}!${Math.floor(Math.random() * 1000)}`
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          id: profile.id, // Usa lo stesso ID del profilo
          email: profile.email,
          email_confirm: true, // Conferma automaticamente l'email
          user_metadata: {
            full_name: profile.full_name || profile.email.split("@")[0],
            username: profile.username || profile.email.split("@")[0],
          },
          password: tempPassword, // Password temporanea
        })

        if (createError) {
          console.error(`Error creating user ${profile.email}:`, createError)
          results.errors.push({
            email: profile.email,
            error: createError.message,
          })
        } else if (newUser?.user) {
          results.created++
          results.createdUsers.push({
            email: profile.email,
            id: newUser.user.id,
            message: "Utente creato. Deve usare 'Password dimenticata' per impostare la password.",
          })
        }
      } catch (error: any) {
        console.error(`Error processing profile ${profile.email}:`, error)
        results.errors.push({
          email: profile.email,
          error: error.message || "Errore sconosciuto",
        })
      }
    }

    return NextResponse.json({
      message: `Processati ${results.checked} profili`,
      ...results,
    })
  } catch (error: any) {
    console.error("Error in create-missing-users:", error)
    return NextResponse.json(
      { error: "Errore interno del server", details: error.message },
      { status: 500 }
    )
  }
}
