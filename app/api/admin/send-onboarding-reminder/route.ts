import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"

export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.nomadiqe.com"

/**
 * POST: invia email di sollecito per completare l'onboarding
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email || ""

    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { email } = body as { email?: string }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email obbligatoria e valida" },
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

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #374151;">Completa la tua iscrizione a Nomadiqe BETA</h2>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Ciao,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          La tua richiesta di accesso a Nomadiqe BETA è stata approvata! 
          Per iniziare a utilizzare la piattaforma devi completare l'iscrizione.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          Se non l'hai già fatto, <strong>registrati</strong> con questa email e poi completa l'onboarding 
          per accedere a tutte le funzionalità.
        </p>
        <p style="margin: 24px 0;">
          <a href="${SITE_URL}/auth/signup" style="display: inline-block; background: linear-gradient(to right, #7c3aed, #6366f1); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Completa l'iscrizione
          </a>
        </p>
        <p style="font-size: 14px; color: #6b7280;">
          Oppure accedi direttamente: <a href="${SITE_URL}/auth/signin">${SITE_URL}/auth/signin</a>
        </p>
        <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
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
        to: email.trim(),
        subject: "Nomadiqe BETA — Completa la tua iscrizione",
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
    console.error("Error in send-onboarding-reminder:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
