import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email e codice sono richiesti" },
        { status: 400 }
      )
    }

    // Qui dovresti integrare un servizio di invio email
    // Per esempio, usando Resend, SendGrid, o il servizio email di Supabase
    // Per ora, loggiamo il codice (in produzione usa un servizio email reale)
    console.log(`Second verification code for ${email}: ${code}`)

    // TODO: Integra un servizio email reale qui
    // Esempio con Resend:
    // await resend.emails.send({
    //   from: 'onboarding@nomadiqe.com',
    //   to: email,
    //   subject: 'Seconda verifica email - Nomadiqe',
    //   html: `<p>Il tuo codice di verifica è: <strong>${code}</strong></p>`
    // })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error sending second verification email:", error)
    return NextResponse.json(
      { error: "Errore durante l'invio dell'email" },
      { status: 500 }
    )
  }
}



