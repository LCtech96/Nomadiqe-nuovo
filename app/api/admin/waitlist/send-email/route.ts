import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

/**
 * POST: invia email personalizzabile a un utente della waitlist
 * Body: { email: string, subject: string, body: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email || ""

    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { email, subject, body: emailBody } = body as {
      email?: string
      subject?: string
      body?: string
    }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email destinatario obbligatoria e valida" },
        { status: 400 }
      )
    }

    if (!subject?.trim()) {
      return NextResponse.json(
        { error: "Oggetto email obbligatorio" },
        { status: 400 }
      )
    }

    if (!emailBody?.trim()) {
      return NextResponse.json(
        { error: "Corpo email obbligatorio" },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Configurazione email non disponibile (RESEND_API_KEY)" },
        { status: 500 }
      )
    }

    const fromEmail =
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      "Nomadiqe <noreply@nomadiqe.com>"

    // Escape e converti newline in <br>
    const htmlBody = emailBody
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>")

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        ${htmlBody}
        <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">
          — Team Nomadiqe
        </p>
      </div>
    `

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email.trim().toLowerCase(),
        subject: subject.trim(),
        html,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error("Resend error:", errData)
      return NextResponse.json(
        { error: "Errore durante l'invio dell'email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Error in waitlist send-email:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
