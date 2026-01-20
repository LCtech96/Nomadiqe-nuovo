import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      phone_number,
    } = body

    if (!email || !phone_number) {
      return NextResponse.json(
        { error: "Email e numero di cellulare sono obbligatori" },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato email non valido" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from("waitlist_requests")
      .insert({
        full_name: "",
        email: String(email).trim().toLowerCase(),
        username: "",
        phone_number: String(phone_number).trim(),
        role: "traveler",
        status: "pending",
      })

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Questa email è già in waitlist" },
          { status: 409 }
        )
      }

      console.error("Error inserting waitlist request:", error)
      return NextResponse.json(
        { error: "Errore nel salvataggio della richiesta" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in waitlist submit API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
