import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** PATCH: update analytics screenshot URLs for a period (90|30|7) */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const VALID_PERIODS = ["90", "30", "7", "views_pie", "accounts_reached", "reels_content", "posts_content", "stories_content", "profile_activity", "profile_visits", "external_links", "audience_30", "audience_7"] as const
    const { period, urls } = body as { period?: string; urls?: string[] }

    if (!period || !VALID_PERIODS.includes(period as typeof VALID_PERIODS[number])) {
      return NextResponse.json({ error: "period richiesto: 90|30|7|views_pie|accounts_reached|reels_content|posts_content|stories_content|profile_activity|profile_visits|external_links|audience_30|audience_7" }, { status: 400 })
    }
    if (!Array.isArray(urls)) {
      return NextResponse.json({ error: "urls deve essere un array" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Verifica che l'utente sia un creator
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profile?.role !== "creator") {
      return NextResponse.json({ error: "Solo i creator possono aggiornare le analitiche" }, { status: 403 })
    }

    const { error } = await supabase.rpc("upsert_creator_onboarding_analytics", {
      p_user_id: session.user.id,
      p_period: period,
      p_urls: urls,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    console.error("Error in analytics-screenshots PATCH:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno" },
      { status: 500 }
    )
  }
}
