import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { extractLinksFromText } from "@/lib/bio-links"
import { ADMIN_EMAILS } from "@/lib/admin"

export const dynamic = "force-dynamic"

/**
 * POST /api/profile/check-bio-links
 * Rileva link nella bio, crea richieste di approvazione e notifica admin.
 * Usato da host onboarding e altri flussi che aggiornano la bio senza passare da /api/profile/update.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 })
    }

    const body = await request.json()
    const { bio } = body as { bio?: string }

    if (!bio?.trim()) return NextResponse.json({ success: true })

    const supabase = createSupabaseAdminClient()

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", session.user.id)
      .single()

    if (profile?.role !== "host") return NextResponse.json({ success: true })

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

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Check bio links error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
