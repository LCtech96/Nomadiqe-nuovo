import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { extractLinksFromText } from "@/lib/bio-links"
import { ADMIN_EMAILS } from "@/lib/admin"

/**
 * POST /api/profile/update
 * Aggiorna il profilo dell'utente autenticato.
 * Per host: se la bio contiene link (https://, http://, www.), crea richieste di approvazione e notifica admin.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json()
    const {
      full_name,
      username,
      bio,
      avatar_url,
      username_changed_at,
      presentation_video_url,
    } = body

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (full_name !== undefined) updatePayload.full_name = full_name ?? null
    if (username !== undefined) updatePayload.username = username ?? null
    if (bio !== undefined) updatePayload.bio = bio ?? null
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url ?? null
    if (username_changed_at !== undefined) updatePayload.username_changed_at = username_changed_at ?? null
    if (presentation_video_url !== undefined) updatePayload.presentation_video_url = presentation_video_url ?? null

    const supabase = createSupabaseAdminClient()

    if (bio !== undefined) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", session.user.id)
        .single()

      if (profile?.role === "host" && bio?.trim()) {
        const links = extractLinksFromText(bio)
        let hasNewPending = false
        for (const linkUrl of links) {
          const { data: existing } = await supabase
            .from("bio_link_approvals")
            .select("id, status")
            .eq("user_id", session.user.id)
            .eq("link_url", linkUrl)
            .maybeSingle()

          if (!existing || existing.status === "rejected") {
            hasNewPending = true
            const bioSnippet = bio.length > 100 ? bio.slice(0, 100) + "..." : bio
            await supabase.from("bio_link_approvals").upsert(
              {
                user_id: session.user.id,
                link_url: linkUrl,
                status: "pending",
                bio_snippet: bioSnippet,
              },
              { onConflict: "user_id,link_url" }
            )
          }
        }

        if (hasNewPending) {
            const { data: adminProfiles } = await supabase
              .from("profiles")
              .select("id")
              .in("email", ADMIN_EMAILS)

            const adminIds = (adminProfiles || []).map((p: any) => p.id).filter(Boolean)
          for (const adminId of adminIds) {
            await supabase.from("notifications").insert({
              user_id: adminId,
              type: "bio_link_pending",
              title: "Nuovo link nella bio host in attesa di approvazione",
              message: `Un host ha inserito un link nella bio. Approva o rifiuta dall'admin panel.`,
              related_id: session.user.id,
            })
          }
        }
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", session.user.id)

    if (error) {
      console.error("Profile update error:", error)
      return NextResponse.json(
        { error: error.message || "Errore durante l'aggiornamento del profilo" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Profile update API error:", e)
    return NextResponse.json(
      { error: "Errore interno durante l'aggiornamento del profilo" },
      { status: 500 }
    )
  }
}
