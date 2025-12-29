import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      position,
      first_name,
      last_name,
      email,
      phone_country_code,
      phone_number,
      description,
      cv_url,
    } = body

    // Validate required fields
    if (!position || !first_name || !last_name || !email || !phone_country_code || !phone_number || !description) {
      return NextResponse.json(
        { error: "Tutti i campi obbligatori devono essere compilati" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato email non valido" },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    const supabase = createSupabaseAdminClient()

    // Insert job application
    const { data, error } = await supabase
      .from("job_applications")
      .insert({
        position,
        first_name,
        last_name,
        email,
        phone_country_code,
        phone_number,
        description,
        cv_url: cv_url || null,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      console.error("Error inserting job application:", error)
      return NextResponse.json(
        { error: "Errore nel salvataggio della candidatura" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("Error in job application API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}

