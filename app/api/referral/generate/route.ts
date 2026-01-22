import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Verifica che l'utente sia un host
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profilo non trovato" },
        { status: 404 }
      )
    }

    if (profile.role !== "host" && profile.role !== "creator") {
      return NextResponse.json(
        { error: "Solo host e creator possono generare codici referral" },
        { status: 403 }
      )
    }

    // Genera o recupera codice referral in base al ruolo
    let referralCode: string
    let referralError: any

    if (profile.role === "host") {
      const result = await supabase.rpc("get_or_create_host_referral_code", {
        p_host_id: session.user.id,
      })
      referralCode = result.data
      referralError = result.error
    } else {
      // creator
      const result = await supabase.rpc("get_or_create_creator_referral_code", {
        p_creator_id: session.user.id,
      })
      referralCode = result.data
      referralError = result.error
    }

    if (referralError) {
      console.error("Error generating referral code:", referralError)
      return NextResponse.json(
        { error: referralError.message || "Errore nella generazione del codice" },
        { status: 500 }
      )
    }

    return NextResponse.json({ referralCode })
  } catch (error: any) {
    console.error("Error in generate referral API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
