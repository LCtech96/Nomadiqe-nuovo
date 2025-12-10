import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || ""

export async function POST(request: Request) {
  try {
    const { userId, type, data } = await request.json()

    if (!FCM_SERVER_KEY) {
      console.error("FCM_SERVER_KEY non configurato")
      return NextResponse.json({ error: "FCM non configurato" }, { status: 500 })
    }

    if (!userId || !type || !data) {
      return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 })
    }

    // Ottieni il token FCM dell'utente
    const supabase = createSupabaseServerClient()
    const { data: subscription, error: subError } = await supabase
      .from("push_subscriptions")
      .select("fcm_token")
      .eq("user_id", userId)
      .single()

    if (subError || !subscription?.fcm_token) {
      console.log(`Utente ${userId} non iscritto alle notifiche FCM`)
      return NextResponse.json({ error: "Utente non iscritto" }, { status: 404 })
    }

    // Prepara il contenuto della notifica
    let title = ""
    let message = ""
    let url = "/"
    let notificationData: any = {}

    if (type === "message") {
      const { data: sender, error: senderError } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", data.sender_id)
        .single()

      if (senderError) {
        console.error("Errore nel recuperare il sender:", senderError)
      }

      const senderName = sender?.full_name || sender?.username || "Qualcuno"
      const messagePreview =
        data.content && data.content.length > 50 ? data.content.substring(0, 50) + "..." : data.content || "Nuovo messaggio"

      title = "💬 Nuovo messaggio"
      message = `${senderName}: ${messagePreview}`
      url = "/messages"
      notificationData = { type: "message", related_id: data.sender_id }
    } else if (type === "like") {
      const { data: liker, error: likerError } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", data.user_id)
        .single()

      if (likerError) {
        console.error("Errore nel recuperare il liker:", likerError)
      }

      const likerName = liker?.full_name || liker?.username || "Qualcuno"

      title = "❤️ Nuovo like"
      message = `${likerName} ha messo mi piace al tuo post`
      url = `/posts/${data.post_id}`
      notificationData = { type: "post_like", related_id: data.post_id }
    } else if (type === "comment") {
      const { data: commenter, error: commenterError } = await supabase
        .from("profiles")
        .select("username, full_name")
        .eq("id", data.user_id)
        .single()

      if (commenterError) {
        console.error("Errore nel recuperare il commenter:", commenterError)
      }

      const commenterName = commenter?.full_name || commenter?.username || "Qualcuno"
      const commentPreview =
        data.content && data.content.length > 50 ? data.content.substring(0, 50) + "..." : data.content || "Nuovo commento"

      title = "💬 Nuovo commento"
      message = `${commenterName}: ${commentPreview}`
      url = `/posts/${data.post_id}`
      notificationData = { type: "post_comment", related_id: data.post_id }
    } else {
      return NextResponse.json({ error: "Tipo di notifica non valido" }, { status: 400 })
    }

    // Invia notifica tramite FCM API REST
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: subscription.fcm_token,
        notification: {
          title,
          body: message,
          icon: "/icon.png",
          badge: "/icon.png",
          sound: "default",
        },
        data: {
          ...notificationData,
          url: url,
          click_action: url,
        },
        priority: type === "message" ? "high" : "normal",
        content_available: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`FCM API error: ${response.status} - ${errorText}`)
      throw new Error(`FCM API error: ${response.status}`)
    }

    const result = await response.json()
    console.log(`✅ Notifica FCM inviata con successo:`, result)
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error("Errore nell'invio della notifica FCM:", error)
    return NextResponse.json({ error: error.message || "Errore sconosciuto" }, { status: 500 })
  }
}

