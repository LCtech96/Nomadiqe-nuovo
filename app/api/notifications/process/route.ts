import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY

// Questa API route processa le notifiche pending dal database
// Può essere chiamata da un cron job (Vercel Cron) o da un webhook
export async function POST(request: Request) {
  try {
    // Verifica autenticazione (opzionale, puoi usare un secret key)
    const authHeader = request.headers.get("authorization")
    const secretKey = process.env.NOTIFICATION_WEBHOOK_SECRET
    
    if (secretKey && authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return NextResponse.json({ error: "OneSignal non configurato" }, { status: 500 })
    }

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
        // Ottieni il player ID dell'utente
        const { data: subscription, error: subError } = await supabase
          .from("push_subscriptions")
          .select("onesignal_player_id")
          .eq("user_id", notification.user_id)
          .single()

        if (subError || !subscription?.onesignal_player_id) {
          // Utente non iscritto, marca come inviata per non riprovare
          await supabase
            .from("pending_notifications")
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq("id", notification.id)
          continue
        }

        // Invia notifica tramite OneSignal API
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            include_player_ids: [subscription.onesignal_player_id],
            headings: { en: notification.title, it: notification.title },
            contents: { en: notification.message, it: notification.message },
            url: notification.url || "/",
            data: notification.data || {},
            // Configurazioni per notifiche anche quando app è chiusa
            content_available: true,
            mutable_content: true,
          }),
        })

        if (response.ok) {
          // Marca come inviata
          await supabase
            .from("pending_notifications")
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq("id", notification.id)
          processed++
        } else {
          const errorText = await response.text()
          console.error(`OneSignal API error per notifica ${notification.id}: ${response.status} - ${errorText}`)
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

// GET endpoint per verificare lo stato
export async function GET() {
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
