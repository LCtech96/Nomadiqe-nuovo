import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const TO_EMAIL = "info@nomadiqe.com"

/** POST: send investment contact form to info@nomadiqe.com */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      message,
      selectedCard,
      investmentAmount,
      hasInvestedBefore,
      senderEmail,
    } = body as {
      message?: string
      selectedCard?: string
      investmentAmount?: string
      hasInvestedBefore?: string
      senderEmail?: string
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Il messaggio è obbligatorio" },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json(
        { error: "Configurazione email non disponibile" },
        { status: 500 }
      )
    }

    const fromEmail =
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      "Nomadiqe <noreply@nomadiqe.com>"

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #374151;">Nuova richiesta investimento - Nomadiqe</h2>
        
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;"><strong>Card selezionata:</strong> ${selectedCard || "Non specificata"}</p>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;"><strong>Cifra investimento sostenibile:</strong> ${investmentAmount || "Non specificata"}</p>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;"><strong>Ha già investito in passato:</strong> ${hasInvestedBefore || "Non specificato"}</p>
        ${senderEmail ? `<p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;"><strong>Email mittente:</strong> ${senderEmail}</p>` : ""}
        
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;"><strong>Messaggio:</strong></p>
        <div style="font-size: 16px; line-height: 1.6; color: #374151; padding: 12px; background: #f3f4f6; border-radius: 8px;">
          ${message.trim().replace(/\n/g, "<br />")}
        </div>
        
        <p style="margin-top: 24px; font-size: 12px; color: #9ca3af;">
          — Form investimento Nomadiqe
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
        to: TO_EMAIL,
        replyTo: senderEmail?.trim() || undefined,
        subject: `[Investimento] Richiesta da ${selectedCard || "sito"} - Nomadiqe`,
        html,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error("Resend error:", errData)
      return NextResponse.json(
        { error: "Errore durante l'invio. Riprova più tardi." },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Error in investi contact:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
