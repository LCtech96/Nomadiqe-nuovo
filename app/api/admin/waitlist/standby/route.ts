import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const buildStandbyEmail = () => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 32px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <h1 style="margin: 0 0 12px; font-size: 24px; color: #111827;">Sei in standby</h1>
        <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.6;">
          Stiamo lavorando per te e per offrirti il miglior accesso possibile all’ecosistema Nomadiqe.
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.6;">
          Nel frattempo puoi già iniziare a guadagnare invitando altre persone a iscriversi sulla piattaforma: per ogni iscrizione accumulerai punti.
        </p>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px; color: #92400e; line-height: 1.6;">
            Ti avviseremo appena sarà il tuo turno per accedere e completare la registrazione.
          </p>
        </div>
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
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: "ID mancante" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from("waitlist_requests")
      .update({ status: "standby" })
      .eq("id", id)
      .select("id, email")
      .single()

    if (error || !data) {
      console.error("Error setting standby:", error)
      return NextResponse.json(
        { error: "Errore durante l'aggiornamento" },
        { status: 500 }
      )
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

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: data.email,
        subject: "Nomadiqe — Sei in standby",
        html: buildStandbyEmail(),
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error("Resend error:", errorText)
      return NextResponse.json(
        { error: "Errore durante l'invio dell'email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in waitlist standby API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
