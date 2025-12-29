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
    const messageContent = await generateActionMessage(params)

    // Verifica che il messaggio sia stato generato
    if (!messageContent || messageContent.trim().length === 0) {
      console.error("Errore: il messaggio generato è vuoto o null")
      return NextResponse.json({
        success: false,
        error: "Impossibile generare il messaggio",
      }, { status: 500 })
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
      const notificationMessage = messageContent
        ? messageContent.substring(0, 100) + (messageContent.length > 100 ? "..." : "")
        : "Nuovo messaggio dall'assistente AI"
      
      const { error: notifError } = await supabase
        .from("pending_notifications")
        .insert({
          user_id: params.userId,
          notification_type: "message",
          title: "🤖 Nuovo messaggio dall'assistente",
          message: notificationMessage,
          url: "/messages",
          data: {
            type: "ai_assistant_message",
            message_id: message.id,
            action: params.action,
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

