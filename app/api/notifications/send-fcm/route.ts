import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || ""

/** Risposta sempre 200: la notifica push è best-effort. Evita 500/404 in console. */
function ok(body: { success: true; result?: any }) {
  return NextResponse.json(body, { status: 200 })
}
function fail(reason: string, log = true) {
  if (log) console.warn("[send-fcm]", reason)
  return NextResponse.json({ success: false, reason }, { status: 200 })
}

export async function POST(request: Request) {
  try {
    const { userId, type, data } = await request.json()

    if (!FCM_SERVER_KEY) {
      return fail("FCM non configurato")
    }

    if (!userId || !type || !data) {
      return fail("Parametri mancanti")
    }

    const supabase = createSupabaseServerClient()
    const { data: subscription, error: subError } = await supabase
      .from("push_subscriptions")
      .select("fcm_token")
      .eq("user_id", userId)
      .single()

    if (subError || !subscription?.fcm_token) {
      return fail(`Utente ${userId} non iscritto alle notifiche FCM`, false)
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
      return fail("Tipo di notifica non valido")
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
          vibrate: [200, 100, 200],
          requireInteraction: type === "message",
        },
        data: {
          ...notificationData,
          url: url,
          click_action: url,
          sound: "default",
        },
        priority: type === "message" ? "high" : "normal",
        content_available: true,
        android: {
          priority: type === "message" ? "high" : "normal",
          notification: {
            sound: "default",
            channelId: "default",
            priority: "high",
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              contentAvailable: true,
              alert: {
                title,
                body: message,
              },
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`[send-fcm] FCM API error: ${response.status} - ${errorText}`)
      return fail(`FCM API error: ${response.status}`)
    }

    const result = await response.json()
    return ok({ success: true, result })
  } catch (error: any) {
    console.warn("[send-fcm] Errore:", error?.message ?? error)
    return fail(error?.message ?? "Errore sconosciuto")
  }
}




