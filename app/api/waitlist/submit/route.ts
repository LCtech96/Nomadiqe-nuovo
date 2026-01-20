import { NextRequest, NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const buildConfirmationEmail = () => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 32px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <h1 style="margin: 0 0 12px; font-size: 24px; color: #111827;">Grazie per esserti registrato!</h1>
        <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
          La tua richiesta di accesso alla waitlist esclusiva di Nomadiqe è stata ricevuta con successo.
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.6;">
          Ti contatteremo nelle prossime settimane per aggiornarti sullo stato della tua richiesta e comunicarti se sei stato selezionato per accedere all'ecosistema Nomadiqe.
        </p>
        <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px; color: #1f2937; line-height: 1.6;">
            <strong>Prossimi passi:</strong> Ti invitiamo a controllare la tua casella email (anche la cartella spam) nelle prossime <strong>2-4 settimane</strong>. Ti comunicheremo se sei stato selezionato e ti è stato dato accesso all'ecosistema Nomadiqe.
          </p>
        </div>
        <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
          Nel frattempo, seguici sui nostri canali social per rimanere aggiornato sulle novità e le iniziative esclusive.
        </p>
        <p style="margin: 28px 0 0; font-size: 14px; color: #9ca3af;">
          A presto,<br />
          <strong>Il Team Nomadiqe</strong>
        </p>
      </div>
    </div>
  `
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      phone_number,
      country,
      role,
    } = body

    if (!email || !phone_number || !role) {
      return NextResponse.json(
        { error: "Email, numero di cellulare e ruolo sono obbligatori" },
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

    // Validate role
    const validRoles = ["traveler", "host", "creator", "manager"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Ruolo non valido" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()
    const normalizedEmail = String(email).trim().toLowerCase()
    let isDuplicate = false

    // Prepare insert data - make country optional if column doesn't exist yet
    const insertData: any = {
      full_name: "",
      email: normalizedEmail,
      username: "",
      phone_number: String(phone_number).trim(),
      role: String(role).trim(),
      status: "pending",
    }

    if (country) {
      insertData.country = String(country).trim()
    }

    const insertResult = await supabase
      .from("waitlist_requests")
      .insert(insertData)
      .select()

    if (insertResult.error) {
      console.error("Error inserting waitlist request:", insertResult.error)

      if (
        insertResult.error.message?.includes("column") &&
        insertResult.error.message?.includes("country")
      ) {
        // Retry without country if column is missing
        const retryResult = await supabase
          .from("waitlist_requests")
          .insert({
            full_name: "",
            email: normalizedEmail,
            username: "",
            phone_number: String(phone_number).trim(),
            role: String(role).trim(),
            status: "pending",
          })
          .select()

        if (retryResult.error) {
          if (retryResult.error.code === "23505") {
            isDuplicate = true
          } else {
            return NextResponse.json(
              { error: `Errore nel salvataggio: ${retryResult.error.message || "Errore sconosciuto"}` },
              { status: 500 }
            )
          }
        }
      } else if (insertResult.error.code === "23505") {
        isDuplicate = true
      } else {
        return NextResponse.json(
          { error: `Errore nel salvataggio: ${insertResult.error.message || "Errore sconosciuto"}` },
          { status: 500 }
        )
      }
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY non configurata" },
        { status: 500 }
      )
    }

    const fromEmail =
      process.env.EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "noreply@nomadiqe.com"

    // Always try to send email, but don't fail the request if it fails
    let emailSent = false
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: normalizedEmail,
          subject: "Nomadiqe — Registrazione Waitlist completata",
          html: buildConfirmationEmail(),
        }),
      })

      if (emailResponse.ok) {
        emailSent = true
        console.log("Confirmation email sent successfully to:", normalizedEmail)
      } else {
        const errorText = await emailResponse.text()
        console.error("Resend error:", errorText)
        // Log but don't fail - the request is already saved
      }
    } catch (emailError) {
      console.error("Resend exception:", emailError)
      // Log but don't fail - the request is already saved
    }

    // Always return success if the request was saved, even if email failed
    // The email is sent asynchronously and is not critical for the registration
    return NextResponse.json({ 
      success: true, 
      duplicate: isDuplicate, 
      emailSent 
    })
  } catch (error: any) {
    console.error("Error in waitlist submit API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
