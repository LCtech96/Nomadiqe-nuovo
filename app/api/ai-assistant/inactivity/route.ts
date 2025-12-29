import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateInactivityMessage, type InactivityMessageParams } from "@/lib/ai-assistant"

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
    const { userId, role, username, fullName, hoursInactive } = await request.json() as InactivityMessageParams & { userId: string }

    if (!userId || !role) {
      return NextResponse.json(
        { error: "userId e role sono richiesti" },
        { status: 400 }
      )
    }

    // Genera il messaggio di sollecito per inattività
    const messageContent = await generateInactivityMessage({
      userId,
      role,
      username,
      fullName,
      hoursInactive: hoursInactive || 1,
    })

    // Usa admin client per bypassare RLS
    const supabase = createSupabaseAdminClient()

    // Verifica se esiste già un messaggio di sollecito recente (evita spam)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: existingReminder } = await supabase
      .from("messages")
      .select("id")
      .eq("is_ai_message", true)
      .is("sender_id", null)
      .eq("receiver_id", userId)
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingReminder) {
      return NextResponse.json({
        success: true,
        message: "Messaggio di sollecito già inviato recentemente",
        messageId: existingReminder.id,
      })
    }

    // Inserisci il messaggio
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
        : "L'assistente AI ti ha scritto"
      
      const { error: notifError } = await supabase
        .from("pending_notifications")
        .insert({
          user_id: userId,
          notification_type: "message",
          title: "🤖 Torna su Nomadiqe!",
          message: notificationMessage,
          url: "/messages",
          data: {
            type: "ai_assistant_message",
            message_id: message.id,
            action: "inactivity_reminder",
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
    console.error("Errore nell'API inactivity:", error)
    return NextResponse.json(
      { error: error.message || "Errore sconosciuto" },
      { status: 500 }
    )
  }
}

