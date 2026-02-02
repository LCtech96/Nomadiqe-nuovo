import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/** POST /api/admin/bio-links/[id] - Approva o rifiuta un link bio */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAdminEmail(session?.user?.email || "")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { action } = body as { action?: "approve" | "reject" }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "action richiesto: approve o reject" },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    const { data: row, error: fetchErr } = await supabase
      .from("bio_link_approvals")
      .select("id, user_id, link_url")
      .eq("id", id)
      .single()

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Link non trovato" }, { status: 404 })
    }

    const { error: updateErr } = await supabase
      .from("bio_link_approvals")
      .update({
        status: action === "approve" ? "approved" : "rejected",
        decided_at: new Date().toISOString(),
        decided_by: session?.user?.id,
      })
      .eq("id", id)

    if (updateErr) throw updateErr

    await supabase.from("notifications").insert({
      user_id: row.user_id,
      type: action === "approve" ? "bio_link_approved" : "bio_link_rejected",
      title: action === "approve" ? "Link approvato" : "Link non approvato",
      message:
        action === "approve"
          ? "Il link nella tua bio è stato approvato ed è ora cliccabile sul tuo profilo."
          : "Il link nella tua bio non è stato approvato. È visibile come testo ma non come link.",
      related_id: id,
    })

    return NextResponse.json({
      success: true,
      status: action === "approve" ? "approved" : "rejected",
    })
  } catch (e) {
    console.error("Admin bio-link approve error:", e)
    return NextResponse.json(
      { error: (e as Error)?.message || "Errore" },
      { status: 500 }
    )
  }
}
