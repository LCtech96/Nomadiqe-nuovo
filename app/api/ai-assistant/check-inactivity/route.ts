import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendInactivityMessage } from "@/lib/ai-messages"

// Crea un client Supabase con service role key per bypassare RLS
function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseServiceKey) {
    const { createSupabaseServerClient } = require("@/lib/supabase/server")
    return createSupabaseServerClient()
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * API route per controllare utenti inattivi e inviare solleciti
 * Può essere chiamata da un cron job esterno (es. Vercel Cron, GitHub Actions, etc.)
 * 
 * Controlla gli utenti che non hanno interagito con l'app per almeno 1 ora
 * e invia loro un messaggio di sollecito personalizzato in base al loro ruolo
 */
export async function GET(request: Request) {
  try {
    // Verifica che la richiesta provenga da una fonte autorizzata
    // (opzionale: aggiungi autenticazione con API key)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const supabase = createSupabaseAdminClient()
    
    // Trova utenti inattivi da almeno 1 ora (ma non più di 24 ore per evitare spam)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: inactiveUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, role, username, full_name, last_activity")
      .not("role", "is", null) // Solo utenti con ruolo assegnato
      .lt("last_activity", oneHourAgo) // Inattivi da almeno 1 ora
      .gte("last_activity", twentyFourHoursAgo) // Ma non più di 24 ore (evita spam)
      .limit(100) // Limita a 100 utenti per chiamata per evitare overload

    if (usersError) {
      console.error("Errore nel recupero utenti inattivi:", usersError)
      return NextResponse.json({
        success: false,
        error: "Impossibile recuperare utenti inattivi",
        details: usersError.message,
      }, { status: 500 })
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nessun utente inattivo trovato",
        usersProcessed: 0,
      })
    }

    // Conta quante ore di inattività per ciascun utente
    const now = Date.now()
    let usersProcessed = 0
    const errors: string[] = []

    for (const user of inactiveUsers) {
      try {
        const lastActivity = new Date(user.last_activity).getTime()
        const hoursInactive = Math.floor((now - lastActivity) / (60 * 60 * 1000))

        // Invia messaggio di sollecito
        await sendInactivityMessage(
          user.id,
          user.role as "traveler" | "host" | "creator" | "jolly",
          user.username || undefined,
          user.full_name || undefined,
          hoursInactive
        )

        usersProcessed++
      } catch (error: any) {
        console.error(`Errore nell'invio del messaggio a ${user.id}:`, error)
        errors.push(`${user.id}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed,
      totalUsers: inactiveUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Errore nell'API check-inactivity:", error)
    return NextResponse.json(
      { error: error.message || "Errore sconosciuto" },
      { status: 500 }
    )
  }
}

