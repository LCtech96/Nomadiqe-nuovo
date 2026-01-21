import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateChatResponse } from "@/lib/ai-assistant"

// Crea un client Supabase con service role key per bypassare RLS
function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseServiceKey) {
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
    const { userId, message } = await request.json()

    if (!userId || !message) {
      return NextResponse.json(
        { error: "userId e message sono richiesti" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Recupera il profilo dell'utente per ottenere ruolo, username e fullName
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, username, full_name")
      .eq("id", userId)
      .single()

    if (!profile?.role) {
      return NextResponse.json(
        { error: "Profilo non trovato o ruolo mancante" },
        { status: 404 }
      )
    }

    // Inserisci il messaggio dell'utente (visibile)
    const { data: userMessage, error: userMsgError } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: userId, // Self-message per la conversazione con l'AI
        content: message,
        read: true,
        is_ai_message: false,
        hidden_from_ui: false,
      })
      .select()
      .single()

    if (userMsgError) {
      console.error("Errore nell'inserimento del messaggio utente:", userMsgError)
      return NextResponse.json({
        success: false,
        error: "Impossibile salvare il messaggio",
        details: userMsgError.message,
      }, { status: 500 })
    }

    // Genera la risposta dell'AI
    let aiResponse: string
    try {
      aiResponse = await generateChatResponse({
        userId,
        userMessage: message,
        role: profile.role as "traveler" | "host" | "creator" | "jolly",
        username: profile.username || undefined,
        fullName: profile.full_name || undefined,
      })
    } catch (genError) {
      console.error("Errore nella generazione della risposta AI:", genError)
      aiResponse = "Mi dispiace, c'è stato un problema nel generare la risposta. Per assistenza specifica, contatta il supporto."
    }

    // Verifica che la risposta non sia vuota
    if (!aiResponse || typeof aiResponse !== 'string' || aiResponse.trim().length === 0) {
      aiResponse = "Mi dispiace, non sono sicuro di come rispondere. Per assistenza specifica, contatta il supporto."
    }

    // Inserisci la risposta dell'AI (visibile)
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from("messages")
      .insert({
        sender_id: null, // NULL per messaggi AI
        receiver_id: userId,
        content: aiResponse.trim(),
        read: false,
        is_ai_message: true,
        hidden_from_ui: false,
      })
      .select()
      .single()

    if (aiMsgError) {
      console.error("Errore nell'inserimento del messaggio AI:", aiMsgError)
      return NextResponse.json({
        success: false,
        error: "Impossibile salvare la risposta dell'AI",
        details: aiMsgError.message,
      }, { status: 500 })
    }

    // Crea notifica per l'utente
    try {
      const notificationMessage = aiResponse.substring(0, 100) + (aiResponse.length > 100 ? "..." : "")
      
      await supabase
        .from("pending_notifications")
        .insert({
          user_id: userId,
          notification_type: "message",
          title: "🤖 Risposta dall'assistente",
          message: notificationMessage,
          url: "/messages",
          data: {
            type: "ai_assistant_message",
            message_id: aiMessage.id,
          },
        })
    } catch (notifErr) {
      console.error("Errore nella creazione della notifica:", notifErr)
    }

    return NextResponse.json({
      success: true,
      messageId: aiMessage.id,
      content: aiResponse,
    })
  } catch (error: any) {
    console.error("Errore nell'API chat:", error)
    return NextResponse.json(
      { error: error.message || "Errore sconosciuto" },
      { status: 500 }
    )
  }
}

