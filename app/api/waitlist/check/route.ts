import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ 
        approved: false, 
        hasProfile: false,
        error: "Email mancante" 
      }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    
    // Controlla se l'email è approvata nella waitlist
    const { data: waitlistData, error: waitlistError } = await supabase
      .from("waitlist_requests")
      .select("status")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (waitlistError) {
      console.error("Error checking waitlist:", waitlistError)
      return NextResponse.json({ 
        approved: false, 
        hasProfile: false,
        error: "Errore durante la verifica della waitlist" 
      }, { status: 500 })
    }

    const isApproved = waitlistData?.status === "approved"

    // Controlla se esiste già un profilo con questa email (significa che l'utente ha già completato la registrazione)
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error checking profile:", profileError)
      // Non restituiamo errore se il profilo non esiste (PGRST116)
    }

    const hasProfile = !!profileData

    return NextResponse.json({ 
      approved: isApproved,
      hasProfile: hasProfile
    })
  } catch (error: any) {
    console.error("Error in waitlist check API:", error)
    return NextResponse.json(
      { 
        approved: false, 
        hasProfile: false,
        error: error.message || "Errore interno del server" 
      },
      { status: 500 }
    )
  }
}
