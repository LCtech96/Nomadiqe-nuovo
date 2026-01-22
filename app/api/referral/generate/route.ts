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

    if (profile.role !== "host") {
      return NextResponse.json(
        { error: "Solo gli host possono generare codici referral" },
        { status: 403 }
      )
    }

    // Genera o recupera codice referral
    const { data: referralCode, error: referralError } = await supabase
      .rpc("get_or_create_host_referral_code", {
        p_host_id: session.user.id,
      })

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
