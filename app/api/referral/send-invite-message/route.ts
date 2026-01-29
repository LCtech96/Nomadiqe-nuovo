import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non autenticato" },
        { status: 401 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Verifica che l'utente sia un host
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, username, full_name")
      .eq("id", session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profilo non trovato" },
        { status: 404 }
      )
    }

    if (profile.role !== "host" && profile.role !== "creator") {
      return NextResponse.json(
        { error: "Solo host e creator possono inviare link di invito" },
        { status: 403 }
      )
    }

    // Genera o recupera codice referral
    let referralCode: string
    let referralError: any

    if (profile.role === "host") {
      const result = await supabase.rpc("get_or_create_host_referral_code", {
        p_host_id: session.user.id,
      })
      referralCode = result.data
      referralError = result.error
    } else {
      // creator
      const result = await supabase.rpc("get_or_create_creator_referral_code", {
        p_creator_id: session.user.id,
      })
      referralCode = result.data
      referralError = result.error
    }

    if (referralError) {
      console.error("Error generating referral code:", referralError)
      return NextResponse.json(
        { error: referralError.message || "Errore nella generazione del codice" },
        { status: 500 }
      )
    }

    // Crea il link di invito
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://nomadiqe.com"
    const inviteLink = `${baseUrl}/?ref=${referralCode}`

    // Crea il messaggio AI con il link
    const userName = profile.full_name || profile.username || "Host"
    const roleLabel = profile.role === "host" ? "host" : "creator"
    
    const messageContent = `🎯 Ecco il tuo link di invito per altri ${roleLabel}!

Clicca sul link qui sotto per copiarlo e condividerlo su WhatsApp, email o qualsiasi altra piattaforma:

🔗 ${inviteLink}

**Come funziona:**
• Quando qualcuno si registra usando il tuo link, verrà collegato al tuo account
• Ogni ${roleLabel} che inviti e che completa la registrazione ti farà guadagnare punti e salire di livello
• Più ${roleLabel} inviti, più vantaggi ottieni (sconti sulle commissioni, periodi zero commissioni, ecc.)

Condividi il link e inizia a crescere la tua community! 🚀`

    // Inserisci il messaggio AI nella chat
    const { data: aiMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: null, // NULL per messaggi AI
        receiver_id: session.user.id,
        content: messageContent,
        read: false,
        is_ai_message: true,
        hidden_from_ui: false,
      })
      .select()
      .single()

    if (messageError) {
      console.error("Errore nell'inserimento del messaggio AI:", messageError)
      return NextResponse.json({
        success: false,
        error: "Impossibile salvare il messaggio",
        details: messageError.message,
      }, { status: 500 })
    }

    // Crea notifica per l'utente
    try {
      const { error: notifError } = await supabase
        .from("pending_notifications")
        .insert({
          user_id: session.user.id,
          notification_type: "message",
          title: "🤖 Link di invito generato",
          message: `Il tuo link di invito è stato inviato nella chat con l'assistente Nomadiqe`,
          url: "/messages",
          data: {
            type: "ai_assistant_message",
            message_id: aiMessage.id,
            action: "referral_invite_generated",
          },
        })

      if (notifError) {
        console.error("Errore nella creazione della notifica:", notifError)
      }
    } catch (notifErr) {
      console.error("Errore notifica:", notifErr)
    }

    return NextResponse.json({
      success: true,
      messageId: aiMessage.id,
      referralCode,
      inviteLink,
    })
  } catch (error: any) {
    console.error("Errore nell'API send-invite-message:", error)
    return NextResponse.json(
      { error: error.message || "Errore sconosciuto" },
      { status: 500 }
    )
  }
}
