import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** POST: admin sends email to a user */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const adminEmail = session?.user?.email || ""

    if (!isAdminEmail(adminEmail)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { userId, subject, message } = body as {
      userId?: string
      subject?: string
      message?: string
    }

    if (!userId || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "userId, subject e message sono obbligatori" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      return NextResponse.json(
        { error: "Errore nel recupero dell'utente" },
        { status: 500 }
      )
    }

    let userEmail = profile?.email

    if (!userEmail) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      userEmail = authUser?.user?.email ?? null
    }

    if (!userEmail?.trim()) {
      return NextResponse.json(
        { error: "L'utente non ha un indirizzo email registrato" },
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
        <p style="font-size: 16px; line-height: 1.6; color: #374151;">
          ${message.trim().replace(/\n/g, "<br />")}
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
        to: userEmail.trim(),
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
    console.error("Error in admin send-email:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
