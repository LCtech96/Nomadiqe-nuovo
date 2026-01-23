import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hostId, hostEmail, hostName, offerPrice, isFirst100 } = body

    if (!hostId || !hostEmail) {
      return NextResponse.json(
        { error: "hostId e hostEmail sono obbligatori" },
        { status: 400 }
      )
    }

    // Ottieni i dettagli del profilo host
    const supabase = createSupabaseServerClient()
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, username")
      .eq("id", hostId)
      .maybeSingle()

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError)
    }

    const hostProfile = profile || {
      id: hostId,
      email: hostEmail,
      full_name: hostName || "N/A",
      username: "N/A",
    }

    // Prepara il contenuto dell'email
    const emailSubject = `Nuova Richiesta Offerta Sito Web - Host #${hostProfile.id.substring(0, 8)}`
    const emailBody = `
Nuova richiesta per l'offerta sito web Facevoice.ai

Dettagli Host:
- ID Utente: ${hostProfile.id}
- Email: ${hostProfile.email}
- Nome: ${hostProfile.full_name || "N/A"}
- Username: ${hostProfile.username || "N/A"}

Dettagli Offerta:
- Prezzo: ${offerPrice}€
- Primi 100: ${isFirst100 ? "Sì" : "No"}
- Data richiesta: ${new Date().toLocaleString("it-IT")}

L'host ha completato l'onboarding e ha richiesto l'offerta per il sito web personalizzato.
Contatta l'host all'indirizzo: ${hostProfile.email}
    `.trim()

    // Invia email usando Resend (se configurato) o Supabase
    // Per ora usiamo Supabase per inviare l'email
    try {
      // Usa Supabase Edge Function o Resend API direttamente
      // Per semplicità, usiamo fetch per chiamare Resend API se disponibile
      const resendApiKey = process.env.RESEND_API_KEY
      
      if (resendApiKey) {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Nomadiqe <noreply@nomadiqe.com>",
            to: "luca@facevoice.ai",
            subject: emailSubject,
            html: `
              <h2>Nuova Richiesta Offerta Sito Web</h2>
              <p>Un nuovo host ha richiesto l'offerta per il sito web personalizzato.</p>
              <h3>Dettagli Host:</h3>
              <ul>
                <li><strong>ID Utente:</strong> ${hostProfile.id}</li>
                <li><strong>Email:</strong> ${hostProfile.email}</li>
                <li><strong>Nome:</strong> ${hostProfile.full_name || "N/A"}</li>
                <li><strong>Username:</strong> ${hostProfile.username || "N/A"}</li>
              </ul>
              <h3>Dettagli Offerta:</h3>
              <ul>
                <li><strong>Prezzo:</strong> ${offerPrice}€</li>
                <li><strong>Primi 100:</strong> ${isFirst100 ? "Sì" : "No"}</li>
                <li><strong>Data richiesta:</strong> ${new Date().toLocaleString("it-IT")}</li>
              </ul>
              <p>Contatta l'host all'indirizzo: <a href="mailto:${hostProfile.email}">${hostProfile.email}</a></p>
            `,
          }),
        })

        if (!resendResponse.ok) {
          const errorData = await resendResponse.json()
          console.error("Resend API error:", errorData)
          // Non fallire se Resend non funziona, logga solo l'errore
        }
      } else {
        // Se Resend non è configurato, logga solo l'informazione
        console.log("Email notification (Resend not configured):", {
          to: "luca@facevoice.ai",
          subject: emailSubject,
          body: emailBody,
        })
      }
    } catch (emailError) {
      console.error("Error sending email:", emailError)
      // Non fallire la richiesta se l'email non viene inviata
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in website offer notification:", error)
    return NextResponse.json(
      { error: error.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
