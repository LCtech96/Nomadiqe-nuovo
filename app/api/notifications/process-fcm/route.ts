import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

// Firebase Admin SDK (per inviare notifiche)
// Nota: Per FCM, useremo l'API REST HTTP v1 invece di Admin SDK per semplicità

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || ""
const FCM_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "nomadiqe-622fa"

// Questa API route processa le notifiche pending dal database e le invia tramite FCM
export async function GET(request: Request) {
  const vercelCronHeader = request.headers.get("x-vercel-cron")
  const isVercelCron = vercelCronHeader === "1"

  // Se è una chiamata da Vercel Cron, processa le notifiche
  if (isVercelCron) {
    return await processNotifications()
  }

  // Altrimenti restituisci solo lo stato
  const supabase = createSupabaseServerClient()
  const { count, error } = await supabase
    .from("pending_notifications")
    .select("*", { count: "exact", head: true })
    .eq("sent", false)

  if (error) {
    return NextResponse.json({ error: "Errore" }, { status: 500 })
  }

  return NextResponse.json({
    pending: count || 0,
  })
}

export async function POST(request: Request) {
  return await processNotifications()
}

async function processNotifications() {
  try {
    const supabase = createSupabaseServerClient()

    // Ottieni notifiche pending (max 50 alla volta)
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from("pending_notifications")
      .select("*")
      .eq("sent", false)
      .order("created_at", { ascending: true })
      .limit(50)

    if (fetchError) {
      console.error("Errore nel recuperare notifiche pending:", fetchError)
      return NextResponse.json({ error: "Errore nel recuperare notifiche" }, { status: 500 })
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({ success: true, processed: 0 })
    }

    let processed = 0
    let failed = 0

    // Processa ogni notifica
    for (const notification of pendingNotifications) {
      try {
        // Ottieni il token FCM dell'utente
        const { data: subscription, error: subError } = await supabase
          .from("push_subscriptions")
          .select("fcm_token")
          .eq("user_id", notification.user_id)
          .single()

        if (subError || !subscription?.fcm_token) {
          console.log(`⚠️ Utente ${notification.user_id} non iscritto alle notifiche FCM. Subscription:`, subscription, "Error:", subError)
          // Utente non iscritto, marca come inviata per non riprovare
          await supabase
            .from("pending_notifications")
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq("id", notification.id)
          continue
        }

        console.log(`📤 Invio notifica FCM per utente ${notification.user_id}, token: ${subscription.fcm_token.substring(0, 20)}...`)

        // Invia notifica tramite FCM API REST v1
        // Per FCM v1, dobbiamo usare OAuth2. Per semplicità, usiamo l'API legacy con server key
        // NOTA: In produzione, è meglio usare OAuth2 con service account
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: subscription.fcm_token,
            notification: {
              title: notification.title,
              body: notification.message,
              icon: "/icon.png",
              badge: "/icon.png",
              sound: "default",
            },
            data: {
              ...notification.data,
              url: notification.url || "/",
              click_action: notification.url || "/",
            },
            priority: notification.notification_type === "message" ? "high" : "normal",
            content_available: true,
          }),
        })

        if (response.ok) {
          const responseData = await response.json()
          console.log(`✅ Notifica FCM inviata con successo. Response:`, responseData)
          // Marca come inviata
          await supabase
            .from("pending_notifications")
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq("id", notification.id)
          processed++
        } else {
          const errorText = await response.text()
          console.error(`❌ FCM API error per notifica ${notification.id}: Status ${response.status} - ${errorText}`)
          failed++
        }
      } catch (error: any) {
        console.error(`Errore nell'invio notifica ${notification.id}:`, error)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: pendingNotifications.length,
    })
  } catch (error: any) {
    console.error("Errore nel processare notifiche:", error)
    return NextResponse.json({ error: error.message || "Errore sconosciuto" }, { status: 500 })
  }
}

