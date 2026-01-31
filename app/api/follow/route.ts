import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/follow
 * Segui o smetti di seguire un utente.
 * Assicura che il profilo del follower esista prima di inserire in follows
 * (fix per utenti NextAuth senza riga in profiles).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { action, followingId } = body as { action?: "follow" | "unfollow"; followingId?: string }

    if (!action || !["follow", "unfollow"].includes(action) || !followingId) {
      return NextResponse.json(
        { error: "action (follow|unfollow) e followingId richiesti" },
        { status: 400 }
      )
    }

    const followerId = session.user.id

    if (followerId === followingId) {
      return NextResponse.json({ error: "Non puoi seguire te stesso" }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    // Assicura che il profilo del follower esista (fix per FK violation)
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", followerId)
      .maybeSingle()

    if (!existingProfile) {
      const email = session.user.email || `${followerId}@placeholder.local`
      const baseName = session.user.name || email.split("@")[0] || "User"
      const safeId = followerId.replace(/-/g, "").slice(0, 12)
      const { error: insertErr } = await supabase.from("profiles").upsert(
        {
          id: followerId,
          email,
          full_name: baseName,
          username: `user_${safeId}`,
        },
        { onConflict: "id" }
      )
      if (insertErr) {
        console.error("Follow API: profile upsert error:", insertErr)
        return NextResponse.json(
          { error: "Profilo non trovato. Completa la registrazione." },
          { status: 400 }
        )
      }
    }

    if (action === "unfollow") {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId)

      if (error) throw error
      return NextResponse.json({ success: true, following: false })
    }

    // Follow
    const { error: followErr } = await supabase
      .from("follows")
      .upsert(
        { follower_id: followerId, following_id: followingId },
        { onConflict: "follower_id,following_id" }
      )

    if (followErr) throw followErr

    // Notifica al seguito
    const { data: followerProfile } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", followerId)
      .maybeSingle()

    const followerName = followerProfile?.username || followerProfile?.full_name || "Un utente"

    await supabase.from("notifications").insert({
      user_id: followingId,
      type: "new_follower",
      title: "Nuovo follower",
      message: `${followerName} ha iniziato a seguirti`,
      related_id: followerId,
    })

    return NextResponse.json({ success: true, following: true })
  } catch (e: unknown) {
    console.error("Follow API error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore durante il follow" },
      { status: 500 }
    )
  }
}
