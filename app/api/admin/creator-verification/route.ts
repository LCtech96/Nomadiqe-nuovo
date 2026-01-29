import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** GET: list creators with onboarding data (screenshots only visible to admin here) */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""

    if (!isAdminEmail(email)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()

    const { data: creators, error: creatorsError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, role, creator_verified_at, creator_verified_by")
      .eq("role", "creator")
      .order("created_at", { ascending: false })

    if (creatorsError) {
      console.error("Error loading creators:", creatorsError)
      return NextResponse.json(
        { error: "Errore nel caricamento dei creator" },
        { status: 500 }
      )
    }

    if (!creators?.length) {
      return NextResponse.json({ creators: [] })
    }

    const ids = creators.map((c) => c.id)
    const [onboardingRes, analyticsRes] = await Promise.all([
      supabase
        .from("creator_onboarding")
        .select("user_id, analytics_screenshot_urls, niche, kol_bed_level")
        .in("user_id", ids),
      supabase
        .from("creator_manual_analytics")
        .select("creator_id, profile_views, total_followers, engagement_rate")
        .in("creator_id", ids),
    ])

    const onboardingMap = Object.fromEntries(
      (onboardingRes.data || []).map((o) => [o.user_id, o])
    )
    const analyticsMap = Object.fromEntries(
      (analyticsRes.data || []).map((a) => [a.creator_id, a])
    )

    const enriched = creators.map((c) => ({
      ...c,
      onboarding: onboardingMap[c.id] ?? null,
      analytics: analyticsMap[c.id] ?? null,
    }))

    return NextResponse.json({ creators: enriched })
  } catch (e: unknown) {
    console.error("Error in creator-verification GET:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}

/** POST: approve verification (+ optional analytics) or reject */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email || ""
    const adminId = session?.user?.id as string | undefined

    if (!isAdminEmail(email) || !adminId) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      creatorId,
      action,
      analytics,
    } = body as {
      creatorId?: string
      action?: "approve" | "reject"
      analytics?: {
        profile_views?: number
        total_followers?: number
        total_following?: number
        total_posts?: number
        total_likes?: number
        total_comments?: number
        total_interactions?: number
        engagement_rate?: number
        total_reach?: number
      }
    }

    if (!creatorId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "creatorId e action (approve|reject) richiesti" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", creatorId)
      .single()

    if (!profile || profile.role !== "creator") {
      return NextResponse.json({ error: "Creator non trovato" }, { status: 404 })
    }

    if (action === "reject") {
      await supabase
        .from("profiles")
        .update({
          creator_verified_at: null,
          creator_verified_by: null,
        })
        .eq("id", creatorId)
      return NextResponse.json({ success: true, message: "Verifica rifiutata" })
    }

    // approve
    await supabase
      .from("profiles")
      .update({
        creator_verified_at: new Date().toISOString(),
        creator_verified_by: adminId,
      })
      .eq("id", creatorId)

    if (analytics && typeof analytics === "object") {
      const row = {
        creator_id: creatorId,
        profile_views: analytics.profile_views ?? null,
        total_followers: analytics.total_followers ?? null,
        total_following: analytics.total_following ?? null,
        total_posts: analytics.total_posts ?? null,
        total_likes: analytics.total_likes ?? null,
        total_comments: analytics.total_comments ?? null,
        total_interactions: analytics.total_interactions ?? null,
        engagement_rate: analytics.engagement_rate ?? null,
        total_reach: analytics.total_reach ?? null,
        updated_at: new Date().toISOString(),
      }
      await supabase.from("creator_manual_analytics").upsert(row, {
        onConflict: "creator_id",
      })
    }

    return NextResponse.json({ success: true, message: "Creator verificato" })
  } catch (e: unknown) {
    console.error("Error in creator-verification POST:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore interno del server" },
      { status: 500 }
    )
  }
}
