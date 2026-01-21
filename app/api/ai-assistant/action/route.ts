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

    // Usa admin client per bypassare RLS e inserire messaggi con sender_id speciale
    const supabase = createSupabaseAdminClient()

    // Controlla se è già stato inviato un messaggio per la stessa azione negli ultimi 60 secondi (evita duplicati)
    // Usa un controllo più rigoroso basato sull'azione specifica
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recentActionMessages } = await supabase
      .from("messages")
      .select("id, content, created_at")
      .is("sender_id", null)
      .eq("receiver_id", params.userId)
      .eq("is_ai_message", true)
      .gte("created_at", sixtySecondsAgo)
      .order("created_at", { ascending: false })
      .limit(5)

    // Se ci sono messaggi recenti, verifica se uno di essi è per la stessa azione
    if (recentActionMessages && recentActionMessages.length > 0) {
      // Controlla se l'azione è già stata processata recentemente
      // Usa l'action type come identificatore principale
      const actionType = params.action?.toLowerCase() || ""
      const actionDesc = params.actionDescription?.toLowerCase() || ""
      
      // Crea un hash semplice dell'azione per confronto
      const actionSignature = `${actionType}_${actionDesc.substring(0, 50)}`
      
      for (const recentMsg of recentActionMessages) {
        if (recentMsg.content) {
          const contentLower = recentMsg.content.toLowerCase()
          // Verifica se il messaggio recente menziona la stessa azione
          // Controlla sia il tipo di azione che le parole chiave della descrizione
          const actionKeywords = actionDesc.split(' ').filter(k => k.length > 3)
          const hasActionType = actionType && contentLower.includes(actionType)
          const hasActionKeywords = actionKeywords.length > 0 && 
            actionKeywords.some(keyword => contentLower.includes(keyword))
          
          // Se il messaggio recente contiene riferimenti alla stessa azione, è un duplicato
          if (hasActionType || hasActionKeywords) {
            return NextResponse.json({
              success: true,
              message: "Messaggio già inviato per questa azione",
              duplicate: true,
            })
          }
        }
      }
    }

    // Recupera username e fullName dal profilo
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, full_name, ai_actions_count")
      .eq("id", params.userId)
      .single()

    const username = profile?.username || undefined
    const fullName = profile?.full_name || undefined
    const currentActionsCount = profile?.ai_actions_count || 0

    // Incrementa il contatore delle azioni AI
    const newActionsCount = currentActionsCount + 1
    await supabase
      .from("profiles")
      .update({ ai_actions_count: newActionsCount })
      .eq("id", params.userId)

    // Determina se mostrare il disclaimer (prime 10 azioni)
    const showDisclaimer = newActionsCount <= 10

    // Aggiungi username e fullName ai params per l'AI
    const paramsWithUser = {
      ...params,
      username,
      fullName,
    }

    // Genera il messaggio per l'azione
    let messageContent: string
    try {
      const generated = await generateActionMessage(paramsWithUser)
      // Garantisce che messageContent sia sempre una stringa non vuota
      messageContent = (generated && typeof generated === 'string' && generated.trim().length > 0)
        ? generated.trim()
        : `🎉 Ottimo lavoro! Hai completato: ${paramsWithUser.actionDescription}`
    } catch (genError) {
      console.error("Errore nella generazione del messaggio:", genError)
      // Fallback garantito se la generazione fallisce
      messageContent = `🎉 Ottimo lavoro! Hai completato: ${paramsWithUser.actionDescription}`
    }

    // Verifica finale che il messaggio sia valido (dovrebbe sempre essere valido grazie al fallback sopra)
    if (!messageContent || typeof messageContent !== 'string' || messageContent.trim().length === 0) {
      messageContent = `🎉 Ottimo lavoro! Hai completato: ${paramsWithUser.actionDescription}`
    }

    // Crea messaggio nascosto dall'utente all'AI (non visibile nel frontend)
    // Usiamo un self-message con hidden_from_ui = true per simulare un messaggio utente->AI nascosto
    // NOTA: Questo messaggio verrà filtrato dal frontend, quindi non sarà visibile all'utente
    const hiddenUserMessage = `[Azione automatica: ${paramsWithUser.actionDescription}]`
    
    const { data: hiddenMessage, error: hiddenError } = await supabase
      .from("messages")
      .insert({
        sender_id: paramsWithUser.userId,
        receiver_id: paramsWithUser.userId, // Self-message (verrà filtrato dal frontend)
        content: hiddenUserMessage,
        read: true, // Già letto perché nascosto
        is_ai_message: false,
        hidden_from_ui: true, // NASCOSTO nel frontend - non verrà mostrato
      })
      .select()
      .single()

    // Ignora errori sul messaggio nascosto (non critico per il funzionamento)
    if (hiddenError) {
      console.warn("Errore nella creazione del messaggio nascosto (non critico):", hiddenError)
    }

    // Inserisci la risposta dell'AI (visibile nel frontend)
    // Questo è il messaggio che l'utente vedrà nella chat con l'AI
    const { data: aiMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        sender_id: null, // NULL per messaggi AI (identifica l'assistente)
        receiver_id: paramsWithUser.userId,
        content: messageContent,
        read: false,
        is_ai_message: true, // Marca come messaggio AI
        hidden_from_ui: false, // VISIBILE nel frontend
      })
      .select()
      .single()

    if (messageError) {
      console.error("Errore nell'inserimento del messaggio AI:", messageError)
      return NextResponse.json({
        success: false,
        error: "Impossibile salvare il messaggio",
        details: messageError.message,
        note: "Assicurati di aver eseguito supabase/38_MODIFY_MESSAGES_FOR_AI.sql e supabase/44_ADD_HIDDEN_FROM_UI_TO_MESSAGES.sql",
      }, { status: 500 })
    }

    const message = aiMessage

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
          user_id: paramsWithUser.userId,
          notification_type: "message",
          title: "🤖 Nuovo messaggio dall'assistente",
          message: finalNotificationMessage,
          url: "/messages",
          data: {
            type: "ai_assistant_message",
            message_id: message.id,
            action: paramsWithUser.action,
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
      showDisclaimer,
    })
  } catch (error: any) {
    console.error("Errore nell'API action:", error)
    return NextResponse.json(
      { error: error.message || "Errore sconosciuto" },
      { status: 500 }
    )
  }
}

