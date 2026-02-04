import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * POST: Registra/aggiorna il token FCM per l'utente autenticato.
 * Usa service_role per bypassare RLS (il client browser non ha JWT Supabase).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const token = (body.token as string)?.trim()
    if (!token) {
      return NextResponse.json({ error: "Token FCM mancante" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: session.user.id,
        fcm_token: token,
        onesignal_player_id: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

    if (error) {
      console.error("[register-fcm-token] Errore upsert:", error)
      return NextResponse.json(
        { error: "Errore nel salvare il token" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[register-fcm-token]", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
