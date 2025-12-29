import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateActionMessage, type ActionMessageParams } from "@/lib/ai-assistant"

// Crea un client Supabase con service role key per bypassare RLS
function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseServiceKey) {
    // Fallback: usa il client normale (può fallire per RLS)
    const { createSupabaseServerClient } = require("@/lib/supabase/server")
    return createSupabaseServerClient()
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: Request) {
  try {
    const params = await request.json() as ActionMessageParams

    if (!params.userId || !params.action || !params.actionDescription || !params.role) {
      return NextResponse.json(
        { error: "Parametri mancanti: userId, action, actionDescription, role sono richiesti" },
        { status: 400 }
      )
    }

    // Genera il messaggio per l'azione
    let messageContent: string
    try {
      const generated = await generateActionMessage(params)
      // Garantisce che messageContent sia sempre una stringa non vuota
      messageContent = (generated && typeof generated === 'string' && generated.trim().length > 0)
        ? generated.trim()
        : `🎉 Ottimo lavoro! Hai completato: ${params.actionDescription}`
    } catch (genError) {
      console.error("Errore nella generazione del messaggio:", genError)
      // Fallback garantito se la generazione fallisce
      messageContent = `🎉 Ottimo lavoro! Hai completato: ${params.actionDescription}`
    }

    // Verifica finale che il messaggio sia valido (dovrebbe sempre essere valido grazie al fallback sopra)
    if (!messageContent || typeof messageContent !== 'string' || messageContent.trim().length === 0) {
      messageContent = `🎉 Ottimo lavoro! Hai completato: ${params.actionDescription}`
    }

    // Usa admin client per bypassare RLS e inserire messaggi con sender_id speciale
    const supabase = createSupabaseAdminClient()

    // Inserisci il messaggio
    // Usa is_ai_message = true e sender_id NULL per identificare messaggi AI
    // NOTA: Richiede che sia stato eseguito supabase/38_MODIFY_MESSAGES_FOR_AI.sql
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: null, // NULL per messaggi AI
        receiver_id: params.userId,
        content: messageContent,
        read: false,
        is_ai_message: true, // Marca come messaggio AI
      })
      .select()
      .single()

    if (messageError) {
      console.error("Errore nell'inserimento del messaggio:", messageError)
      return NextResponse.json({
        success: false,
        error: "Impossibile salvare il messaggio",
        details: messageError.message,
        note: "Assicurati di aver eseguito supabase/38_MODIFY_MESSAGES_FOR_AI.sql per abilitare i messaggi AI",
      }, { status: 500 })
    }

    // Crea notifica per l'utente
    try {
      // Assicurati che notificationMessage non sia mai null o vuoto
      let notificationMessage: string = "Nuovo messaggio dall'assistente AI" // Fallback garantito
      
      if (messageContent && typeof messageContent === 'string' && messageContent.trim().length > 0) {
        const trimmed = messageContent.substring(0, 100).trim()
        if (trimmed.length > 0) {
          notificationMessage = trimmed
          if (messageContent.length > 100) {
            notificationMessage += "..."
          }
        }
      }
      
      // Verifica finale garantita - notificationMessage NON può essere null/undefined/vuoto
      if (!notificationMessage || typeof notificationMessage !== 'string' || notificationMessage.trim().length === 0) {
        notificationMessage = "Nuovo messaggio dall'assistente AI"
      }
      
      // Garantisci che notificationMessage sia una stringa non vuota prima di inserire
      const finalNotificationMessage = String(notificationMessage).trim() || "Nuovo messaggio dall'assistente AI"
      
      const { error: notifError } = await supabase
        .from("pending_notifications")
        .insert({
          user_id: params.userId,
          notification_type: "message",
          title: "🤖 Nuovo messaggio dall'assistente",
          message: finalNotificationMessage,
          url: "/messages",
          data: {
            type: "ai_assistant_message",
            message_id: message.id,
            action: params.action,
          },
        })

      if (notifError) {
        console.error("Errore nella creazione della notifica:", notifError)
        console.error("notificationMessage value:", finalNotificationMessage)
        console.error("messageContent original:", messageContent)
      }
    } catch (notifErr) {
      console.error("Errore notifica:", notifErr)
    }

    return NextResponse.json({
      success: true,
      messageId: message.id,
      content: messageContent,
    })
  } catch (error: any) {
    console.error("Errore nell'API action:", error)
    return NextResponse.json(
      { error: error.message || "Errore sconosciuto" },
      { status: 500 }
    )
  }
}

