import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateWelcomeMessage, type WelcomeMessageParams } from "@/lib/ai-assistant"

// Crea un client Supabase con service role key per bypassare RLS
// Questo permette di inserire messaggi con sender_id speciale dell'assistente AI
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
    const { userId, role, username, fullName } = await request.json() as WelcomeMessageParams & { userId: string }

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId e role sono richiesti" },
        { status: 400 }
      )
    }

    // Genera il messaggio di benvenuto
    const messageContent = await generateWelcomeMessage({
      userId,
      role,
      username,
      fullName,
    })

    // Usa admin client per bypassare RLS e inserire messaggi con sender_id speciale
    const supabase = createSupabaseAdminClient()
    
    // ID speciale per l'assistente AI (deve essere creato tramite SQL trigger)
    const AI_ASSISTANT_ID = "00000000-0000-0000-0000-000000000000"
    
    // Verifica se esiste già un messaggio di benvenuto recente per evitare duplicati
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: existingWelcome } = await supabase
      .from("messages")
      .select("id")
      .eq("is_ai_message", true)
      .is("sender_id", null)
      .eq("receiver_id", userId)
      .gte("created_at", oneHourAgo)
      .maybeSingle()

    if (existingWelcome) {
      return NextResponse.json({
        success: true,
        message: "Messaggio di benvenuto già inviato recentemente",
        messageId: existingWelcome.id,
      })
    }

    // Inserisci il messaggio nella tabella messages
    // Usa is_ai_message = true e sender_id NULL per identificare messaggi AI
    // (Richiede che sia stato eseguito supabase/38_MODIFY_MESSAGES_FOR_AI.sql)
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: null, // NULL per messaggi AI
        receiver_id: userId,
        content: messageContent,
        read: false,
        is_ai_message: true, // Marca come messaggio AI
      })
      .select()
      .single()

    if (messageError) {
      console.error("Errore nell'inserimento del messaggio:", messageError)
      // Se fallisce, potrebbe essere perché il profilo AI non esiste ancora
      // In questo caso, il trigger SQL dovrebbe gestirlo
      return NextResponse.json({
        success: false,
        error: "Impossibile salvare il messaggio",
        details: messageError.message,
        note: "Assicurati di aver eseguito supabase/36_CREA_ASSISTENTE_AI_TRIGGER.sql",
      }, { status: 500 })
    }

    // Crea notifica per l'utente
    try {
      const { error: notifError } = await supabase
        .from("pending_notifications")
        .insert({
          user_id: userId,
          notification_type: "message",
          title: "🤖 Benvenuto su Nomadiqe!",
          message: "L'assistente AI ti ha inviato un messaggio di benvenuto",
          url: "/messages",
          data: {
            type: "ai_assistant_message",
            message_id: message.id,
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
    console.error("Errore nell'API welcome:", error)
    return NextResponse.json(
      { error: error.message || "Errore sconosciuto" },
      { status: 500 }
    )
  }
}

