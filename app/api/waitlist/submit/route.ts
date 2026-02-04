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
      referral_code,
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
    const validRoles = ["traveler", "host", "creator", "jolly"]
    const normalizedRole = String(role).trim().toLowerCase()
    if (!validRoles.includes(normalizedRole)) {
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
      role: normalizedRole,
      status: "pending",
    }

    if (country) {
      insertData.country = String(country).trim()
    }

    // Se c'è un referral_code, registra il referral e aggiungilo alla waitlist
    let referralHostEmail: string | null = null
    let referralCreatorEmail: string | null = null
    if (referral_code) {
      insertData.referral_code = String(referral_code).trim().toUpperCase()
      
      // Prova prima con host referral, poi con creator referral
      try {
        // Prova con host referral
        const { error: hostReferralError } = await supabase
          .rpc("register_host_referral", {
            p_referral_code: String(referral_code).trim().toUpperCase(),
            p_email: normalizedEmail,
            p_phone: String(phone_number).trim(),
            p_role: normalizedRole,
          })

        if (!hostReferralError) {
          // Ottieni l'email dell'host che ha generato il referral
          const { data: referralCodeData } = await supabase
            .from("host_referral_codes")
            .select("host_id")
            .eq("referral_code", String(referral_code).trim().toUpperCase())
            .single()

          if (referralCodeData?.host_id) {
            const { data: hostProfile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", referralCodeData.host_id)
              .single()

            if (hostProfile?.email) {
              referralHostEmail = hostProfile.email
            }
          }
        } else {
          // Se host referral fallisce, prova con creator referral
          const { error: creatorReferralError } = await supabase
            .rpc("register_creator_referral", {
              p_referral_code: String(referral_code).trim().toUpperCase(),
              p_email: normalizedEmail,
              p_phone: String(phone_number).trim(),
              p_role: normalizedRole,
            })

          if (!creatorReferralError) {
            // Ottieni l'email del creator che ha generato il referral
            const { data: referralCodeData } = await supabase
              .from("creator_referral_codes")
              .select("creator_id")
              .eq("referral_code", String(referral_code).trim().toUpperCase())
              .single()

            if (referralCodeData?.creator_id) {
              const { data: creatorProfile } = await supabase
                .from("profiles")
                .select("email")
                .eq("id", referralCodeData.creator_id)
                .single()

              if (creatorProfile?.email) {
                referralCreatorEmail = creatorProfile.email
              }
            }
          } else {
            console.error("Error registering referral (both host and creator failed):", {
              hostError: hostReferralError,
              creatorError: creatorReferralError,
            })
          }
        }
      } catch (referralErr) {
        console.error("Referral registration exception:", referralErr)
        // Non bloccare la registrazione se il referral fallisce
      }
    }

    let wasInserted = false
    const insertResult = await supabase
      .from("waitlist_requests")
      .insert(insertData)
      .select()

    if (!insertResult.error) {
      wasInserted = true
    } else if (insertResult.error) {
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
            role: normalizedRole,
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
        wasInserted = false
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

    // Invia email all'host o creator se c'è un referral
    const referralEmailHtml = `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 32px;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <h1 style="margin: 0 0 12px; font-size: 24px; color: #111827;">Nuovo utente invitato!</h1>
          <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
            Un nuovo utente si è registrato alla waitlist tramite il tuo link di invito.
          </p>
          <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #1f2937; line-height: 1.6;">
              <strong>Dettagli utente:</strong><br />
              Email: ${normalizedEmail}<br />
              Telefono: ${phone_number}<br />
              Ruolo: ${role}
            </p>
          </div>
          <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
            Puoi visualizzare lo stato di registrazione di questo utente nella tua dashboard.
          </p>
          <p style="margin: 28px 0 0; font-size: 14px; color: #9ca3af;">
            Nomadiqe Team
          </p>
        </div>
      </div>
    `

    if (referralHostEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: referralHostEmail,
            subject: "Nomadiqe — Nuovo utente invitato alla waitlist",
            html: referralEmailHtml,
          }),
        })
      } catch (referralEmailError) {
        console.error("Error sending referral email to host:", referralEmailError)
        // Non bloccare la registrazione se l'email all'host fallisce
      }
    }

    if (referralCreatorEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: referralCreatorEmail,
            subject: "Nomadiqe — Nuovo utente invitato alla waitlist",
            html: referralEmailHtml,
          }),
        })
      } catch (referralEmailError) {
        console.error("Error sending referral email to creator:", referralEmailError)
        // Non bloccare la registrazione se l'email al creator fallisce
      }
    }

    // Notifica luca@facevoice.ai per ogni nuovo iscritto
    if (wasInserted) {
      const adminNotifyHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px;">
          <h2 style="color: #111827;">Nuovo iscritto alla waitlist Nomadiqe</h2>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Email:</strong> ${normalizedEmail}</p>
            <p style="margin: 0 0 8px;"><strong>Telefono:</strong> ${phone_number}</p>
            <p style="margin: 0 0 8px;"><strong>Ruolo:</strong> ${role}</p>
            <p style="margin: 0;"><strong>Paese:</strong> ${country || "-"}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Ricevuto automaticamente dal sistema.</p>
        </div>
      `
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: "luca@facevoice.ai",
            subject: `Nomadiqe — Nuovo iscritto waitlist: ${normalizedEmail} (${role})`,
            html: adminNotifyHtml,
          }),
        })
      } catch (adminNotifyErr) {
        console.error("Error sending admin notification:", adminNotifyErr)
      }
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
