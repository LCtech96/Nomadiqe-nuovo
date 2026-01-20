import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

const buildApprovalEmail = (fullName: string, signupUrl: string) => {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 32px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <h1 style="margin: 0 0 12px; font-size: 24px; color: #111827;">Benvenuto in Nomadiqe</h1>
        <p style="margin: 0 0 16px; font-size: 16px; color: #374151;">
          ${fullName ? `Ciao ${fullName},` : "Ciao,"} la tua richiesta è stata approvata.
        </p>
        <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.6;">
          Sei stato selezionato per entrare nell’ecosistema Nomadiqe. È il momento di creare il tuo account, iniziare a cercare collaborazioni sulla piattaforma e iniziare a guadagnare punti convertibili in token dopo il lancio sulla blockchain.
        </p>
        <a href="${signupUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Completa la registrazione
        </a>
        <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280;">
          Se il pulsante non funziona, copia e incolla questo link nel browser:
          <br />
          <span style="color: #2563eb;">${signupUrl}</span>
        </p>
        <p style="margin: 28px 0 0; font-size: 14px; color: #9ca3af;">
          Nomadiqe Team
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
      .update({ status: "approved" })
      .eq("id", id)
      .select("id, full_name, email")
      .single()

    if (error || !data) {
      console.error("Error approving waitlist request:", error)
      return NextResponse.json(
        { error: "Errore durante l'approvazione" },
        { status: 500 }
      )
    }

    // Usa sempre il dominio di produzione per le email di approvazione
    // In produzione, usa sempre https://www.nomadiqe.com
    let baseUrl = "https://www.nomadiqe.com"
    
    // Solo in sviluppo locale, usa localhost
    if (process.env.NODE_ENV === "development" && 
        (process.env.NEXT_PUBLIC_APP_URL?.includes("localhost") || 
         process.env.NEXTAUTH_URL?.includes("localhost"))) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.NEXTAUTH_URL || 
                 request.headers.get("origin") || 
                 "http://localhost:3000"
    }

    const signupUrl = `${baseUrl}/auth/signup?email=${encodeURIComponent(
      data.email
    )}`

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
        subject: "Nomadiqe — Accesso approvato",
        html: buildApprovalEmail(data.full_name || "", signupUrl),
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
    console.error("Error in waitlist approve API:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
